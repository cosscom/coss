/**
 * Deletes webhook history past its retention (`@coss/retention`; the worker's `retention` loop).
 * System-level: the scan spans organizations; `scope` limits it to some (tests).
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, eq, inArray, lt, notExists, sql } from "drizzle-orm";

const { webhookDelivery, webhookMessage } = schema;

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
