/**
 * Purges for form submissions (`RETENTION_POLICY` `form_submissions` and `form_spam`). System-
 * level, like every purge: `{ now, limit, scope }`, the oldest batch, the condition re-checked in
 * the delete. Files of the deleted submissions are recorded for the store's cleanup in the same
 * transaction (the worker's `forms` loop deletes them).
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, inArray, lt, or, sql } from "drizzle-orm";
import { scheduleStoreCleanup } from "./store-cleanup.ts";

const { formFakeObject, formSubmission, formSubmissionFile } = schema;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

/**
 * Accepted submissions `RETENTION_DAYS.formSubmissions` after they were received; spam, held and
 * unconfirmed ones after `RETENTION_DAYS.formSpam`.
 */
export async function purgeExpiredFormSubmissions(opts: PurgeOptions = {}): Promise<number> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 1000;
  const expired = or(
    lt(formSubmission.createdAt, retentionCutoff(RETENTION_DAYS.formSubmissions, now)),
    and(
      sql`${formSubmission.status} <> 'accepted'`,
      lt(formSubmission.createdAt, retentionCutoff(RETENTION_DAYS.formSpam, now)),
    ),
  );
  return db.transaction(async (tx) => {
    const due = await tx
      .select({ id: formSubmission.id, organizationId: formSubmission.organizationId })
      .from(formSubmission)
      .where(
        and(
          expired,
          opts.scope
            ? sql`${formSubmission.organizationId} = any(${sql.param(opts.scope.organizationIds)}::text[])`
            : undefined,
        ),
      )
      .orderBy(formSubmission.createdAt)
      .limit(limit)
      .for("update", { skipLocked: true });
    if (due.length === 0) return 0;
    const ids = due.map((row) => row.id);
    const files = await tx
      .select({
        key: formSubmissionFile.storeKey,
        organizationId: formSubmissionFile.organizationId,
      })
      .from(formSubmissionFile)
      .where(inArray(formSubmissionFile.submissionId, ids));
    const byOrganization = new Map<string, string[]>();
    for (const file of files) {
      byOrganization.set(file.organizationId, [
        ...(byOrganization.get(file.organizationId) ?? []),
        file.key,
      ]);
    }
    for (const [organizationId, keys] of byOrganization) {
      await scheduleStoreCleanup(tx, organizationId, keys);
    }
    const rows = await tx
      .delete(formSubmission)
      .where(and(inArray(formSubmission.id, ids), expired))
      .returning({ id: formSubmission.id });
    return rows.length;
  });
}

/**
 * The fake file store's stand-in for the bucket's lifecycle rule: objects older than the longest
 * retention, plus a day.
 */
export async function purgeExpiredFormFakeObjects(opts: PurgeOptions = {}): Promise<number> {
  const now = opts.now ?? new Date();
  const cutoff = retentionCutoff(RETENTION_DAYS.formSubmissions + 1, now);
  const limit = opts.limit ?? 1000;
  const keys = db
    .select({ key: formFakeObject.key })
    .from(formFakeObject)
    .where(
      and(
        lt(formFakeObject.createdAt, cutoff),
        opts.scope
          ? sql`${formFakeObject.organizationId} = any(${sql.param(opts.scope.organizationIds)}::text[])`
          : undefined,
      ),
    )
    .limit(limit);
  const rows = await db
    .delete(formFakeObject)
    .where(and(sql`${formFakeObject.key} in ${keys}`, lt(formFakeObject.createdAt, cutoff)))
    .returning({ key: formFakeObject.key });
  return rows.length;
}
