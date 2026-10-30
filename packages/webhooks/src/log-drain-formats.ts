/**
 * Request bodies of a log drain batch, one per `LogDrainFormat`. Pure: the lines are the queued wire
 * objects (`GET /v1/logs` lines and audit events), in delivery order, and every format carries each
 * of them whole, so nothing a drain receives depends on its format but the envelope.
 *
 * - `ndjson`: one JSON object per line (the original format; `verifyLogDrainBatch` parses it).
 * - `loki`: Loki's push API (`POST /loki/api/v1/push`), one stream per source and level, each line
 *   the JSON object.
 * - `datadog`: Datadog's log intake (`POST /api/v2/logs`), one log per line with the object under
 *   `coss` (Datadog reserves `status`, `message`, `service`… at the top level).
 * - `otlp`: OTLP/HTTP logs in JSON (`POST /v1/logs`), one record per line with the object as a
 *   structured (map) body.
 */
import type { LogDrainFormat } from "./log-drain-schemas.ts";

export type LogDrainBatchContext = { drainId: string; environmentId: string };

export type EncodedLogDrainBatch = { body: string; contentType: string };

type Line = Record<string, unknown>;
type Level = "info" | "warning" | "error";

/** The service name every format reports the lines under. */
export const LOG_DRAIN_SERVICE_NAME = "coss";

export const LOG_DRAIN_CONTENT_TYPES = {
  ndjson: "application/x-ndjson",
  loki: "application/json",
  datadog: "application/json",
  otlp: "application/json",
} as const satisfies Record<LogDrainFormat, string>;

/** The request body: one JSON object per line, each line ending with `\n`. */
export function ndjson(lines: readonly unknown[]): string {
  return lines.map((line) => `${JSON.stringify(line)}\n`).join("");
}

export function encodeLogDrainBatch(
  format: LogDrainFormat,
  lines: readonly Line[],
  context: LogDrainBatchContext,
  now: Date,
): EncodedLogDrainBatch {
  const contentType = LOG_DRAIN_CONTENT_TYPES[format];
  switch (format) {
    case "ndjson":
      return { body: ndjson(lines), contentType };
    case "loki":
      return { body: JSON.stringify(lokiPush(lines, context, now)), contentType };
    case "datadog":
      return { body: JSON.stringify(datadogLogs(lines, context, now)), contentType };
    case "otlp":
      return { body: JSON.stringify(otlpLogs(lines, context, now)), contentType };
  }
}

// --- What every format reads from a line ------------------------------------------------------

function isAuditEvent(line: Line): boolean {
  return line.object === "audit_event";
}

/** The line's time in milliseconds: `occurred_at` (log lines) or `created_at` (audit events). */
function lineTimeMs(line: Line, now: Date): number {
  const value = isAuditEvent(line) ? line.created_at : line.occurred_at;
  const ms = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(ms) ? ms : now.getTime();
}

/** Nanoseconds since the epoch as a decimal string (what Loki and OTLP take). */
function nanos(ms: number): string {
  return `${Math.trunc(ms)}000000`;
}

function lineSource(line: Line): string {
  if (isAuditEvent(line)) return "audit";
  return typeof line.source === "string" ? line.source : "unknown";
}

function lineLevel(line: Line): Level {
  return line.level === "warning" || line.level === "error" ? line.level : "info";
}

/** A one-line summary: the log line's `message`, or who did what to what for an audit event. */
function lineMessage(line: Line): string {
  if (!isAuditEvent(line)) return typeof line.message === "string" ? line.message : "";
  const target = line.target_label ?? line.target_id;
  return [line.actor_label, line.action, target]
    .filter((part) => typeof part === "string" && part !== "")
    .join(" ");
}

// --- Loki ---------------------------------------------------------------------------------------

type LokiStream = { stream: Record<string, string>; values: [string, string][] };

/**
 * Labels stay few and bounded (Loki indexes them): the service, the source and the level, plus the
 * environment (one per drain). Everything else is in the line.
 */
function lokiPush(lines: readonly Line[], context: LogDrainBatchContext, now: Date) {
  const streams = new Map<string, LokiStream>();
  for (const line of lines) {
    const source = lineSource(line);
    const level = lineLevel(line);
    const key = `${source}\u0000${level}`;
    let stream = streams.get(key);
    if (!stream) {
      stream = {
        stream: {
          service_name: LOG_DRAIN_SERVICE_NAME,
          environment_id: context.environmentId,
          source,
          level,
        },
        values: [],
      };
      streams.set(key, stream);
    }
    stream.values.push([nanos(lineTimeMs(line, now)), JSON.stringify(line)]);
  }
  return { streams: [...streams.values()] };
}

// --- Datadog ------------------------------------------------------------------------------------

const DATADOG_STATUS = { info: "info", warning: "warn", error: "error" } as const;

function datadogLogs(lines: readonly Line[], context: LogDrainBatchContext, now: Date) {
  return lines.map((line) => ({
    ddsource: LOG_DRAIN_SERVICE_NAME,
    service: LOG_DRAIN_SERVICE_NAME,
    ddtags: `source:${lineSource(line)},environment_id:${context.environmentId}`,
    status: DATADOG_STATUS[lineLevel(line)],
    message: lineMessage(line),
    // Milliseconds since the epoch: Datadog's default date remapper reads `timestamp`.
    timestamp: lineTimeMs(line, now),
    coss: line,
  }));
}

// --- OTLP ---------------------------------------------------------------------------------------

type AnyValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: string }
  | { doubleValue: number }
  | { arrayValue: { values: AnyValue[] } }
  | { kvlistValue: { values: KeyValue[] } }
  | Record<string, never>;
type KeyValue = { key: string; value: AnyValue };

/** A JSON value as an OTLP `AnyValue` (64-bit integers as decimal strings, as OTLP/JSON encodes them). */
export function otlpValue(value: unknown): AnyValue {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(otlpValue) } };
  if (value !== null && typeof value === "object") {
    return { kvlistValue: { values: otlpAttributes(value as Record<string, unknown>) } };
  }
  // null (and anything JSON can't hold): an empty value.
  return {};
}

/** An object's fields as OTLP key-values, leaving out `null`s. */
function otlpAttributes(object: Record<string, unknown>): KeyValue[] {
  return Object.entries(object)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ({ key, value: otlpValue(value) }));
}

const OTLP_SEVERITY = {
  info: { severityNumber: 9, severityText: "INFO" },
  warning: { severityNumber: 13, severityText: "WARN" },
  error: { severityNumber: 17, severityText: "ERROR" },
} as const;

function otlpLogs(lines: readonly Line[], context: LogDrainBatchContext, now: Date) {
  const observed = nanos(now.getTime());
  return {
    resourceLogs: [
      {
        resource: {
          attributes: otlpAttributes({
            "service.name": LOG_DRAIN_SERVICE_NAME,
            "coss.environment_id": context.environmentId,
            "coss.log_drain_id": context.drainId,
          }),
        },
        scopeLogs: [
          {
            scope: { name: "coss.com/log-drains" },
            logRecords: lines.map((line) => ({
              timeUnixNano: nanos(lineTimeMs(line, now)),
              observedTimeUnixNano: observed,
              ...OTLP_SEVERITY[lineLevel(line)],
              body: otlpValue(line),
              attributes: otlpAttributes({
                "coss.source": lineSource(line),
                "coss.id": typeof line.id === "string" ? line.id : null,
              }),
            })),
          },
        ],
      },
    ],
  };
}
