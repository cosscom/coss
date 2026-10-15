/**
 * Sending metrics: hourly counters per environment (`email_metric`), summed by the transactions
 * that make each outcome happen, so they outlive the emails they count. Each metric is counted
 * exactly once, at a compare-and-set that already exists:
 * - `sent`: the email becoming `sent` (`recordEmailSent`), for its non-suppressed recipients;
 * - `delivered`/`bounced`/`complained`: a recipient's first event of that type (`recordProviderEvent`);
 * - `opened`/`clicked`: an email's first open/click (`recordOpen`/`recordClick`).
 * Every increment writes a base row (`tag_name = ''`) and one row per tag of the email.
 */
import { db, type Executor, schema } from "@coss/db";
import type { EmailTag } from "@coss/db/schema";
import { and, eq, inArray, lt, ne, type SQL, sql } from "drizzle-orm";
import { mailboxProviderOf } from "./mailbox-providers.ts";
import {
  DEFAULT_METRICS_GROUPS,
  EMAIL_METRICS,
  type EmailMetricCountsOutput,
  type EmailMetricName,
  type EmailMetricsGroupBy,
  type EmailMetricsOutput,
  MAX_HOURLY_METRICS_RANGE_DAYS,
  MAX_METRICS_GROUPS,
  MAX_METRICS_RANGE_DAYS,
  type MailboxProvider,
  parseEmailAddress,
} from "./schemas.ts";

const { emailMetric } = schema;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SHARDS = 8;

/** What an increment needs to know about its email. */
export type MetricEmail = {
  organizationId: string;
  environmentId: string;
  from: string;
  category: string | null;
  tags: EmailTag[];
};

/** The From address's domain (lower case); `''` without one. */
export function sendingDomainOf(from: string): string {
  const address = parseEmailAddress(from).address.toLowerCase();
  const at = address.lastIndexOf("@");
  return at < 0 ? "" : address.slice(at + 1);
}

/**
 * Adds one to `metric` in `tx` for each address (grouped by mailbox provider), or once without a
 * provider when `addresses` is `null` (an open or click nobody can be named for), in the UTC hour
 * of `at` (never later than the transaction).
 */
