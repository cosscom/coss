/**
 * Store objects to delete, recorded in `form_store_cleanup` in the transaction that drops their
 * last reference: if the store fails afterwards (or the process exits), the worker's
 * `forms` loop tries again.
 */
import { db, schema, type Transaction } from "@coss/db";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import type { FormFileStore } from "./store.ts";

const { formStoreCleanup } = schema;

/** Rows per insert or delete: far below Postgres's 65,535 parameters a statement. */
const CLEANUP_INSERT_BATCH = 1000;

/** Records keys for deletion, in the caller's transaction (any number: inserted in batches). */
export async function scheduleStoreCleanup(
  tx: Transaction,
  organizationId: string,
  keys: readonly string[],
): Promise<void> {
  for (let start = 0; start < keys.length; start += CLEANUP_INSERT_BATCH) {
    await tx
      .insert(formStoreCleanup)
      .values(
        keys.slice(start, start + CLEANUP_INSERT_BATCH).map((key) => ({ key, organizationId })),
      )
      .onConflictDoNothing();
  }
}

/**
 * Deletes objects nothing references (a failed or replayed write's), recorded first so a store
 * failure (or a crash) leaves them to the worker's cleanup loop. Never throws.
 */
export async function discardStoreObjects(
  store: FormFileStore,
  organizationId: string,
  keys: readonly string[],
): Promise<void> {
  if (keys.length === 0) return;
  try {
    await db.transaction((tx) => scheduleStoreCleanup(tx, organizationId, keys));
    await removeStoreObjects(store, keys);
  } catch (error) {
    console.error("[forms] could not discard unused store objects:", error);
  }
}

/** Deletes objects from the store, then their cleanup rows; a failure leaves the rows for the worker. */
export async function removeStoreObjects(
  store: FormFileStore,
  keys: readonly string[],
): Promise<void> {
  if (keys.length === 0) return;
  try {
    await store.delete(keys);
  } catch (error) {
    console.error("[forms] could not delete store objects; the worker will retry:", error);
    return;
  }
  for (let start = 0; start < keys.length; start += CLEANUP_INSERT_BATCH) {
    await db
      .delete(formStoreCleanup)
      .where(inArray(formStoreCleanup.key, keys.slice(start, start + CLEANUP_INSERT_BATCH)));
  }
}

const MAX_CLEANUP_BACKOFF_MS = 6 * 60 * 60_000;

/**
 * Retries store deletions that didn't go through (`form_store_cleanup`), oldest due first, with
 * backoff. System-level (`scope` narrows it in tests). Returns how many objects it tried.
 */
export async function runDueFormStoreCleanup(
  opts: { limit: number; now?: Date; scope?: { organizationIds: string[] } },
  store: FormFileStore,
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select()
    .from(formStoreCleanup)
    .where(
      and(
        lte(formStoreCleanup.nextAttemptAt, now),
        opts.scope
          ? inArray(formStoreCleanup.organizationId, opts.scope.organizationIds)
          : undefined,
      ),
    )
    .orderBy(asc(formStoreCleanup.nextAttemptAt))
    .limit(opts.limit);
  if (due.length === 0) return 0;
  try {
    await store.delete(due.map((row) => row.key));
    await db.delete(formStoreCleanup).where(
      inArray(
        formStoreCleanup.key,
        due.map((row) => row.key),
      ),
    );
  } catch (error) {
    console.error("[forms] store cleanup failed:", error);
    for (const row of due) {
      await db
        .update(formStoreCleanup)
        .set({
          attempts: row.attempts + 1,
          nextAttemptAt: new Date(
            now.getTime() + Math.min(60_000 * 2 ** row.attempts, MAX_CLEANUP_BACKOFF_MS),
          ),
        })
        .where(eq(formStoreCleanup.key, row.key));
    }
  }
  return due.length;
}
