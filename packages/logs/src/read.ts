import { db, schema } from "@coss/db";
import { idTimestamp, isId } from "@coss/db/id";
import { and, desc, eq, gte, inArray, lt, notInArray, or, type SQL, sql } from "drizzle-orm";
import { type LogEntryRow, toLogObject } from "./entries.ts";
import { type LogFilters, statusRange } from "./query.ts";
import {
  DEFAULT_LOG_LIST_LIMIT,
  LOG_LEVELS,
  type LogEntryOutput,
  type LogLevel,
  type LogListOutput,
  MAX_LOG_LIST_LIMIT,
} from "./schemas.ts";

const { logEntry } = schema;

/** Every read is scoped to one environment of one organization. */
export type LogScope = { organizationId: string; environmentId: string };

export type LogRange = { from: Date; to: Date };

function likeEscape(value: string): string {
  return value.replaceAll(/[\\%_]/g, (char) => `\\${char}`);
}

function statusCondition(filters: readonly string[]): SQL | undefined {
  if (filters.length === 0) return undefined;
  return or(
    ...filters.map((filter) => {
      const [min, max] = statusRange(filter);
      return and(gte(logEntry.statusCode, min), lt(logEntry.statusCode, max));
    }),
  );
}

function nonEmpty<T>(values: readonly T[] | undefined): values is readonly T[] {
  return values !== undefined && values.length > 0;
}

/** The facet a condition belongs to, so facet counts can leave out their own filter. */
type Facet = "level" | "source" | "status" | "method" | "route" | "apiKey" | "type";

function conditions(
  scope: LogScope,
  range: LogRange,
  filters: LogFilters,
  skip?: Facet,
): (SQL | undefined)[] {
  const exclude = filters.exclude ?? {};
  return [
    eq(logEntry.organizationId, scope.organizationId),
    eq(logEntry.environmentId, scope.environmentId),
    gte(logEntry.occurredAt, range.from),
    lt(logEntry.occurredAt, range.to),
    skip !== "source" && nonEmpty(filters.sources)
      ? inArray(logEntry.source, [...filters.sources])
      : undefined,
    nonEmpty(exclude.sources) ? notInArray(logEntry.source, [...exclude.sources]) : undefined,
    skip !== "level" && nonEmpty(filters.levels)
      ? inArray(logEntry.level, [...filters.levels])
      : undefined,
    nonEmpty(exclude.levels) ? notInArray(logEntry.level, [...exclude.levels]) : undefined,
    skip !== "type" && nonEmpty(filters.types)
      ? inArray(logEntry.type, [...filters.types])
      : undefined,
    nonEmpty(exclude.types) ? notInArray(logEntry.type, [...exclude.types]) : undefined,
    skip !== "status" && nonEmpty(filters.statuses) ? statusCondition(filters.statuses) : undefined,
    nonEmpty(exclude.statuses)
      ? sql`not coalesce(${statusCondition(exclude.statuses)}, false)`
      : undefined,
    skip !== "method" && nonEmpty(filters.methods)
      ? inArray(logEntry.method, [...filters.methods])
      : undefined,
    nonEmpty(exclude.methods)
      ? sql`coalesce(${logEntry.method}, '') <> all(${sql.param([...exclude.methods])}::text[])`
      : undefined,
    skip !== "route" && nonEmpty(filters.routes)
      ? inArray(logEntry.route, [...filters.routes])
      : undefined,
    nonEmpty(exclude.routes)
      ? sql`coalesce(${logEntry.route}, '') <> all(${sql.param([...exclude.routes])}::text[])`
      : undefined,
    nonEmpty(filters.paths)
      ? or(...filters.paths.map((path) => sql`${logEntry.path} like ${`${likeEscape(path)}%`}`))
      : undefined,
    skip !== "apiKey" && nonEmpty(filters.apiKeyIds)
      ? inArray(logEntry.apiKeyId, [...filters.apiKeyIds])
      : undefined,
    filters.requestId ? eq(logEntry.requestId, filters.requestId) : undefined,
    filters.resourceId ? eq(logEntry.resourceId, filters.resourceId) : undefined,
    filters.recipient ? eq(logEntry.recipient, filters.recipient.toLowerCase()) : undefined,
    filters.text
      ? sql`${logEntry.searchText} like ${`%${likeEscape(filters.text.toLowerCase())}%`}`
      : undefined,
  ];
}

export type QueryLogsInput = LogScope &
  LogRange & {
    filters?: LogFilters;
    limit?: number;
    /** Older than this line (its id): the next page. */
    after?: string;
    /** Newer than this line (its id): live tail. Returned oldest first. */
    before?: string;
  };

