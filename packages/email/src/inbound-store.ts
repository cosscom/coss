/**
 * Where received emails' raw messages and attachment bytes live: an S3 bucket with SES
 * (`ses/inbound.ts`), a Postgres table with the fake provider (development and tests, shared by
 * every process). Keys start with `orgs/<organization id>/`, so an organization's content can be
 * deleted as a whole. Content is written before the row that points at it: an object without a
 * row (a crash in between, a duplicate notification) is removed by the bucket's lifecycle rule or,
 * for the fake store, by `purgeExpiredFakeInboundObjects`.
 */
import { db, schema } from "@coss/db";
import { eq, inArray } from "drizzle-orm";

const { inboundFakeObject } = schema;

export type InboundObject = {
  key: string;
  organizationId: string;
  contentType: string;
  content: Uint8Array;
};

export interface InboundContentStore {
  readonly name: string;
  put(object: InboundObject): Promise<void>;
  /** The object's bytes, or `null` when it does not exist (deleted or expired). */
  get(key: string): Promise<Uint8Array | null>;
  delete(keys: readonly string[]): Promise<void>;
  /** Deletes every object of the organization (organization deletion). */
  deleteOrganization(organizationId: string): Promise<void>;
}

/** `orgs/<org>/<env>/<received email id>/`: the prefix of one received email's objects. */
export function receivedEmailPrefix(input: {
  organizationId: string;
  environmentId: string;
  receivedEmailId: string;
}): string {
  return `${organizationPrefix(input.organizationId)}${input.environmentId}/${input.receivedEmailId}/`;
}

export function organizationPrefix(organizationId: string): string {
  return `orgs/${organizationId}/`;
}

/** The fake provider's store: rows of `inbound_fake_object`. */
export class FakeInboundStore implements InboundContentStore {
  readonly name = "fake";

  async put(object: InboundObject): Promise<void> {
    await db
      .insert(inboundFakeObject)
      .values({
        key: object.key,
        organizationId: object.organizationId,
        contentType: object.contentType,
        content: Buffer.from(object.content),
      })
      .onConflictDoUpdate({
        target: inboundFakeObject.key,
        set: { contentType: object.contentType, content: Buffer.from(object.content) },
      });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const [row] = await db
      .select({ content: inboundFakeObject.content })
      .from(inboundFakeObject)
      .where(eq(inboundFakeObject.key, key))
      .limit(1);
    return row ? new Uint8Array(row.content) : null;
  }

  async delete(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    await db.delete(inboundFakeObject).where(inArray(inboundFakeObject.key, [...keys]));
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    await db.delete(inboundFakeObject).where(eq(inboundFakeObject.organizationId, organizationId));
  }
}
