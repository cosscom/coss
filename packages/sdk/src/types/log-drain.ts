/** Log drain wire types (hand-written mirrors of the API's schemas). */
import type { Log, LogSource } from "./log.ts";

/**
 * What a drain forwards: `api` (requests made with the environment's API keys), `email` (email
 * events), `webhook` (webhook delivery attempts) and `audit` (changes to the environment, from
 * the organization's audit log).
 */
export type LogDrainSource = LogSource | "audit";

/** An HTTPS endpoint the environment's log is streamed to, in signed NDJSON batches. */
export interface LogDrain {
  object: "log_drain";
  id: string;
  url: string;
  description: string | null;
  /** Empty means every source, including ones added later. */
  sources: LogDrainSource[];
  /** A disabled drain receives nothing, and lines logged meanwhile are not kept for it. */
  enabled: boolean;
  /** `manual`, or `failing`: a batch failed every attempt, so COSS disabled it. */
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
  /** An `https://` URL COSS posts batches to. */
  url: string;
  description?: string | null;
  /** Defaults to every source. */
  sources?: LogDrainSource[];
}

export interface UpdateLogDrainParams {
  url?: string;
  /** `null` clears it. */
  description?: string | null;
  sources?: LogDrainSource[];
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

/** One NDJSON request; its `id` is the `webhook-id` header, the same on every attempt. */
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

/** A change to the environment, from the organization's audit log. */
export interface AuditEventLine {
  object: "audit_event";
  id: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  actor_type: "user" | "api_key" | "system";
  actor_id: string | null;
  actor_label: string;
  /** `<resource>.<verb>`, e.g. `webhook_endpoint.created`. */
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  project_id: string | null;
  environment_id: string | null;
  metadata: Record<string, unknown>;
  client_ip: string | null;
  user_agent: string | null;
}

/** One line of a log drain batch: a log line (as `coss.logs.list()` returns it) or an audit event. */
export type LogDrainLine = Log | AuditEventLine;
