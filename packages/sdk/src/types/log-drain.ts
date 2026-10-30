/** Log drain wire types (hand-written mirrors of the API's schemas). */
import type { AuditEvent } from "./audit-event.ts";
import type { Log, LogSource } from "./log.ts";

/**
 * What a drain forwards: `api` (requests made with the environment's API keys), `email` (email
 * events), `webhook` (webhook delivery attempts) and `audit` (changes to the environment, from
 * the organization's audit log).
 */
export type LogDrainSource = LogSource | "audit";

/**
 * How batches are encoded. `ndjson`: one JSON object per line, for your own endpoint
 * (`verifyLogDrainBatch` parses it). `loki`: Loki's push API (`/loki/api/v1/push`, Grafana Cloud
 * Logs). `datadog`: Datadog's log intake (`/api/v2/logs`). `otlp`: OTLP/HTTP logs in JSON
 * (`/v1/logs`).
 */
export type LogDrainFormat = "ndjson" | "loki" | "datadog" | "otlp";

/**
 * A header sent with every batch, for intake APIs that take a key: `Authorization` (`Basic …`,
 * `Bearer …`), `DD-API-KEY`… Its value is stored encrypted and never returned.
 */
export interface LogDrainAuthHeader {
  name: string;
  value: string;
}

/** An HTTPS endpoint the environment's log is streamed to, in signed batches. */
export interface LogDrain {
  object: "log_drain";
  id: string;
  url: string;
  description: string | null;
  /** Empty means every source, including ones added later. */
  sources: LogDrainSource[];
  format: LogDrainFormat;
  /** The auth header's name (e.g. `DD-API-KEY`), or `null`. Its value is never returned. */
  auth_header_name: string | null;
  /** A disabled drain receives nothing, and lines logged meanwhile are not kept for it. */
  enabled: boolean;
  /** `manual`, or `failing`: a batch failed every attempt, so coss.com disabled it. */
  disabled_reason: "manual" | "failing" | null;
  /** ISO 8601 timestamp; `null` while enabled. */
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A drain with its `whsec_…` signing secret, returned only when it is created. */
export interface LogDrainWithSecret extends LogDrain {
  secret: string;
}

export interface DeletedLogDrain {
  object: "log_drain";
  id: string;
  deleted: true;
}

export interface CreateLogDrainParams {
  /** An `https://` URL coss.com posts batches to. */
  url: string;
  description?: string | null;
  /** Defaults to every source. */
  sources?: LogDrainSource[];
  /** Defaults to `ndjson`. */
  format?: LogDrainFormat;
  auth_header?: LogDrainAuthHeader | null;
}

export interface UpdateLogDrainParams {
  url?: string;
  /** `null` clears it. */
  description?: string | null;
  sources?: LogDrainSource[];
  format?: LogDrainFormat;
  /** `null` removes it. */
  auth_header?: LogDrainAuthHeader | null;
  /** Disabling drops the lines still waiting for the drain. */
  enabled?: boolean;
}

export type LogDrainBatchStatus = "pending" | "succeeded" | "failed";

/** One HTTP attempt of a batch. */
export interface LogDrainAttempt {
  object: "log_drain_attempt";
  id: string;
  attempted_at: string;
  /** `null` when no response arrived. */
  status_code: number | null;
  duration_ms: number;
  error: string | null;
  /** At most 1 KB of the response body, as text. */
  response_excerpt: string | null;
}

/** One request; its `id` is the `webhook-id` header, the same on every attempt. */
export interface LogDrainBatch {
  object: "log_drain_batch";
  id: string;
  drain_id: string;
  status: LogDrainBatchStatus;
  line_count: number;
  byte_size: number;
  attempt_count: number;
  next_attempt_at: string | null;
  last_status_code: number | null;
  last_error: string | null;
  /** Oldest first. */
  attempts: LogDrainAttempt[];
  created_at: string;
  updated_at: string;
}

export interface ListLogDrainBatchesParams {
  status?: LogDrainBatchStatus;
  /** 1-100, default 50. */
  limit?: number;
  /** The `id` of the last batch of the previous page. */
  after?: string;
}

/**
 * One line of a log drain batch: a log line (as `coss.logs.list()` returns it) or an audit event
 * of the environment (as `coss.auditEvents.list()` returns it).
 */
export type LogDrainLine = Log | AuditEvent;
