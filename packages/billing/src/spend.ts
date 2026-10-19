/**
 * Spend: the running month's usage charges split over who caused them — projects, environments,
 * API keys and the members personal keys belong to (`billing_usage_attribution`, written with
 * every usage record). Each meter's charge is shared by quantity (`allocateUsageCharges`), so the
 * parts add up to the estimate's usage lines; credits pay for spend, they don't reduce it. Usage
 * recorded without a source (before attribution existed) stays with its environment, keyless.
 */
import { db, type Executor, schema } from "@coss/db";
import { and, eq, gte, lt, sql, sum } from "drizzle-orm";
import type { MeterKey } from "./catalog/meters.ts";
import { allocateUsageCharges, type SourceUsage } from "./engine/allocate.ts";
import { estimatePeriod, type PeriodEstimate } from "./overview.ts";
import type { Interval } from "./time.ts";

const { billingUsage, billingUsageAttribution, environment } = schema;

/** Where spend came from. `""`: none (a dashboard send, an organization key, unknown). */
export type SpendSource = {
  projectId: string;
  environmentId: string;
  apiKeyId: string;
  /** The member whose personal key it was. */
  userId: string;
};

export type SpendLine = SpendSource & {
  /** UTC day; `null` for usage the attribution doesn't place in a day (not expected). */
  day: Date | null;
  meter: MeterKey;
  dimension: string;
  quantity: number;
  cents: bigint;
};

export type SpendBreakdown = {
  period: Interval;
  estimate: PeriodEstimate;
  lines: SpendLine[];
  /** The usage charges the lines share (after meter discounts, before credits). */
  totalCents: bigint;
};

type DayRow = {
  day: Date;
  meter: string;
  dimension: string;
  environmentId: string;
  quantity: number;
};

function dayOf(column: typeof billingUsage.hourStart | typeof billingUsageAttribution.hourStart) {
  return sql<Date>`date_trunc('day', ${column}, 'UTC')`.mapWith(
    (value: string | Date) => new Date(value),
  );
}

const SEPARATOR = "\u0001";

function sourceKey(day: Date, source: SpendSource): string {
  return [
    day.toISOString(),
    source.projectId,
    source.environmentId,
    source.apiKeyId,
    source.userId,
  ].join(SEPARATOR);
}

function parseSourceKey(key: string): SpendSource & { day: Date | null } {
  if (key === "") return { day: null, projectId: "", environmentId: "", apiKeyId: "", userId: "" };
  const [day = "", projectId = "", environmentId = "", apiKeyId = "", userId = ""] =
    key.split(SEPARATOR);
  return { day: new Date(day), projectId, environmentId, apiKeyId, userId };
}

/** The organization's attributed spend of the running month (up to `now`). */
export async function spendBreakdown(
  organizationId: string,
  now: Date = new Date(),
  executor: Executor = db,
): Promise<SpendBreakdown> {
  const estimate = await estimatePeriod(organizationId, now);
  const window = {
    start: estimate.period.start,
    end: now < estimate.period.end ? now : estimate.period.end,
  };
  const [attributed, recorded, projects] = await Promise.all([
    attributedUsage(organizationId, window, executor),
    usageByDayAndEnvironment(organizationId, window, executor),
    environmentProjects(organizationId, executor),
  ]);

  const sources: SourceUsage[] = [];
  const accounted = new Map<string, number>();
  const cell = (row: Pick<DayRow, "day" | "meter" | "dimension" | "environmentId">) =>
    [row.day.toISOString(), row.meter, row.dimension, row.environmentId].join(SEPARATOR);
  for (const row of attributed) {
    sources.push({
      key: sourceKey(row.day, row),
      meter: row.meter as MeterKey,
      dimension: row.dimension,
      quantity: row.quantity,
    });
    accounted.set(cell(row), (accounted.get(cell(row)) ?? 0) + row.quantity);
  }
  // Usage recorded before attribution existed (or by an older writer) stays in its environment.
  for (const row of recorded) {
    const rest = row.quantity - (accounted.get(cell(row)) ?? 0);
    if (rest <= 0) continue;
    sources.push({
      key: sourceKey(row.day, {
        projectId: projects.get(row.environmentId) ?? "",
        environmentId: row.environmentId,
        apiKeyId: "",
        userId: "",
      }),
      meter: row.meter as MeterKey,
      dimension: row.dimension,
      quantity: rest,
    });
  }

  const allocated = allocateUsageCharges({
    lines: estimate.composition.lines,
    totals: estimate.usage,
    sources,
  });
  const lines = allocated.map(({ key, ...rest }) => ({ ...parseSourceKey(key), ...rest }));
  const totalCents = lines.reduce((total, line) => total + line.cents, 0n);
  return { period: estimate.period, estimate, lines, totalCents };
}

