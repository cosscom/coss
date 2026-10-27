/**
 * Uploaded documents: decoded, checked (`inspectPdf`), written to the document store, then
 * recorded. Environment-scoped; a document a request uses can't be deleted.
 */
import { createHash } from "node:crypto";
import { db, type Executor, schema } from "@coss/db";
import { ID_PREFIXES, isId, newId } from "@coss/db/id";
import { and, desc, eq, inArray, type SQL, sql } from "drizzle-orm";
import { SignError } from "./errors.ts";
import { inspectPdf } from "./pdf.ts";
import {
  DEFAULT_SIGN_LIST_LIMIT,
  MAX_SIGN_LIST_LIMIT,
  type SignDocumentObjectOutput,
} from "./schemas.ts";
import { type DocumentStore, documentKey } from "./store.ts";

const { environment, signDocument, signRequestDocument } = schema;

export type SignDocumentRow = typeof signDocument.$inferSelect;

/** The authenticated environment (from `authenticateApiKey`, or the dashboard's member check). */
export type SignEnvironment = {
  organizationId: string;
  projectId: string;
  environmentId: string;
  mode: "live" | "sandbox";
};

export function toSignDocumentObject(
  row: SignDocumentRow,
  sandbox: boolean,
): SignDocumentObjectOutput {
  return {
    object: "sign_document",
    id: row.id,
    filename: row.filename,
    size: row.size,
    sha256: row.sha256,
    page_count: row.pages.length,
    pages: row.pages,
    anchors: row.anchors,
    sandbox,
    created_at: row.createdAt.toISOString(),
  };
}

/** A decoded, checked upload whose bytes are in the store but which has no row yet. */
export type PreparedDocument = Omit<typeof signDocument.$inferInsert, "createdAt"> & { id: string };

/** Checks the PDF and writes its bytes; the caller inserts the returned row (or deletes the key). */
/**
 * Deletes the bytes of prepared documents whose rows don't exist: a write that failed, or was a
 * replay. A row that does exist (a commit whose answer was lost) keeps its bytes, and so does
 * everything when the check itself fails.
 */
export async function discardUnstoredDocuments(
  store: DocumentStore,
  documents: readonly PreparedDocument[],
): Promise<void> {
  if (documents.length === 0) return;
  try {
    const stored = await db
      .select({ id: signDocument.id })
      .from(signDocument)
      .where(
        inArray(
          signDocument.id,
          documents.map((document) => document.id),
        ),
      );
    const kept = new Set(stored.map((row) => row.id));
    const unused = documents.filter((document) => !kept.has(document.id));
    if (unused.length > 0) await store.delete(unused.map((document) => document.storeKey));
  } catch (error) {
    console.error("[sign] could not delete unused document bytes:", error);
  }
}

export async function prepareDocument(
  store: DocumentStore,
  env: SignEnvironment,
  input: { filename: string; content: string; apiKeyId: string | null },
): Promise<PreparedDocument> {
  const bytes = new Uint8Array(Buffer.from(input.content, "base64"));
  const { pages, anchors } = await inspectPdf(bytes);
  const id = newId(ID_PREFIXES.signDocument);
  const key = documentKey({ ...env, documentId: id });
  await store.put({
    key,
    organizationId: env.organizationId,
    contentType: "application/pdf",
    content: bytes,
  });
  return {
    id,
    organizationId: env.organizationId,
    projectId: env.projectId,
    environmentId: env.environmentId,
    apiKeyId: input.apiKeyId,
    filename: input.filename,
    storeKey: key,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    size: bytes.byteLength,
    pages,
    anchors,
  };
}

export async function uploadSignDocument(
  store: DocumentStore,
  input: {
    environment: SignEnvironment;
    apiKeyId: string | null;
    filename: string;
    content: string;
  },
): Promise<SignDocumentObjectOutput> {
  const prepared = await prepareDocument(store, input.environment, input);
  try {
    const [row] = await db.insert(signDocument).values(prepared).returning();
    if (!row) throw new Error("sign_document insert returned nothing");
    return toSignDocumentObject(row, input.environment.mode === "sandbox");
  } catch (error) {
    // The row may exist after all (a commit whose answer was lost): then its bytes stay.
    await discardUnstoredDocuments(store, [prepared]);
    throw error;
  }
}

