/**
 * Reading and deleting a form's submissions (API, dashboard). Every function takes the
 * environment and scopes its SQL by the organization (tenancy rule).
 */
import { db, schema } from "@coss/db";
import { ID_PREFIXES, isId } from "@coss/db/id";
import { and, desc, eq, inArray, type SQL, sql } from "drizzle-orm";
import { FormError } from "./errors.ts";
import { getFormRow } from "./forms.ts";
import type { FormSubmissionRow } from "./record.ts";
import {
  DEFAULT_FORM_LIST_LIMIT,
  type FormSubmissionObjectOutput,
  type FormSubmissionStatus,
  MAX_FORM_LIST_LIMIT,
} from "./schemas.ts";
import type { FormFileStore } from "./store.ts";
import { removeStoreObjects, scheduleStoreCleanup } from "./store-cleanup.ts";

const { environment, formSubmission, formSubmissionFile } = schema;

type FileRow = typeof formSubmissionFile.$inferSelect;
type Scope = { organizationId: string; environmentId: string };

export function toFormSubmissionObject(
  row: FormSubmissionRow,
  files: FileRow[],
  sandbox: boolean,
): FormSubmissionObjectOutput {
  return {
    object: "form_submission",
    id: row.id,
    form_id: row.formId,
    status: row.status,
    data: row.data,
    submitter_email: row.submitterEmail,
    files: files.map((file) => ({
      id: file.id,
      field: file.field,
      filename: file.filename,
      content_type: file.contentType,
      size: file.size,
    })),
    spam_reason: row.spamReason,
    risk:
      row.spamReason === "honeypot" && !row.riskAssessmentId
        ? null
        : {
            assessment_id: row.riskAssessmentId,
            decision: row.riskDecision as "allow" | "review" | "block" | null,
            score: row.riskScore === null ? null : Math.round(row.riskScore * 1000) / 1000,
          },
    ip: row.ip,
    user_agent: row.userAgent,
    origin: row.origin,
    referrer: row.referrer,
    confirmed_at: row.confirmedAt?.toISOString() ?? null,
    accepted_at: row.acceptedAt?.toISOString() ?? null,
    released_at: row.releasedAt?.toISOString() ?? null,
    sandbox,
    created_at: row.createdAt.toISOString(),
  };
}