/** Newest first, keyset-paginated on `(occurred_at, id)`; ids encode `occurred_at`. */
export async function queryLogs(input: QueryLogsInput): Promise<LogListOutput> {
  const limit = Math.min(input.limit ?? DEFAULT_LOG_LIST_LIMIT, MAX_LOG_LIST_LIMIT * 10);
  const cursorId = input.after ?? input.before;
  const cursorTime = cursorId !== undefined ? idTimestamp(cursorId) : null;
  if (cursorId !== undefined && (!isId("log", cursorId) || cursorTime === null)) {
    return { object: "list", data: [], has_more: false };
  }
  const cursorDate = cursorTime === null ? null : new Date(cursorTime);
  const tail = input.before !== undefined;
  const where = and(
    ...conditions(input, input, input.filters ?? {}),
    cursorDate !== null && !tail
      ? sql`(${logEntry.occurredAt}, ${logEntry.id}) < (${cursorDate.toISOString()}::timestamptz, ${cursorId})`
      : undefined,
    cursorDate !== null && tail
      ? sql`(${logEntry.occurredAt}, ${logEntry.id}) > (${cursorDate.toISOString()}::timestamptz, ${cursorId})`
      : undefined,
  );
  const rows = await db
    .select()
    .from(logEntry)
    .where(where)
    // Matches the (environment_id, occurred_at DESC NULLS LAST, id DESC NULLS LAST) index, read
    // backwards for the tail; plain desc()/asc() would make Postgres scan the primary key of every
    // environment's rows in the range instead.
    .orderBy(
      ...(tail
        ? [sql`${logEntry.occurredAt} asc nulls first`, sql`${logEntry.id} asc nulls first`]
        : [sql`${logEntry.occurredAt} desc nulls last`, sql`${logEntry.id} desc nulls last`]),
    )
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toLogObject),
    has_more: rows.length > limit,
  };
}

/** One line of an environment. Malformed, unknown and foreign ids are all `null`. */
export async function getLogEntry(scope: LogScope, id: string): Promise<LogEntryOutput | null> {
  const time = isId("log", id) ? idTimestamp(id) : null;
  if (time === null) return null;
  const [row] = await db
    .select()
    .from(logEntry)
    .where(
      and(
        eq(logEntry.organizationId, scope.organizationId),
        eq(logEntry.environmentId, scope.environmentId),
        eq(logEntry.occurredAt, new Date(time)),
        eq(logEntry.id, id),
      ),
    )
    .limit(1);
  return row ? toLogObject(row) : null;
}

const RELATED_LIMIT = 200;

/**
 * Lines sharing the request or resource of `entry`, oldest first: a send request with its email's
 * events and their webhook attempts.
 */
export async function relatedLogEntries(
  scope: LogScope,
  entry: Pick<LogEntryOutput, "id" | "request_id" | "resource_id">,
): Promise<LogEntryOutput[]> {
  const matches = [
    entry.request_id ? eq(logEntry.requestId, entry.request_id) : undefined,
    entry.resource_id ? eq(logEntry.resourceId, entry.resource_id) : undefined,
  ].filter((condition) => condition !== undefined);
  if (matches.length === 0) return [];
  const rows = await db
    .select()
    .from(logEntry)
    .where(
      and(
        eq(logEntry.organizationId, scope.organizationId),
        eq(logEntry.environmentId, scope.environmentId),
        or(...matches),
      ),
    )
    .orderBy(logEntry.occurredAt, logEntry.id)
    .limit(RELATED_LIMIT);
  return rows.map(toLogObject);
}

export type LogHistogramBucket = { start: string } & Record<LogLevel, number>;

export type LogHistogram = { bucketMs: number; buckets: LogHistogramBucket[] };

const NICE_BUCKETS_MS = [
  1_000,
  5_000,
  10_000,
  15_000,
  30_000,
  60_000,
  2 * 60_000,
  5 * 60_000,
  10 * 60_000,
  15 * 60_000,
  30 * 60_000,
  60 * 60_000,
  2 * 3_600_000,
  3 * 3_600_000,
  6 * 3_600_000,
  12 * 3_600_000,
  24 * 3_600_000,
];

/** A round bucket size that splits `range` into at most `target` buckets. */
export function histogramBucketMs(range: LogRange, target = 60): number {
  const span = range.to.getTime() - range.from.getTime();
  const raw = span / target;
  return NICE_BUCKETS_MS.find((ms) => ms >= raw) ?? 24 * 3_600_000;
}

