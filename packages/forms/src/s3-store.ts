/**
 * The production file store: an S3 bucket (`FORMS_FILES_BUCKET`; SSE-KMS by the bucket's
 * default encryption, no public access, objects expiring after retention). Keys start with
 * `orgs/<organization id>/`, so an organization's objects go as a prefix.
 */
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { type FormFileObject, type FormFileStore, organizationPrefix } from "./store.ts";

/** The S3 calls the store makes (a fake in tests). */
export interface FormsS3Api {
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, content: Uint8Array, contentType: string): Promise<void>;
  /** Up to 1,000 keys. */
  deleteKeys(keys: readonly string[]): Promise<void>;
  list(
    prefix: string,
    continuationToken?: string,
  ): Promise<{ keys: string[]; next: string | null }>;
}

export function formsS3Api(input: { region: string; bucket: string }): FormsS3Api {
  const client = new S3Client({ region: input.region });
  const Bucket = input.bucket;
  return {
    async get(key) {
      try {
        const response = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        return response.Body ? await response.Body.transformToByteArray() : new Uint8Array();
      } catch (error) {
        if ((error as { name?: string }).name === "NoSuchKey") return null;
        throw error;
      }
    },
    async put(key, content, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: content, ContentType: contentType }),
      );
    },
    async deleteKeys(keys) {
      if (keys.length === 0) return;
      const { Errors = [] } = await client.send(
        new DeleteObjectsCommand({
          Bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      if (Errors.length > 0) {
        throw new Error(`S3 could not delete ${Errors.length} objects: ${Errors[0]?.Message}`);
      }
    },
    async list(prefix, continuationToken) {
      const response = await client.send(
        new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: continuationToken }),
      );
      return {
        keys: (response.Contents ?? []).flatMap((object) => (object.Key ? [object.Key] : [])),
        next: response.IsTruncated ? (response.NextContinuationToken ?? null) : null,
      };
    },
  };
}

export class S3FormFileStore implements FormFileStore {
  readonly name = "s3";

  constructor(private readonly api: FormsS3Api) {}

  async put(object: FormFileObject): Promise<void> {
    await this.api.put(object.key, object.content, object.contentType);
  }

  get(key: string): Promise<Uint8Array | null> {
    return this.api.get(key);
  }

  async delete(keys: readonly string[]): Promise<void> {
    for (let index = 0; index < keys.length; index += 1000) {
      await this.api.deleteKeys(keys.slice(index, index + 1000));
    }
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    const prefix = organizationPrefix(organizationId);
    let token: string | undefined;
    do {
      const page = await this.api.list(prefix, token);
      await this.delete(page.keys);
      token = page.next ?? undefined;
    } while (token);
  }
}