async function isSandbox(scope: Scope): Promise<boolean> {
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

async function filesBySubmission(
  organizationId: string,
  ids: string[],
): Promise<Map<string, FileRow[]>> {
  const byId = new Map<string, FileRow[]>();
  if (ids.length === 0) return byId;
  const rows = await db
    .select()
    .from(formSubmissionFile)
    .where(
      and(
        eq(formSubmissionFile.organizationId, organizationId),
        inArray(formSubmissionFile.submissionId, ids),
      ),
    )
    .orderBy(formSubmissionFile.createdAt);
  for (const row of rows) byId.set(row.submissionId, [...(byId.get(row.submissionId) ?? []), row]);
  return byId;
}

function inForm(scope: Scope & { formId: string }) {
  return and(
    eq(formSubmission.organizationId, scope.organizationId),
    eq(formSubmission.environmentId, scope.environmentId),
    eq(formSubmission.formId, scope.formId),
  );
}

async function requireForm(scope: Scope & { formId: string }): Promise<void> {
  if (!(await getFormRow(scope))) throw new FormError("not_found", "Form not found.");
}

/** A form's submissions, newest first (`status` narrows them). */
export async function listFormSubmissions(
  input: Scope & {
    formId: string;
    status?: FormSubmissionStatus[];
    limit?: number;
    after?: string;
  },
): Promise<{ data: FormSubmissionObjectOutput[]; hasMore: boolean }> {
  await requireForm(input);
  const limit = Math.min(input.limit ?? DEFAULT_FORM_LIST_LIMIT, MAX_FORM_LIST_LIMIT);
  const base = and(
    inForm(input),
    input.status && input.status.length > 0
      ? inArray(formSubmission.status, input.status)
      : undefined,
  );
  let cursor: SQL | undefined;
  if (input.after) {
    if (!isId(ID_PREFIXES.formSubmission, input.after)) return { data: [], hasMore: false };
    const [anchor] = await db
      .select({ id: formSubmission.id })
      .from(formSubmission)
      .where(and(inForm(input), eq(formSubmission.id, input.after)))
      .limit(1);
    if (!anchor) return { data: [], hasMore: false };
    // Compared in SQL: a JavaScript Date would cut the anchor's microseconds off.
    cursor = sql`(${formSubmission.createdAt}, ${formSubmission.id}) < (select ${formSubmission.createdAt}, ${formSubmission.id} from ${formSubmission} where ${formSubmission.id} = ${anchor.id})`;
  }
  const rows = await db
    .select()
    .from(formSubmission)
    .where(and(base, cursor))
    .orderBy(desc(formSubmission.createdAt), desc(formSubmission.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const files = await filesBySubmission(
    input.organizationId,
    page.map((row) => row.id),
  );
  const sandbox = await isSandbox(input);
  return {
    data: page.map((row) => toFormSubmissionObject(row, files.get(row.id) ?? [], sandbox)),
    hasMore: rows.length > limit,
  };
}

export async function getFormSubmissionRow(
  input: Scope & { formId: string; submissionId: string },
): Promise<FormSubmissionRow | null> {
  if (!isId(ID_PREFIXES.formSubmission, input.submissionId)) return null;
  const [row] = await db
    .select()
    .from(formSubmission)
    .where(and(inForm(input), eq(formSubmission.id, input.submissionId)))
    .limit(1);
  return row ?? null;
}

export async function getFormSubmission(
  input: Scope & { formId: string; submissionId: string },
): Promise<FormSubmissionObjectOutput> {
  const row = await getFormSubmissionRow(input);
  if (!row) throw new FormError("not_found", "Submission not found.");
  const files = await filesBySubmission(input.organizationId, [row.id]);
  return toFormSubmissionObject(row, files.get(row.id) ?? [], await isSandbox(input));
}

/**
 * Deletes a submission with its files (recorded for cleanup in the same transaction, then
 * removed from the store; the worker retries a failed removal).
 */
export async function deleteFormSubmission(
  input: Scope & { formId: string; submissionId: string },
  store: FormFileStore | null,
): Promise<void> {
  const row = await getFormSubmissionRow(input);
  if (!row) throw new FormError("not_found", "Submission not found.");
  const keys = await db.transaction(async (tx) => {
    const files = await tx
      .select({ key: formSubmissionFile.storeKey })
      .from(formSubmissionFile)
      .where(
        and(
          eq(formSubmissionFile.submissionId, row.id),
          eq(formSubmissionFile.organizationId, input.organizationId),
        ),
      );
    const keys = files.map((file) => file.key);
    await scheduleStoreCleanup(tx, input.organizationId, keys);
    await tx
      .delete(formSubmission)
      .where(
        and(eq(formSubmission.id, row.id), eq(formSubmission.organizationId, input.organizationId)),
      );
    return keys;
  });
  if (store) await removeStoreObjects(store, keys);
}

/** An uploaded file's metadata and bytes. */
export async function readFormSubmissionFile(
  input: Scope & { formId: string; submissionId: string; fileId: string },
  store: FormFileStore | null,
): Promise<{ filename: string; contentType: string; content: Uint8Array }> {
  if (!store)
    throw new FormError("forms_unavailable", "Uploads aren't available in this deployment.");
  const row = await getFormSubmissionRow(input);
  if (!row || !isId(ID_PREFIXES.formSubmissionFile, input.fileId)) {
    throw new FormError("not_found", "File not found.");
  }
  const [file] = await db
    .select()
    .from(formSubmissionFile)
    .where(
      and(
        eq(formSubmissionFile.id, input.fileId),
        eq(formSubmissionFile.submissionId, row.id),
        eq(formSubmissionFile.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!file) throw new FormError("not_found", "File not found.");
  const content = await store.get(file.storeKey);
  if (!content) throw new FormError("not_found", "File not found.");
  return { filename: file.filename, contentType: file.contentType, content };
}