/** Line counts per level per time bucket, every bucket present (zeros included). */
export async function logHistogram(
  input: LogScope & LogRange & { filters?: LogFilters; target?: number },
): Promise<LogHistogram> {
  const bucketMs = histogramBucketMs(input, input.target);
  const origin = new Date(Math.floor(input.from.getTime() / bucketMs) * bucketMs);
  const bucket = sql<Date>`date_bin(${sql.raw(`'${bucketMs} milliseconds'::interval`)}, ${logEntry.occurredAt}, ${origin.toISOString()}::timestamptz)`;
  const rows = await db
    .select({ bucket, level: logEntry.level, count: sql<number>`count(*)::int` })
    .from(logEntry)
    .where(and(...conditions(input, input, input.filters ?? {})))
    .groupBy(sql`1`, logEntry.level);
  const counts = new Map<number, LogHistogramBucket>();
  const buckets: LogHistogramBucket[] = [];
  for (let at = origin.getTime(); at < input.to.getTime(); at += bucketMs) {
    const entry = { start: new Date(at).toISOString(), info: 0, warning: 0, error: 0 };
    counts.set(at, entry);
    buckets.push(entry);
  }
  for (const row of rows) {
    const at = new Date(row.bucket).getTime();
    const entry = counts.get(at);
    if (entry) entry[row.level] += row.count;
  }
  return { bucketMs, buckets };
}

export type LogFacetValue = { value: string; count: number };

export type LogFacets = {
  levels: LogFacetValue[];
  sources: LogFacetValue[];
  statuses: LogFacetValue[];
  methods: LogFacetValue[];
  routes: LogFacetValue[];
  apiKeyIds: LogFacetValue[];
  types: LogFacetValue[];
  total: number;
};

const FACET_LIMIT = 25;

/**
 * Counts per value for the filter sidebar. Each facet ignores its own filter (picking `error`
 * still shows how many warnings there are), like other log explorers.
 */
export async function logFacets(
  input: LogScope & LogRange & { filters?: LogFilters },
): Promise<LogFacets> {
  const filters = input.filters ?? {};
  async function facet(column: SQL, skip: Facet): Promise<LogFacetValue[]> {
    const rows = await db
      .select({ value: sql<string | null>`${column}`, count: sql<number>`count(*)::int` })
      .from(logEntry)
      .where(and(...conditions(input, input, filters, skip), sql`${column} is not null`))
      .groupBy(sql`1`)
      .orderBy(sql`2 desc`)
      .limit(FACET_LIMIT);
    return rows.flatMap((row) =>
      row.value === null ? [] : [{ value: row.value, count: row.count }],
    );
  }
  const [levels, sources, statuses, methods, routes, apiKeyIds, types, total] = await Promise.all([
    facet(sql`${logEntry.level}::text`, "level"),
    facet(sql`${logEntry.source}::text`, "source"),
    facet(sql`(${logEntry.statusCode} / 100)::text || 'xx'`, "status"),
    facet(sql`${logEntry.method}`, "method"),
    facet(sql`${logEntry.route}`, "route"),
    facet(sql`${logEntry.apiKeyId}`, "apiKey"),
    facet(sql`${logEntry.type}`, "type"),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(logEntry)
      .where(and(...conditions(input, input, filters)))
      .then((rows) => rows[0]?.count ?? 0),
  ]);
  // Every level is always listed, in severity order.
  const levelCounts = new Map(levels.map((entry) => [entry.value, entry.count]));
  return {
    levels: [...LOG_LEVELS].reverse().map((level) => ({
      value: level,
      count: levelCounts.get(level) ?? 0,
    })),
    sources,
    statuses: statuses.sort((a, b) => a.value.localeCompare(b.value)),
    methods,
    routes,
    apiKeyIds,
    types,
    total,
  };
}

const EXPORT_PAGE_SIZE = 1000;
export const MAX_LOG_EXPORT_ROWS = 100_000;

/** Every matching line, newest first, one page per iteration (capped at `MAX_LOG_EXPORT_ROWS`). */
export async function* exportLogPages(
  input: LogScope & LogRange & { filters?: LogFilters },
): AsyncGenerator<LogEntryOutput[]> {
  let after: string | undefined;
  let exported = 0;
  while (exported < MAX_LOG_EXPORT_ROWS) {
    const page = await queryLogs({ ...input, limit: EXPORT_PAGE_SIZE, after });
    if (page.data.length > 0) yield page.data;
    exported += page.data.length;
    if (!page.has_more) return;
    after = page.data.at(-1)?.id;
  }
}

/** How many lines an environment has in `range`. */
export async function countLogEntries(scope: LogScope, range: LogRange): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(logEntry)
    .where(and(...conditions(scope, range, {})));
  return row?.count ?? 0;
}

export type { LogEntryRow };
