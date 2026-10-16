/**
 * Deletes reputation history past its retention (`@coss/retention`; the worker's `retention`
 * loop). System-level: the scans span organizations; `scope` limits them to some (tests).
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";

const { reputationEvent, reputationNotification } = schema;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

/** Deletes settled (sent, skipped or failed) notifications created before the cutoff. */
export async function purgeExpiredReputationNotifications(
  opts: PurgeOptions = {},
): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.reputationNotifications, opts.now);
  const expired = and(
    lt(reputationNotification.createdAt, cutoff),
    ne(reputationNotification.status, "pending"),
    opts.scope
      ? inArray(reputationNotification.organizationId, opts.scope.organizationIds)
      : undefined,
  );
  const due = db
    .select({ id: reputationNotification.id })
    .from(reputationNotification)
    .where(expired)
    .orderBy(asc(reputationNotification.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(reputationNotification)
    .where(and(inArray(reputationNotification.id, due), expired))
    .returning({ id: reputationNotification.id });
  return deleted.length;
}

/**
 * Deletes expired policy updates and superseded transitions. An organization's latest standing
 * transition and latest marketing transition stay (notifications compare against them) however old
 * they are. Cascades to notifications.
 */
export async function purgeExpiredReputationEvents(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.reputationHistory, opts.now);
  const expired = and(
    lt(reputationEvent.createdAt, cutoff),
    or(
      eq(reputationEvent.type, "policy_updated"),
      sql`exists (
      select 1 from ${reputationEvent} as later
      where later.organization_id = ${reputationEvent.organizationId}
        and (
          (later.type in ('warning_raised', 'warning_cleared', 'suspended', 'reinstated')
            and ${reputationEvent.type} in ('warning_raised', 'warning_cleared', 'suspended', 'reinstated'))
          or (later.type in ('marketing_paused', 'marketing_reinstated')
            and ${reputationEvent.type} in ('marketing_paused', 'marketing_reinstated'))
        )
        and (later.created_at, later.id) > (${reputationEvent.createdAt}, ${reputationEvent.id})
    )`,
    ),
    opts.scope ? inArray(reputationEvent.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: reputationEvent.id })
    .from(reputationEvent)
    .where(expired)
    .orderBy(asc(reputationEvent.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(reputationEvent)
    .where(and(inArray(reputationEvent.id, due), expired))
    .returning({ id: reputationEvent.id });
  return deleted.length;
}
