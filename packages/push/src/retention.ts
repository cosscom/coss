/** Deletes settled push notifications past their retention (`@coss/retention`). System-level. */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, inArray, lt, ne } from "drizzle-orm";

const { pushNotification } = schema;

export async function purgeExpiredPushNotifications(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.pushNotifications, opts.now);
  const expired = and(
    lt(pushNotification.createdAt, cutoff),
    ne(pushNotification.status, "pending"),
    opts.scope ? inArray(pushNotification.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: pushNotification.id })
    .from(pushNotification)
    .where(expired)
    .orderBy(asc(pushNotification.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(pushNotification)
    .where(and(inArray(pushNotification.id, due), expired))
    .returning({ id: pushNotification.id });
  return deleted.length;
}
