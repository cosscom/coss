import { db, schema } from "@coss/db";
import { RETENTION_DAYS } from "@coss/retention";
import { and, asc, inArray, isNull, lt } from "drizzle-orm";

const { notification } = schema;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Settled notifications older than `RETENTION_DAYS.notifications` (pending ones are kept). */
export async function purgeExpiredNotifications(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const cutoff = new Date(
    (opts.now ?? new Date()).getTime() - RETENTION_DAYS.notifications * DAY_MS,
  );
  const expired = and(lt(notification.createdAt, cutoff), isNull(notification.nextAttemptAt));
  const batch = await db
    .select({ id: notification.id })
    .from(notification)
    .where(
      and(
        expired,
        opts.scope ? inArray(notification.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(notification.createdAt))
    .limit(opts.limit ?? 1000);
  if (!batch.length) return 0;
  const deleted = await db
    .delete(notification)
    .where(
      and(
        inArray(
          notification.id,
          batch.map((row) => row.id),
        ),
        expired,
      ),
    )
    .returning({ id: notification.id });
  return deleted.length;
}