/** What a group of spend lines adds up to: cents, and quantity per meter. */
export type SpendTotal = { cents: bigint; quantities: Partial<Record<MeterKey, number>> };

/** Spend lines summed by `keyOf` (e.g. `(line) => line.userId`). */
export function sumSpend(
  lines: readonly SpendLine[],
  keyOf: (line: SpendLine) => string,
): Map<string, SpendTotal> {
  const totals = new Map<string, SpendTotal>();
  for (const line of lines) {
    const key = keyOf(line);
    let total = totals.get(key);
    if (!total) {
      total = { cents: 0n, quantities: {} };
      totals.set(key, total);
    }
    total.cents += line.cents;
    total.quantities[line.meter] = (total.quantities[line.meter] ?? 0) + line.quantity;
  }
  return totals;
}

async function attributedUsage(
  organizationId: string,
  window: Interval,
  executor: Executor,
): Promise<(DayRow & SpendSource)[]> {
  const day = dayOf(billingUsageAttribution.hourStart);
  return executor
    .select({
      day,
      meter: billingUsageAttribution.meter,
      dimension: billingUsageAttribution.dimension,
      environmentId: billingUsageAttribution.environmentId,
      projectId: billingUsageAttribution.projectId,
      apiKeyId: billingUsageAttribution.apiKeyId,
      userId: billingUsageAttribution.userId,
      quantity: sum(billingUsageAttribution.quantity).mapWith(Number),
    })
    .from(billingUsageAttribution)
    .where(
      and(
        eq(billingUsageAttribution.organizationId, organizationId),
        gte(billingUsageAttribution.hourStart, window.start),
        lt(billingUsageAttribution.hourStart, window.end),
      ),
    )
    .groupBy(
      day,
      billingUsageAttribution.meter,
      billingUsageAttribution.dimension,
      billingUsageAttribution.environmentId,
      billingUsageAttribution.projectId,
      billingUsageAttribution.apiKeyId,
      billingUsageAttribution.userId,
    );
}

async function usageByDayAndEnvironment(
  organizationId: string,
  window: Interval,
  executor: Executor,
): Promise<DayRow[]> {
  const day = dayOf(billingUsage.hourStart);
  return executor
    .select({
      day,
      meter: billingUsage.meter,
      dimension: billingUsage.dimension,
      environmentId: billingUsage.environmentId,
      quantity: sum(billingUsage.quantity).mapWith(Number),
    })
    .from(billingUsage)
    .where(
      and(
        eq(billingUsage.organizationId, organizationId),
        gte(billingUsage.hourStart, window.start),
        lt(billingUsage.hourStart, window.end),
      ),
    )
    .groupBy(day, billingUsage.meter, billingUsage.dimension, billingUsage.environmentId);
}

async function environmentProjects(
  organizationId: string,
  executor: Executor,
): Promise<Map<string, string>> {
  const rows = await executor
    .select({ id: environment.id, projectId: environment.projectId })
    .from(environment)
    .where(eq(environment.organizationId, organizationId));
  return new Map(rows.map((row) => [row.id, row.projectId]));
}
