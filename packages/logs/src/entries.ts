import { type Executor, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { activeLogDrains, insertLogDrainRecords } from "./drain-outbox.ts";
import type { LogEntryOutput, LogLevel, LogSource } from "./schemas.ts";

const { logEntry } = schema;

export type LogEntryRow = typeof logEntry.$inferSelect;

/** One line to append. Ids are derived from `occurredAt` (so an id alone locates its partition). */
export type LogEntryInput = {
  organizationId: string;
  projectId: string;
  environmentId: string;
  occurredAt: Date;
  source: LogSource;
  level: LogLevel;
  type: string;
  message: string;
  requestId?: string | null;
  apiKeyId?: string | null;
  method?: string | null;
  path?: string | null;
  route?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  clientIp?: string | null;
  userAgent?: string | null;
  errorCode?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  recipient?: string | null;
  attributes?: Record<string, unknown>;
  /** More words free-text search should match (e.g. a webhook endpoint's id). */
  searchTerms?: readonly string[];
};

const MESSAGE_MAX_LENGTH = 500;
const SHORT_MAX_LENGTH = 512;

function short(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.length > SHORT_MAX_LENGTH ? value.slice(0, SHORT_MAX_LENGTH) : value;
}

/** What free-text search matches: the message, path, ids and recipient, lower-cased. */
export function logSearchText(input: LogEntryInput): string {
  return [
    input.message,
    input.path,
    input.type,
    input.requestId,
    input.resourceId,
    input.recipient,
    input.errorCode,
    input.apiKeyId,
    ...(input.searchTerms ?? []),
  ]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .toLowerCase()
    .slice(0, 2000);
}

/** The row for a line; the id carries `occurredAt` (millisecond precision, like the column). */
export function toLogRow(input: LogEntryInput): typeof logEntry.$inferInsert {
  const occurredAt = new Date(Math.floor(input.occurredAt.getTime()));
  return {
    id: newId(ID_PREFIXES.logEntry, occurredAt.getTime()),
    organizationId: input.organizationId,
    projectId: input.projectId,
    environmentId: input.environmentId,
    occurredAt,
    source: input.source,
    level: input.level,
    type: input.type,
    message:
      input.message.length > MESSAGE_MAX_LENGTH
        ? `${input.message.slice(0, MESSAGE_MAX_LENGTH - 1)}…`
        : input.message,
    requestId: short(input.requestId),
    apiKeyId: short(input.apiKeyId),
    method: short(input.method),
    path: short(input.path),
    route: short(input.route),
    statusCode: input.statusCode ?? null,
    durationMs:
      input.durationMs === null || input.durationMs === undefined
        ? null
        : Math.max(0, Math.round(input.durationMs)),
    clientIp: short(input.clientIp),
    userAgent: short(input.userAgent),
    errorCode: short(input.errorCode),
    resourceType: short(input.resourceType),
    resourceId: short(input.resourceId),
    recipient: short(input.recipient),
    attributes: input.attributes ?? {},
    searchText: logSearchText(input),
  };
}

/**
 * Appends lines, e.g. in the transaction that records the event they describe (product event
 * tables call this next to their own insert, like `enqueueWebhookMessage`). Lines are also queued
 * for their environment's log drains, atomically with the lines themselves.
 */
export async function appendLogEntries(
  executor: Executor,
  inputs: readonly LogEntryInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  const rows = inputs.map(toLogRow);
  // Keep the drain selection protected until both the lines and outbox records commit.
  // A savepoint inside the caller's transaction, or a transaction of its own.
  await executor.transaction(async (tx) => {
    const drains = await activeLogDrains(
      tx,
      rows.map((row) => row.environmentId),
    );
    await tx.insert(logEntry).values(rows);
    await insertLogDrainRecords(
      tx,
      drains,
      rows.map((row) => ({
        organizationId: row.organizationId,
        environmentId: row.environmentId,
        source: row.source,
        sourceId: row.id as string,
        // Every column is set by `toLogRow`.
        line: toLogObject(row as LogEntryRow),
      })),
    );
  });
}

export function toLogObject(row: LogEntryRow): LogEntryOutput {
  return {
    object: "log",
    id: row.id,
    occurred_at: row.occurredAt.toISOString(),
    source: row.source,
    level: row.level,
    type: row.type,
    message: row.message,
    request_id: row.requestId,
    api_key_id: row.apiKeyId,
    method: row.method,
    path: row.path,
    route: row.route,
    status_code: row.statusCode,
    duration_ms: row.durationMs,
    client_ip: row.clientIp,
    user_agent: row.userAgent,
    error_code: row.errorCode,
    resource_type: row.resourceType,
    resource_id: row.resourceId,
    recipient: row.recipient,
    attributes: row.attributes,
  };
}
