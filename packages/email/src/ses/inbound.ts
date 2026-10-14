/**
 * SES receiving: the notifications of the receipt rule (`ses:bootstrap`: one catch-all rule
 * whose S3 action writes the raw message under `landing/` and publishes to SNS → SQS) and the S3
 * content store received emails live in.
 */
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { InboundVerdicts, VerdictStatus } from "../inbound.ts";
import {
  type InboundContentStore,
  type InboundObject,
  organizationPrefix,
} from "../inbound-store.ts";
import { isSesError } from "./api.ts";

/** Where SES writes raw messages (the receipt rule's `ObjectKeyPrefix`). */
export const LANDING_PREFIX = "landing/";

/** What the worker needs from one receipt notification. */
export type SesReceipt = {
  messageId: string;
  /** Envelope sender. */
  source: string;
  /** Envelope recipients the rule matched (not the To/Cc headers: `mail.destination`). */
  recipients: string[];
  timestamp: Date;
  verdicts: InboundVerdicts;
  bucketName: string;
  objectKey: string;
};

export type ParsedSesReceipt =
  | { kind: "received"; receipt: SesReceipt }
  | { kind: "ignored"; reason: string };

type Json = Record<string, unknown>;

function object(value: unknown): Json | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : null;
}

function string(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

const VERDICTS: Record<string, VerdictStatus> = {
  PASS: "pass",
  FAIL: "fail",
  GRAY: "gray",
  PROCESSING_FAILED: "processing_failed",
};

function verdict(value: unknown): VerdictStatus | null {
  const status = string(object(value)?.status);
  return status ? (VERDICTS[status.toUpperCase()] ?? null) : null;
}

/**
 * One SQS message of the inbound queue (raw SNS delivery, or an SNS envelope). Anything that is
 * not an S3-action receipt (SNS's subscription confirmation, SES's setup notification) is ignored.
 */
export function parseSesReceipt(body: string): ParsedSesReceipt {
  if (!body.trimStart().startsWith("{")) return { kind: "ignored", reason: "not JSON" };
  const message = object(JSON.parse(body));
  if (!message) return { kind: "ignored", reason: "not a JSON object" };
  if (message.Type === "Notification" && typeof message.Message === "string") {
    return parseSesReceipt(message.Message);
  }
  if (message.Type === "SubscriptionConfirmation") {
    return { kind: "ignored", reason: "SNS subscription confirmation" };
  }
  const type = string(message.notificationType);
  if (type !== "Received") return { kind: "ignored", reason: `notification ${type ?? "unknown"}` };
  const mail = object(message.mail);
  const receipt = object(message.receipt);
  const action = object(receipt?.action);
  const messageId = string(mail?.messageId);
  if (!mail || !receipt || !messageId) {
    return { kind: "ignored", reason: "receipt without mail or receipt" };
  }
  if (string(action?.type) !== "S3") {
    return { kind: "ignored", reason: `receipt action ${string(action?.type) ?? "unknown"}` };
  }
  const bucketName = string(action?.bucketName);
  const prefix = string(action?.objectKeyPrefix) ?? "";
  // `objectKey` includes the prefix; older notifications only had the message id.
  const objectKey = string(action?.objectKey) ?? `${prefix}${messageId}`;
  if (!bucketName) return { kind: "ignored", reason: "receipt without a bucket" };
  const recipients = Array.isArray(receipt.recipients)
    ? receipt.recipients.flatMap((value) => (typeof value === "string" ? [value] : []))
    : [];
  const timestamp = new Date(string(receipt.timestamp) ?? string(mail.timestamp) ?? Date.now());
  return {
    kind: "received",
    receipt: {
      messageId,
      source: string(mail.source) ?? "",
      recipients,
      timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
      verdicts: {
        spam: verdict(receipt.spamVerdict),
        virus: verdict(receipt.virusVerdict),
        spf: verdict(receipt.spfVerdict),
        dkim: verdict(receipt.dkimVerdict),
        dmarc: verdict(receipt.dmarcVerdict),
        dmarcPolicy: string(receipt.dmarcPolicy)?.toLowerCase() ?? null,
      },
      bucketName,
      objectKey,
    },
  };
}

/** The S3 operations receiving needs (tests use `FakeS3Api` from `@coss/email/testing`). */
export interface S3Api {
  getObject(bucket: string, key: string): Promise<Uint8Array | null>;
  putObject(bucket: string, key: string, content: Uint8Array, contentType: string): Promise<void>;
  deleteObject(bucket: string, key: string): Promise<void>;
  /** Deletes up to 1,000 keys. */
  deleteObjects(bucket: string, keys: readonly string[]): Promise<void>;
  listKeys(
    bucket: string,
    prefix: string,
    continuationToken?: string,
  ): Promise<{ keys: string[]; next: string | null }>;
}

export function createS3Api(region: string): S3Api {
  const client = new S3Client({ region });
  return {
    async getObject(bucket, key) {
      try {
        const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return response.Body ? await response.Body.transformToByteArray() : new Uint8Array();
      } catch (error) {
        if (isSesError(error, "NoSuchKey")) return null;
        throw error;
      }
    },
    async putObject(bucket, key, content, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: content, ContentType: contentType }),
      );
    },
    async deleteObject(bucket, key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    async deleteObjects(bucket, keys) {
      if (keys.length === 0) return;
      const { Errors = [] } = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      if (Errors.length > 0) {
        throw new Error(`S3 could not delete ${Errors.length} objects: ${Errors[0]?.Message}`);
      }
    },
    async listKeys(bucket, prefix, continuationToken) {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      return {
        keys: (response.Contents ?? []).flatMap((item) => (item.Key ? [item.Key] : [])),
        next: response.IsTruncated ? (response.NextContinuationToken ?? null) : null,
      };
    },
  };
}

/** Received emails' content in the inbound bucket, under `orgs/` (the lifecycle rule expires it). */
export class S3InboundStore implements InboundContentStore {
  readonly name = "s3";

  constructor(
    private readonly api: S3Api,
    private readonly bucket: string,
  ) {}

  async put(object: InboundObject): Promise<void> {
    await this.api.putObject(this.bucket, object.key, object.content, object.contentType);
  }

  get(key: string): Promise<Uint8Array | null> {
    return this.api.getObject(this.bucket, key);
  }

  async delete(keys: readonly string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += 1000) {
      await this.api.deleteObjects(this.bucket, keys.slice(i, i + 1000));
    }
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    const prefix = organizationPrefix(organizationId);
    let token: string | undefined;
    do {
      const page = await this.api.listKeys(this.bucket, prefix, token);
      await this.delete(page.keys);
      token = page.next ?? undefined;
    } while (token);
  }
}
