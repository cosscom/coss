/** The worker's retention purges for billing data (periods in `@coss/retention`). */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS } from "@coss/retention";
import { and, asc, inArray, isNull, lt, ne, notInArray, sql } from "drizzle-orm";

const { billingInvoice, billingNotification, billingProviderEvent, billingUsage } = schema;
const DAY_MS = 24 * 60 * 60 * 1000;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

/** Hourly usage counters older than `RETENTION_DAYS.billingUsage` (invoices keep the totals). */
export async function purgeExpiredBillingUsage(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = new Date(
    (opts.now ?? new Date()).getTime() - RETENTION_DAYS.billingUsage * DAY_MS,
  );
  const scope = opts.scope
    ? sql`and ${billingUsage.organizationId} in (${sql.join(
        opts.scope.organizationIds.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql``;
  // The table has no id: batches go by row address.
  const result = await db.execute(
    sql`delete from ${billingUsage} where ctid in (select ctid from ${billingUsage} where ${billingUsage.hourStart} < ${cutoff} ${scope} limit ${opts.limit ?? 1000})`,
  );
  return result.rowCount ?? 0;
}

/** Processed (or ignored) provider events older than `RETENTION_DAYS.billingProviderEvents`. */
export async function purgeExpiredBillingProviderEvents(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = new Date(
    (opts.now ?? new Date()).getTime() - RETENTION_DAYS.billingProviderEvents * DAY_MS,
  );
  const batch = await db
    .select({ id: billingProviderEvent.id })
    .from(billingProviderEvent)
    .where(
      and(lt(billingProviderEvent.createdAt, cutoff), ne(billingProviderEvent.status, "pending")),
    )
    .orderBy(asc(billingProviderEvent.createdAt))
    .limit(opts.limit ?? 1000);
  if (!batch.length) return 0;
  const deleted = await db
    .delete(billingProviderEvent)
    .where(
      and(
        inArray(
          billingProviderEvent.id,
          batch.map((row) => row.id),
        ),
        lt(billingProviderEvent.createdAt, cutoff),
      ),
    )
    .returning({ id: billingProviderEvent.id });
  return deleted.length;
}

/** Settled billing notifications older than `RETENTION_DAYS.billingNotifications`. */
export async function purgeExpiredBillingNotifications(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = new Date(
    (opts.now ?? new Date()).getTime() - RETENTION_DAYS.billingNotifications * DAY_MS,
  );
  const batch = await db
    .select({ id: billingNotification.id })
    .from(billingNotification)
    .where(
      and(
        lt(billingNotification.createdAt, cutoff),
        isNull(billingNotification.nextAttemptAt),
        opts.scope
          ? inArray(billingNotification.organizationId, opts.scope.organizationIds)
          : undefined,
      ),
    )
    .orderBy(asc(billingNotification.createdAt))
    .limit(opts.limit ?? 1000);
  if (!batch.length) return 0;
  const deleted = await db
    .delete(billingNotification)
    .where(
      inArray(
        billingNotification.id,
        batch.map((row) => row.id),
      ),
    )
    .returning({ id: billingNotification.id });
  return deleted.length;
}

/**
 * Invoices (with their lines, payments and credit notes) older than `RETENTION_DAYS.invoices`,
 * the period tax law needs them for. Never an open one.
 */
export async function purgeExpiredInvoices(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = new Date((opts.now ?? new Date()).getTime() - RETENTION_DAYS.invoices * DAY_MS);
  const batch = await db
    .select({ id: billingInvoice.id })
    .from(billingInvoice)
    .where(
      and(
        lt(billingInvoice.createdAt, cutoff),
        notInArray(billingInvoice.status, ["open", "draft"]),
        opts.scope ? inArray(billingInvoice.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(billingInvoice.createdAt))
    .limit(opts.limit ?? 1000);
  if (!batch.length) return 0;
  const deleted = await db
    .delete(billingInvoice)
    .where(
      and(
        inArray(
          billingInvoice.id,
          batch.map((row) => row.id),
        ),
        lt(billingInvoice.createdAt, cutoff),
      ),
    )
    .returning({ id: billingInvoice.id });
  return deleted.length;
}