export async function countEmailMetric(
  tx: Executor,
  input: {
    email: MetricEmail;
    metric: EmailMetricName;
    addresses: readonly string[] | null;
    at: Date;
  },
): Promise<void> {
  const byProvider = new Map<MailboxProvider | "", number>();
  if (input.addresses === null) byProvider.set("", 1);
  else {
    for (const address of input.addresses) {
      const provider = mailboxProviderOf(address);
      byProvider.set(provider, (byProvider.get(provider) ?? 0) + 1);
    }
  }
  if (byProvider.size === 0) return;
  const tags = [
    { name: "", value: "" },
    ...new Map(input.email.tags.map((tag) => [`${tag.name}:${tag.value}`, tag])).values(),
  ];
  const rows = [...byProvider]
    .flatMap(([provider, quantity]) => tags.map((tag) => ({ provider, quantity, tag })))
    // One lock order for every writer.
    .sort(
      (a, b) =>
        compare(a.provider, b.provider) ||
        compare(a.tag.name, b.tag.name) ||
        compare(a.tag.value, b.tag.value),
    );
  const domain = sendingDomainOf(input.email.from);
  const column = emailMetric[input.metric];
  await tx
    .insert(emailMetric)
    .values(
      rows.map((row) => ({
        organizationId: input.email.organizationId,
        environmentId: input.email.environmentId,
        hourStart: sql`date_trunc('hour', least(${input.at.toISOString()}::timestamptz, transaction_timestamp()), 'UTC')`,
        tagName: row.tag.name,
        tagValue: row.tag.value,
        category: input.email.category ?? "",
        domain,
        mailboxProvider: row.provider,
        // One shard per transaction: increments of one transaction (a send and its fake provider's
        // events) share rows, so concurrent transactions can't take them in opposite orders.
        shard: sql`(pg_current_xact_id()::text::bigint % ${SHARDS})::smallint`,
        [input.metric]: row.quantity,
      })),
    )
    .onConflictDoUpdate({
      target: [
        emailMetric.environmentId,
        emailMetric.hourStart,
        emailMetric.tagName,
        emailMetric.tagValue,
        emailMetric.category,
        emailMetric.domain,
        emailMetric.mailboxProvider,
        emailMetric.shard,
      ],
      set: { [input.metric]: sql`${column} + excluded.${sql.identifier(column.name)}` },
    });
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export type MetricsGranularity = "hour" | "day";

function stepOf(granularity: MetricsGranularity): number {
  return granularity === "hour" ? HOUR_MS : DAY_MS;
}

/**
 * The buckets a metrics query covers: `from` rounded down and `to` rounded up to whole buckets
 * (UTC). Without `from`, the 7 days (24 hours by hour) ending with `to`'s bucket. `null` when the
 * range is empty or longer than allowed.
 */
export function emailMetricsRange(input: {
  from?: Date;
  to?: Date;
  granularity: MetricsGranularity;
  now?: Date;
}): { start: Date; end: Date } | null {
  const step = stepOf(input.granularity);
  const to = input.to ?? input.now ?? new Date();
  const end = new Date(Math.ceil(to.getTime() / step) * step);
  if (!input.from) {
    const buckets = input.granularity === "hour" ? 24 : 7;
    return { start: new Date(end.getTime() - buckets * step), end };
  }
  const span = to.getTime() - input.from.getTime();
  const maxDays =
    input.granularity === "hour" ? MAX_HOURLY_METRICS_RANGE_DAYS : MAX_METRICS_RANGE_DAYS;
  if (!(span > 0) || span > maxDays * DAY_MS) return null;
  return { start: new Date(Math.floor(input.from.getTime() / step) * step), end };
}

export type EmailMetricsQuery = {
  organizationId: string;
  environmentId: string;
  /** Whole buckets (`emailMetricsRange`). */
  start: Date;
  end: Date;
  granularity: MetricsGranularity;
  groupBy?: EmailMetricsGroupBy | null;
  category?: readonly string[];
  domain?: readonly string[];
  mailboxProvider?: readonly MailboxProvider[];
  tag?: { name: string; value: string } | null;
  /** Groups returned with `groupBy`, by `sent` (then `delivered`), largest first. */
  limit?: number;
};

const ZERO: EmailMetricCountsOutput = {
  sent: 0,
  delivered: 0,
  bounced: 0,
  complained: 0,
  opened: 0,
  clicked: 0,
};

function sums() {
  return {
    sent: sql<number>`coalesce(sum(${emailMetric.sent}), 0)`.mapWith(Number),
    delivered: sql<number>`coalesce(sum(${emailMetric.delivered}), 0)`.mapWith(Number),
    bounced: sql<number>`coalesce(sum(${emailMetric.bounced}), 0)`.mapWith(Number),
    complained: sql<number>`coalesce(sum(${emailMetric.complained}), 0)`.mapWith(Number),
    opened: sql<number>`coalesce(sum(${emailMetric.opened}), 0)`.mapWith(Number),
    clicked: sql<number>`coalesce(sum(${emailMetric.clicked}), 0)`.mapWith(Number),
  };
}

function add(into: EmailMetricCountsOutput, counts: EmailMetricCountsOutput): void {
  for (const metric of EMAIL_METRICS) into[metric] += counts[metric];
}

/**
 * An environment's metrics over whole buckets, zero-filled: one series, or one per group with
 * `groupBy` (the largest `limit`). Shared by `GET /v1/emails/metrics` and the dashboard.
 */
export async function emailMetrics(query: EmailMetricsQuery): Promise<EmailMetricsOutput> {
  const groupBy = query.groupBy ?? null;
  const limit = Math.min(Math.max(query.limit ?? DEFAULT_METRICS_GROUPS, 1), MAX_METRICS_GROUPS);
  const filters = (tagRows: boolean): SQL | undefined =>
    and(
      eq(emailMetric.organizationId, query.organizationId),
      eq(emailMetric.environmentId, query.environmentId),
      sql`${emailMetric.hourStart} >= ${query.start.toISOString()}::timestamptz`,
      lt(emailMetric.hourStart, query.end),
      query.tag
        ? and(eq(emailMetric.tagName, query.tag.name), eq(emailMetric.tagValue, query.tag.value))
        : tagRows
          ? ne(emailMetric.tagName, "")
          : eq(emailMetric.tagName, ""),
      query.category?.length ? inArray(emailMetric.category, [...query.category]) : undefined,
      query.domain?.length ? inArray(emailMetric.domain, [...query.domain]) : undefined,
      query.mailboxProvider?.length
        ? inArray(emailMetric.mailboxProvider, [...query.mailboxProvider])
        : undefined,
    );

  const unit = sql.raw(`'${query.granularity}'`);
  const bucket = sql<number>`date_trunc(${unit}, ${emailMetric.hourStart}, 'UTC')`.mapWith(
    (value: string | Date) => new Date(value).getTime(),
  );
  const group =
    groupBy === "category"
      ? sql<string>`${emailMetric.category}`
      : groupBy === "domain"
        ? sql<string>`${emailMetric.domain}`
        : groupBy === "mailbox_provider"
          ? sql<string>`${emailMetric.mailboxProvider}`
          : groupBy === "tag"
            ? sql<string>`${emailMetric.tagName} || ':' || ${emailMetric.tagValue}`
            : sql<string>`''`;
  const rows = await db
    .select({ bucket, group, ...sums() })
    .from(emailMetric)
    .where(filters(groupBy === "tag"))
    .groupBy(sql`1`, sql`2`);

  const groups = new Map<
    string,
    { totals: EmailMetricCountsOutput; buckets: Map<number, EmailMetricCountsOutput> }
  >();
  for (const { bucket: at, group: key, ...counts } of rows) {
    let entry = groups.get(key);
    if (!entry) {
      entry = { totals: { ...ZERO }, buckets: new Map() };
      groups.set(key, entry);
    }
    add(entry.totals, counts);
    const existing = entry.buckets.get(at);
    if (existing) add(existing, counts);
    else entry.buckets.set(at, { ...counts });
  }

  const totals = { ...ZERO };
  if (groupBy === "tag" && !query.tag) {
    // An email with several tags is in several groups: count it once from the base rows.
    const [row] = await db.select(sums()).from(emailMetric).where(filters(false));
    if (row) add(totals, row);
  } else {
    for (const entry of groups.values()) add(totals, entry.totals);
  }

  const ranked = [...groups].sort(
    ([aKey, a], [bKey, b]) =>
      b.totals.sent - a.totals.sent ||
      b.totals.delivered - a.totals.delivered ||
      compare(aKey, bKey),
  );
  if (groupBy === null && ranked.length === 0) {
    ranked.push(["", { totals: { ...ZERO }, buckets: new Map() }]);
  }
  const step = stepOf(query.granularity);
  const starts: number[] = [];
  for (let at = query.start.getTime(); at < query.end.getTime(); at += step) starts.push(at);

  return {
    object: "email_metrics",
    start: query.start.toISOString(),
    end: query.end.toISOString(),
    granularity: query.granularity,
    group_by: groupBy,
    totals,
    series: ranked.slice(0, groupBy === null ? 1 : limit).map(([key, entry]) => ({
      group: key === "" ? null : key,
      totals: entry.totals,
      buckets: starts.map((at) => ({
        start: new Date(at).toISOString(),
        end: new Date(at + step).toISOString(),
        ...(entry.buckets.get(at) ?? ZERO),
      })),
    })),
    has_more: groupBy !== null && ranked.length > limit,
  };
}
