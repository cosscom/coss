/**
 * Deletes webhook history past its retention (`@coss/retention`; the worker's `retention` loop).
 * System-level: the scan spans organizations; `scope` limits it to some (tests).
 */
import { db, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, eq, inArray, isNull, lt, ne, notExists, sql } from "drizzle-orm";

const { logDrainBatch, logDrainRecord, webhookDelivery, webhookListener, webhookMessage } = schema;

/**
 * Deletes up to `limit` messages created before the cutoff, oldest first, with their deliveries
 * and attempts (cascade). A message with a pending delivery is kept until it finishes: suspended
 * organizations' deliveries are held, not failed, and may wait past the cutoff.
 */
export async function purgeExpiredWebhookMessages(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.webhookDeliveries, opts.now);
  const expired = and(
    lt(webhookMessage.createdAt, cutoff),
    notExists(
      db
        .select({ one: sql`1` })
        .from(webhookDelivery)
        .where(
          and(
            sql`${webhookDelivery.messageId} = ${webhookMessage.id}`,
            eq(webhookDelivery.status, "pending"),
          ),
        ),
    ),
    opts.scope ? inArray(webhookMessage.organizationId, opts.scope.organizationIds) : undefined,
  );
  return db.transaction(async (tx) => {
    // Manual retries lock the same parent before updating a delivery. Skip messages being retried
    // or purged elsewhere, and hold these locks through the cascading delete.
    const due = await tx
      .select({ id: webhookMessage.id })
      .from(webhookMessage)
      .where(expired)
      .orderBy(asc(webhookMessage.createdAt))
      .limit(opts.limit ?? 1000)
      .for("update", { skipLocked: true });
    if (due.length === 0) return 0;
    // A separate statement gets a fresh snapshot after acquiring the locks: a retry may have
    // committed after the selection's snapshot was taken but before its parent was locked.
    const deleted = await tx
      .delete(webhookMessage)
      .where(
        and(
          inArray(
            webhookMessage.id,
            due.map((row) => row.id),
          ),
          expired,
        ),
      )
      .returning({ id: webhookMessage.id });
    return deleted.length;
  });
}

/**
 * Deletes up to `limit` finished log drain batches last updated before the cutoff, with their
 * lines and attempts (cascade), and up to `limit` queued lines that never got into a batch within
 * `logDrainBacklog` days (a suspended organization's drains are held). Returns both counts.
 */
export async function purgeExpiredLogDrainBatches(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<[batches: number, backlog: number]> {
  const limit = opts.limit ?? 1000;
  const batchCutoff = retentionCutoff(RETENTION_DAYS.logDrainBatches, opts.now);
  const expiredBatches = db
    .select({ id: logDrainBatch.id })
    .from(logDrainBatch)
    .where(
      and(
        ne(logDrainBatch.status, "pending"),
        lt(logDrainBatch.updatedAt, batchCutoff),
        opts.scope ? inArray(logDrainBatch.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(logDrainBatch.updatedAt))
    .limit(limit);
  const batches = await db
    .delete(logDrainBatch)
    .where(and(inArray(logDrainBatch.id, expiredBatches), ne(logDrainBatch.status, "pending")))
    .returning({ id: logDrainBatch.id });
  // Record ids are time-ordered, so the primary key finds the old ones.
  const backlogCutoff = newId(
    ID_PREFIXES.logDrainRecord,
    retentionCutoff(RETENTION_DAYS.logDrainBacklog, opts.now).getTime(),
  );
  const expiredBacklog = db
    .select({ id: logDrainRecord.id })
    .from(logDrainRecord)
    .where(
      and(
        lt(logDrainRecord.id, backlogCutoff),
        isNull(logDrainRecord.batchId),
        opts.scope ? inArray(logDrainRecord.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(logDrainRecord.id))
    .limit(limit);
  const backlog = await db
    .delete(logDrainRecord)
    .where(and(inArray(logDrainRecord.id, expiredBacklog), isNull(logDrainRecord.batchId)))
    .returning({ id: logDrainRecord.id });
  return [batches.length, backlog.length];
}

/**
 * Deletes up to `limit` `coss listen` listeners that expired (or were closed) before the cutoff,
 * oldest first, with what they were handed (cascade). The events stay as webhook messages.
 */
export async function purgeExpiredWebhookListeners(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.webhookListeners, opts.now);
  const expired = and(
    lt(webhookListener.expiresAt, cutoff),
    opts.scope ? inArray(webhookListener.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: webhookListener.id })
    .from(webhookListener)
    .where(expired)
    .orderBy(asc(webhookListener.expiresAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(webhookListener)
    .where(and(inArray(webhookListener.id, due), expired))
    .returning({ id: webhookListener.id });
  return deleted.length;
}
