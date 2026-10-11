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
  const due = db
    .select({ id: webhookMessage.id })
    .from(webhookMessage)
    .where(expired)
    .orderBy(asc(webhookMessage.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(webhookMessage)
    .where(and(inArray(webhookMessage.id, due), expired))
    .returning({ id: webhookMessage.id });
  return deleted.length;
}
