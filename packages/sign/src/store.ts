/**
 * Where documents' bytes live: an S3 bucket in production, `sign_fake_object` rows otherwise
 * (development and tests, shared by every process). Keys start with `orgs/<organization id>/`, so
 * an organization's documents can be deleted as a whole. Bytes are written before the row that
 * points at them.
 */
import { db, schema } from "@coss/db";
import { eq, inArray } from "drizzle-orm";

const { signFakeObject } = schema;

export type DocumentObject = {
  key: string;
  organizationId: string;
  contentType: string;
  content: Uint8Array;
};

export interface DocumentStore {
  readonly name: string;
  put(object: DocumentObject): Promise<void>;
  /** The object's bytes, or `null` when it does not exist. */
  get(key: string): Promise<Uint8Array | null>;
  delete(keys: readonly string[]): Promise<void>;
  /** Deletes every object of the organization (organization deletion). */
  deleteOrganization(organizationId: string): Promise<void>;
}

export function organizationPrefix(organizationId: string): string {
  return `orgs/${organizationId}/`;
}

/** `orgs/<org>/<env>/documents/<document id>.pdf`: an uploaded document. */
export function documentKey(input: {
  organizationId: string;
  environmentId: string;
  documentId: string;
}): string {
  return `${organizationPrefix(input.organizationId)}${input.environmentId}/documents/${input.documentId}.pdf`;
}

/** The fake store: rows of `sign_fake_object`. */
export class FakeDocumentStore implements DocumentStore {
  readonly name = "fake";

  async put(object: DocumentObject): Promise<void> {
    await db
      .insert(signFakeObject)
      .values({
        key: object.key,
        organizationId: object.organizationId,
        contentType: object.contentType,
        content: Buffer.from(object.content),
      })
      .onConflictDoUpdate({
        target: signFakeObject.key,
        set: { contentType: object.contentType, content: Buffer.from(object.content) },
      });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const [row] = await db
      .select({ content: signFakeObject.content })
      .from(signFakeObject)
      .where(eq(signFakeObject.key, key))
      .limit(1);
    return row ? new Uint8Array(row.content) : null;
  }

  async delete(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    await db.delete(signFakeObject).where(inArray(signFakeObject.key, [...keys]));
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    await db.delete(signFakeObject).where(eq(signFakeObject.organizationId, organizationId));
  }
}