/** The environment's documents with these ids (missing ones are left out). */
export async function environmentDocuments(
  executor: Executor,
  scope: { organizationId: string; environmentId: string },
  ids: readonly string[],
): Promise<SignDocumentRow[]> {
  if (ids.length === 0) return [];
  const rows = await executor
    .select()
    .from(signDocument)
    .where(
      and(
        eq(signDocument.organizationId, scope.organizationId),
        eq(signDocument.environmentId, scope.environmentId),
        inArray(signDocument.id, [...ids]),
      ),
    );
  return rows;
}

async function environmentMode(scope: {
  organizationId: string;
  environmentId: string;
}): Promise<boolean> {
  const [row] = await db
    .select({ mode: environment.mode })
    .from(environment)
    .where(
      and(
        eq(environment.id, scope.environmentId),
        eq(environment.organizationId, scope.organizationId),
      ),
    )
    .limit(1);
  return row?.mode === "sandbox";
}

function notFound(): SignError {
  return new SignError("not_found", "No document with this id exists in this environment.");
}

export async function getSignDocument(input: {
  organizationId: string;
  environmentId: string;
  documentId: string;
}): Promise<SignDocumentObjectOutput> {
  if (!isId(ID_PREFIXES.signDocument, input.documentId)) throw notFound();
  const [row] = await environmentDocuments(db, input, [input.documentId]);
  if (!row) throw notFound();
  return toSignDocumentObject(row, await environmentMode(input));
}

export async function listSignDocuments(input: {
  organizationId: string;
  environmentId: string;
  limit?: number;
  after?: string;
}): Promise<{ data: SignDocumentObjectOutput[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_SIGN_LIST_LIMIT, MAX_SIGN_LIST_LIMIT);
  const scope = and(
    eq(signDocument.organizationId, input.organizationId),
    eq(signDocument.environmentId, input.environmentId),
  );
  let cursor: SQL | undefined;
  if (input.after) {
    if (!isId(ID_PREFIXES.signDocument, input.after)) return { data: [], hasMore: false };
    const [anchor] = await db
      .select({ id: signDocument.id, createdAt: signDocument.createdAt })
      .from(signDocument)
      .where(and(scope, eq(signDocument.id, input.after)))
      .limit(1);
    if (!anchor) return { data: [], hasMore: false };
    // Compared in SQL: a JavaScript Date would cut the anchor's microseconds off.
    cursor = sql`(${signDocument.createdAt}, ${signDocument.id}) < (select ${signDocument.createdAt}, ${signDocument.id} from ${signDocument} where ${signDocument.id} = ${anchor.id})`;
  }
  const rows = await db
    .select()
    .from(signDocument)
    .where(and(scope, cursor))
    .orderBy(desc(signDocument.createdAt), desc(signDocument.id))
    .limit(limit + 1);
  const sandbox = await environmentMode(input);
  return {
    data: rows.slice(0, limit).map((row) => toSignDocumentObject(row, sandbox)),
    hasMore: rows.length > limit,
  };
}

/** Deletes a document no request uses, then its bytes. */
export async function deleteSignDocument(
  store: DocumentStore,
  input: { organizationId: string; environmentId: string; documentId: string },
): Promise<void> {
  if (!isId(ID_PREFIXES.signDocument, input.documentId)) throw notFound();
  const deleted = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: signDocument.id, storeKey: signDocument.storeKey })
      .from(signDocument)
      .where(
        and(
          eq(signDocument.id, input.documentId),
          eq(signDocument.organizationId, input.organizationId),
          eq(signDocument.environmentId, input.environmentId),
        ),
      )
      .for("update");
    if (!row) throw notFound();
    const [used] = await tx
      .select({ requestId: signRequestDocument.requestId })
      .from(signRequestDocument)
      .where(
        and(
          eq(signRequestDocument.documentId, row.id),
          eq(signRequestDocument.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    if (used) {
      throw new SignError(
        "document_in_use",
        `Signature request ${used.requestId} uses this document; delete the request first.`,
      );
    }
    await tx
      .delete(signDocument)
      .where(
        and(eq(signDocument.id, row.id), eq(signDocument.organizationId, input.organizationId)),
      );
    return row;
  });
  await store.delete([deleted.storeKey]);
}
