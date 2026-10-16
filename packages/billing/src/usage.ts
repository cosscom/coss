/** Reads of metered usage (`billing_usage`). */
import { db, type Executor, schema } from "@coss/db";
import { and, asc, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";
import type { MeterKey } from "./catalog/meters.ts";
import type { UsageRow, UsageTotal } from "./engine/types.ts";
import type { Interval } from "./time.ts";

const { billingUsage } = schema;

function within(organizationId: string, interval: Interval) {
  return and(
    eq(billingUsage.organizationId, organizationId),
    gte(billingUsage.hourStart, interval.start),
    lt(billingUsage.hourStart, interval.end),
  );
}

/** Usage per meter, dimension and hour (environments and shards summed): the engine's input. */
export async function usageRows(
  organizationId: string,
  interval: Interval,
  executor: Executor = db,
): Promise<UsageRow[]> {
  const rows = await executor
    .select({
      meter: billingUsage.meter,
      dimension: billingUsage.dimension,
      hour: billingUsage.hourStart,
      quantity: sum(billingUsage.quantity).mapWith(Number),
    })
    .from(billingUsage)
    .where(within(organizationId, interval))
    .groupBy(billingUsage.meter, billingUsage.dimension, billingUsage.hourStart)
    .orderBy(asc(billingUsage.hourStart));
  return rows.map((row) => ({ ...row, meter: row.meter as MeterKey }));
}

export async function usageTotals(
  organizationId: string,
  interval: Interval,
  executor: Executor = db,
): Promise<UsageTotal[]> {
  const rows = await executor
    .select({
      meter: billingUsage.meter,
      dimension: billingUsage.dimension,
      quantity: sum(billingUsage.quantity).mapWith(Number),
    })
    .from(billingUsage)
    .where(within(organizationId, interval))
    .groupBy(billingUsage.meter, billingUsage.dimension);
  return rows.map((row) => ({ ...row, meter: row.meter as MeterKey }));
}

/** Usage per UTC day and meter, for charts. */
export async function usageByDay(
  organizationId: string,
  interval: Interval,
  executor: Executor = db,
): Promise<{ day: Date; meter: MeterKey; quantity: number }[]> {
  const day = sql<Date>`date_trunc('day', ${billingUsage.hourStart}, 'UTC')`.mapWith(
    (value: string | Date) => new Date(value),
  );
  const rows = await executor
    .select({
      day,
      meter: billingUsage.meter,
      quantity: sum(billingUsage.quantity).mapWith(Number),
    })
    .from(billingUsage)
    .where(within(organizationId, interval))
    .groupBy(day, billingUsage.meter)
    .orderBy(asc(day));
  return rows.map((row) => ({ ...row, meter: row.meter as MeterKey }));
}

/** Usage per environment and meter. */
export async function usageByEnvironment(
  organizationId: string,
  interval: Interval,
  executor: Executor = db,
): Promise<{ environmentId: string; meter: MeterKey; quantity: number }[]> {
  const rows = await executor
    .select({
      environmentId: billingUsage.environmentId,
      meter: billingUsage.meter,
      quantity: sum(billingUsage.quantity).mapWith(Number),
    })
    .from(billingUsage)
    .where(within(organizationId, interval))
    .groupBy(billingUsage.environmentId, billingUsage.meter);
  return rows.map((row) => ({ ...row, meter: row.meter as MeterKey }));
}

/** Organizations with usage recorded at or after `since` (the usage checks' candidates). */
export async function organizationsWithUsageSince(
  since: Date,
  executor: Executor = db,
): Promise<string[]> {
  const rows = await executor
    .selectDistinct({ organizationId: billingUsage.organizationId })
    .from(billingUsage)
    .where(gte(billingUsage.hourStart, since));
  return rows.map((row) => row.organizationId);
}

/**
 * One meter's usage per UTC day across every organization, with `apartFrom`'s (coss.com's own) kept
 * apart: the admin console's platform chart. Platform-level: call only after `requirePlatformAdmin*`.
 */
export async function platformUsageByDay(
  input: {
    meter: MeterKey;
    interval: Interval;
    apartFrom?: string | null;
    scope?: { organizationIds?: string[] };
  },
  executor: Executor = db,
): Promise<{ day: Date; apart: boolean; quantity: number }[]> {
  const day = sql<Date>`date_trunc('day', ${billingUsage.hourStart}, 'UTC')`.mapWith(
    (value: string | Date) => new Date(value),
  );
  const apart = sql<boolean>`coalesce(${billingUsage.organizationId} = ${input.apartFrom ?? null}, false)`;
  return (
    executor
      .select({ day, apart, quantity: sum(billingUsage.quantity).mapWith(Number) })
      .from(billingUsage)
      .where(
        and(
          eq(billingUsage.meter, input.meter),
          gte(billingUsage.hourStart, input.interval.start),
          lt(billingUsage.hourStart, input.interval.end),
          input.scope?.organizationIds
            ? inArray(billingUsage.organizationId, input.scope.organizationIds)
            : undefined,
        ),
      )
      // By position: `apartFrom` is a parameter, so `apart` is a new expression each time.
      .groupBy(sql`1`, sql`2`)
      .orderBy(sql`1`, sql`2`)
  );
}
