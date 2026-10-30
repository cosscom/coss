/**
 * Where uploaded files live: an S3 bucket in production, `form_fake_object` rows otherwise
 * (development and tests, shared by every process). Keys start with `orgs/<organization id>/`, so
 * an organization's files can be deleted as a whole. Bytes are written before the row that points
 * at them.
 */
import { db, schema } from "@coss/db";
import { eq, inArray } from "drizzle-orm";

const { formFakeObject } = schema;

export type FormFileObject = {
  key: string;
  organizationId: string;
  contentType: string;
  content: Uint8Array;
};

export interface FormFileStore {
  readonly name: string;
  put(object: FormFileObject): Promise<void>;
  /** The object's bytes, or `null` when it does not exist. */
  get(key: string): Promise<Uint8Array | null>;
  delete(keys: readonly string[]): Promise<void>;
  /** Deletes every object of the organization (organization deletion). */
  deleteOrganization(organizationId: string): Promise<void>;
}

export function organizationPrefix(organizationId: string): string {
  return `orgs/${organizationId}/`;
}

/** `orgs/<org>/<env>/forms/<form>/<submission>/<file id>`: an uploaded file. */
export function formFileKey(input: {
  organizationId: string;
  environmentId: string;
  formId: string;
  submissionId: string;
  fileId: string;
}): string {
  return `${organizationPrefix(input.organizationId)}${input.environmentId}/forms/${input.formId}/${input.submissionId}/${input.fileId}`;
}

/** The fake store: rows of `form_fake_object`. */
export class FakeFormFileStore implements FormFileStore {
  readonly name = "fake";

  async put(object: FormFileObject): Promise<void> {
    await db
      .insert(formFakeObject)
      .values({
        key: object.key,
        organizationId: object.organizationId,
        contentType: object.contentType,
        content: Buffer.from(object.content),
      })
      .onConflictDoUpdate({
        target: formFakeObject.key,
        set: { contentType: object.contentType, content: Buffer.from(object.content) },
      });
  }

  async get(key: string): Promise<Uint8Array | null> {
    const [row] = await db
      .select({ content: formFakeObject.content })
      .from(formFakeObject)
      .where(eq(formFakeObject.key, key))
      .limit(1);
    return row ? new Uint8Array(row.content) : null;
  }

  async delete(keys: readonly string[]): Promise<void> {
    // In batches: Postgres takes at most 65,535 parameters a statement.
    for (let start = 0; start < keys.length; start += 1000) {
      await db
        .delete(formFakeObject)
        .where(inArray(formFakeObject.key, keys.slice(start, start + 1000)));
    }
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    await db.delete(formFakeObject).where(eq(formFakeObject.organizationId, organizationId));
  }
}
