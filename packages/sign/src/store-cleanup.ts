/**
 * Store objects to delete, recorded in `sign_store_cleanup` in the transaction that drops their
 * last reference: if the store fails afterwards (or the process exits), the worker's
 * `sign-cleanup` loop tries again.
 */
import { db, schema, type Transaction } from "@coss/db";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import type { DocumentStore } from "./store.ts";

const { signStoreCleanup } = schema;

/** Records keys for deletion, in the caller's transaction. */
export async function scheduleStoreCleanup(
  tx: Transaction,
  organizationId: string,
  keys: readonly string[],
): Promise<void> {
  if (keys.length === 0) return;
  await tx
    .insert(signStoreCleanup)
    .values(keys.map((key) => ({ key, organizationId })))
    .onConflictDoNothing();
}

/**
 * Deletes objects nothing references (a failed or replayed write's), recorded first so a store
 * failure (or a crash) leaves them to the worker's cleanup loop. Never throws.
 */
export async function discardStoreObjects(
  store: DocumentStore,
  organizationId: string,
  keys: readonly string[],
): Promise<void> {
  if (keys.length === 0) return;
  try {
    await db.transaction((tx) => scheduleStoreCleanup(tx, organizationId, keys));
    await removeStoreObjects(store, keys);
  } catch (error) {
    console.error("[sign] could not discard unused store objects:", error);
  }
}

/** Deletes objects from the store, then their cleanup rows; a failure leaves the rows for the worker. */
export async function removeStoreObjects(
  store: DocumentStore,
  keys: readonly string[],
): Promise<void> {
  if (keys.length === 0) return;
  try {
    await store.delete(keys);
  } catch (error) {
    console.error("[sign] could not delete store objects; the worker will retry:", error);
    return;
  }
  await db.delete(signStoreCleanup).where(inArray(signStoreCleanup.key, [...keys]));
}

const MAX_CLEANUP_BACKOFF_MS = 6 * 60 * 60_000;

/**
 * Retries store deletions that didn't go through (`sign_store_cleanup`), oldest due first, with
 * backoff. System-level (`scope` narrows it in tests). Returns how many objects it tried.
 */
export async function runDueSignCleanup(
  opts: { limit: number; now?: Date; scope?: { organizationIds: string[] } },
  store: DocumentStore,
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select()
    .from(signStoreCleanup)
    .where(
      and(
        lte(signStoreCleanup.nextAttemptAt, now),
        opts.scope
          ? inArray(signStoreCleanup.organizationId, opts.scope.organizationIds)
          : undefined,
      ),
    )
    .orderBy(asc(signStoreCleanup.nextAttemptAt))
    .limit(opts.limit);
  if (due.length === 0) return 0;
  try {
    await store.delete(due.map((row) => row.key));
    await db.delete(signStoreCleanup).where(
      inArray(
        signStoreCleanup.key,
        due.map((row) => row.key),
      ),
    );
  } catch (error) {
    console.error("[sign] store cleanup failed:", error);
    for (const row of due) {
      await db
        .update(signStoreCleanup)
        .set({
          attempts: row.attempts + 1,
          nextAttemptAt: new Date(
            now.getTime() + Math.min(60_000 * 2 ** row.attempts, MAX_CLEANUP_BACKOFF_MS),
          ),
        })
        .where(eq(signStoreCleanup.key, row.key));
    }
  }
  return due.length;
}
