/**
 * Log drains of an environment, and their batch log. A drain receives the environment's log lines
 * (`@coss/logs`, queued by `appendLogEntries`/`recordOrgAuditEvent`) in signed batches
 * (`log-drain-delivery.ts`) encoded in its format (`log-drain-formats.ts`), with an optional auth
 * header whose value is stored encrypted and never read back.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import type { LogDrainSource } from "@coss/logs/schemas";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { WebhookManagementDeps } from "./endpoints.ts";
import { WebhookError } from "./errors.ts";
import {
  DEFAULT_LOG_DRAIN_BATCH_LIST_LIMIT,
  LOG_DRAIN_AUTH_HEADER_NAME_MAX_LENGTH,
  LOG_DRAIN_AUTH_HEADER_VALUE_MAX_LENGTH,
  LOG_DRAIN_DESCRIPTION_MAX_LENGTH,
  type LogDrainBatchObjectOutput,
  type LogDrainDisabledReason,
  type LogDrainFormat,
  type LogDrainObjectOutput,
  logDrainAuthHeaderNameProblem,
  MAX_LOG_DRAIN_BATCH_LIST_LIMIT,
} from "./log-drain-schemas.ts";
import { decryptSecret, encryptSecret, type SecretsKeyRing } from "./secrets.ts";
import { validateWebhookUrl, WebhookUrlError } from "./sender.ts";
import { generateSigningSecret } from "./signing.ts";

const { environment, logDrain, logDrainAttempt, logDrainBatch, logDrainRecord } = schema;

export type LogDrainRow = typeof logDrain.$inferSelect;
export type LogDrainBatchRow = typeof logDrainBatch.$inferSelect;
export type LogDrainAttemptRow = typeof logDrainAttempt.$inferSelect;
export type LogDrainBatchLogEntry = LogDrainBatchRow & { attempts: LogDrainAttemptRow[] };

export const MAX_LOG_DRAINS_PER_ENVIRONMENT = 5;

export const LOG_DRAIN_FAILED_MESSAGE = "The drain is disabled.";

/** A header sent with every batch; `value` is plain text only on its way in. */
export type LogDrainAuthHeader = { name: string; value: string };

/** The drain's public wire representation. Never includes its signing secret or auth header value. */
export function toLogDrainObject(row: LogDrainRow): LogDrainObjectOutput {
  return {
    object: "log_drain",
    id: row.id,
    url: row.url,
    description: row.description,
    sources: row.sources,
    format: row.format,
    auth_header_name: row.authHeaderName,
    enabled: row.enabled,
    disabled_reason: row.enabled
      ? null
      : ((row.disabledReason as LogDrainDisabledReason) ?? "manual"),
    disabled_at: row.enabled ? null : (row.disabledAt?.toISOString() ?? null),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

/** The batch's public wire representation. */
export function toLogDrainBatchObject(entry: LogDrainBatchLogEntry): LogDrainBatchObjectOutput {
  return {
    object: "log_drain_batch",
    id: entry.id,
    drain_id: entry.drainId,
    status: entry.status,
    line_count: entry.recordCount,
    byte_size: entry.byteSize,
    attempt_count: entry.attemptCount,
    next_attempt_at: entry.nextAttemptAt?.toISOString() ?? null,
    last_status_code: entry.lastStatusCode,
    last_error: entry.lastError,
    attempts: entry.attempts.map((attempt) => ({
      object: "log_drain_attempt",
      id: attempt.id,
      attempted_at: attempt.attemptedAt.toISOString(),
      status_code: attempt.statusCode,
      duration_ms: attempt.durationMs,
      error: attempt.error,
      response_excerpt: attempt.responseExcerpt,
    })),
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  };
}

function normalizeDescription(value: string | null | undefined): string | null {
  return value?.trim().slice(0, LOG_DRAIN_DESCRIPTION_MAX_LENGTH) || null;
}

function normalizeSources(sources: readonly LogDrainSource[]): LogDrainSource[] {
  return [...new Set(sources)].sort();
}

function checkedUrl(value: string, deps: WebhookManagementDeps): string {
  try {
    return validateWebhookUrl(value.trim(), { allowInsecure: deps.allowInsecureUrls }).href;
  } catch (error) {
    if (error instanceof WebhookUrlError) {
      throw new WebhookError("invalid_url", error.message.replaceAll("Webhook URLs", "Drain URLs"));
    }
    throw error;
  }
}

/**
 * The auth header's columns: its name and its encrypted value, both `null` to remove it. The API
 * validates the same rules first (`CreateLogDrainRequest`); the dashboard relies on these.
 */
function authHeaderColumns(
  header: LogDrainAuthHeader | null,
  keys: SecretsKeyRing,
): { authHeaderName: string | null; authHeaderCiphertext: string | null } {
  if (header === null) return { authHeaderName: null, authHeaderCiphertext: null };
  const name = header.name.trim();
  const value = header.value.trim();
  if (!name) throw new WebhookError("invalid_auth_header", "Enter a header name.");
  if (name.length > LOG_DRAIN_AUTH_HEADER_NAME_MAX_LENGTH) {
    throw new WebhookError(
      "invalid_auth_header",
      `Header names can be at most ${LOG_DRAIN_AUTH_HEADER_NAME_MAX_LENGTH} characters.`,
    );
  }
  const problem = logDrainAuthHeaderNameProblem(name);
  if (problem) throw new WebhookError("invalid_auth_header", problem);
  if (!value) throw new WebhookError("invalid_auth_header", "Enter the header's value.");
  if (value.length > LOG_DRAIN_AUTH_HEADER_VALUE_MAX_LENGTH) {
    throw new WebhookError(
      "invalid_auth_header",
      `Header values can be at most ${LOG_DRAIN_AUTH_HEADER_VALUE_MAX_LENGTH} characters.`,
    );
  }
  // Visible ASCII, spaces and tabs: nothing that could end the header.
  if (!/^[\t\x20-\x7e]+$/.test(value)) {
    throw new WebhookError(
      "invalid_auth_header",
      "Header values can only hold printable ASCII characters.",
    );
  }
  return { authHeaderName: name, authHeaderCiphertext: encryptSecret(value, keys) };
}

/** Creates a drain with a new signing secret, which is returned in plain text. */
export async function createLogDrain(
  input: {
    organizationId: string;
    environmentId: string;
    url: string;
    description?: string | null;
    sources: readonly LogDrainSource[];
    /** Default `ndjson`. */
    format?: LogDrainFormat;
    authHeader?: LogDrainAuthHeader | null;
    userId: string | null;
  },
  deps: WebhookManagementDeps,
): Promise<{ drain: LogDrainRow; secret: string }> {
  await deps.plans?.requireFeature(input.organizationId, "logDrains");
  const url = checkedUrl(input.url, deps);
  const authHeader = authHeaderColumns(input.authHeader ?? null, deps.secretsKeys);
  const [env] = await db
    .select({ projectId: environment.projectId })
    .from(environment)
    .where(
      and(
        eq(environment.organizationId, input.organizationId),
        eq(environment.id, input.environmentId),
      ),
    )
    .limit(1);
  if (!env) throw new WebhookError("not_found", "Environment not found.");
  const [existing] = await db
    .select({ value: count() })
    .from(logDrain)
    .where(
      and(
        eq(logDrain.organizationId, input.organizationId),
        eq(logDrain.environmentId, input.environmentId),
      ),
    );
  if ((existing?.value ?? 0) >= MAX_LOG_DRAINS_PER_ENVIRONMENT) {
    throw new WebhookError(
      "too_many_log_drains",
      `An environment can have at most ${MAX_LOG_DRAINS_PER_ENVIRONMENT} log drains.`,
    );
  }
  const secret = generateSigningSecret();
  const [drain] = await db
    .insert(logDrain)
    .values({
      organizationId: input.organizationId,
      projectId: env.projectId,
      environmentId: input.environmentId,
      url,
      description: normalizeDescription(input.description),
      sources: normalizeSources(input.sources),
      secretCiphertext: encryptSecret(secret, deps.secretsKeys),
      format: input.format ?? "ndjson",
      ...authHeader,
      createdByUserId: input.userId,
    })
    .returning();
  if (!drain) throw new Error("Log drain insert returned no row.");
  return { drain, secret };
}

export async function listLogDrains(input: {
  organizationId: string;
  environmentId: string;
}): Promise<LogDrainRow[]> {
  return db
    .select()
    .from(logDrain)
    .where(
      and(
        eq(logDrain.organizationId, input.organizationId),
        eq(logDrain.environmentId, input.environmentId),
      ),
    )
    .orderBy(asc(logDrain.createdAt));
}

export async function getLogDrain(input: {
  organizationId: string;
  id: string;
}): Promise<LogDrainRow | null> {
  if (!isId("drain", input.id)) return null;
  const [row] = await db
    .select()
    .from(logDrain)
    .where(and(eq(logDrain.organizationId, input.organizationId), eq(logDrain.id, input.id)))
    .limit(1);
  return row ?? null;
}

/**
 * Fails the drain's open batch and drops its queued lines: a disabled drain keeps nothing, so
 * enabling it again starts from new lines rather than a backlog. Run with the update that
 * disables it.
 */
export async function discardLogDrainBacklog(
  tx: Executor,
  drain: { id: string; organizationId: string },
  reason: string,
): Promise<void> {
  await tx
    .update(logDrainBatch)
    .set({ status: "failed", nextAttemptAt: null, leaseExpiresAt: null, lastError: reason })
    .where(
      and(
        eq(logDrainBatch.organizationId, drain.organizationId),
        eq(logDrainBatch.drainId, drain.id),
        eq(logDrainBatch.status, "pending"),
      ),
    );
  await tx
    .delete(logDrainRecord)
    .where(
      and(
        eq(logDrainRecord.organizationId, drain.organizationId),
        eq(logDrainRecord.drainId, drain.id),
        isNull(logDrainRecord.batchId),
      ),
    );
}

/**
 * Changes a drain's URL, description, sources, format, auth header or enabled flag. Fields left
 * `undefined` keep their current value; `description: null` clears it and `authHeader: null`
 * removes it. A batch being retried goes out in the new format, to the new URL, with the new
 * header. Disabling drops the drain's backlog; the signing secret never changes.
 */
export async function updateLogDrain(
  input: {
    organizationId: string;
    id: string;
    url?: string;
    description?: string | null;
    sources?: readonly LogDrainSource[];
    format?: LogDrainFormat;
    authHeader?: LogDrainAuthHeader | null;
    enabled?: boolean;
  },
  deps: WebhookManagementDeps,
): Promise<LogDrainRow> {
  // Re-enabling one is like creating it; disabling or editing is always allowed.
  if (input.enabled === true) await deps.plans?.requireFeature(input.organizationId, "logDrains");
  const changes = {
    ...(input.url !== undefined && { url: checkedUrl(input.url, deps) }),
    ...(input.description !== undefined && {
      description: normalizeDescription(input.description),
    }),
    ...(input.sources !== undefined && { sources: normalizeSources(input.sources) }),
    ...(input.format !== undefined && { format: input.format }),
    ...(input.authHeader !== undefined && authHeaderColumns(input.authHeader, deps.secretsKeys)),
    ...(input.enabled === true && { enabled: true, disabledReason: null, disabledAt: null }),
  };
  const scope = and(eq(logDrain.organizationId, input.organizationId), eq(logDrain.id, input.id));
  return db.transaction(async (tx) => {
    // Lock the row, so a disable and the worker's batch formation don't interleave.
    const [current] = await tx.select().from(logDrain).where(scope).for("update").limit(1);
    if (!current) throw new WebhookError("not_found", "Log drain not found.");
    const disable = input.enabled === false && current.enabled;
    const set = {
      ...changes,
      ...(disable && {
        enabled: false,
        disabledReason: "manual" satisfies LogDrainDisabledReason,
        disabledAt: new Date(),
      }),
    };
    if (Object.keys(set).length === 0) return current;
    const [updated] = await tx.update(logDrain).set(set).where(scope).returning();
    if (!updated) throw new WebhookError("not_found", "Log drain not found.");
    if (disable) await discardLogDrainBacklog(tx, updated, LOG_DRAIN_FAILED_MESSAGE);
    return updated;
  });
}

export async function deleteLogDrain(input: { organizationId: string; id: string }): Promise<void> {
  await db
    .delete(logDrain)
    .where(and(eq(logDrain.organizationId, input.organizationId), eq(logDrain.id, input.id)));
}

/** The drain's plain-text signing secret. */
export function revealLogDrainSecret(drain: LogDrainRow, keys: SecretsKeyRing): string {
  return decryptSecret(drain.secretCiphertext, keys);
}

const cursor = alias(logDrainBatch, "cursor");

/**
 * A page of the drain's batches, newest first, each with its attempts. `after` is the id of the
 * last batch of the previous page; an unknown or foreign one yields nothing.
 */
export async function pageLogDrainBatches(input: {
  organizationId: string;
  drainId: string;
  status?: LogDrainBatchRow["status"];
  limit?: number;
  after?: string;
}): Promise<{ batches: LogDrainBatchLogEntry[]; hasMore: boolean }> {
  const limit = Math.min(
    input.limit ?? DEFAULT_LOG_DRAIN_BATCH_LIST_LIMIT,
    MAX_LOG_DRAIN_BATCH_LIST_LIMIT,
  );
  if (input.after !== undefined && !isId("drainbat", input.after)) {
    return { batches: [], hasMore: false };
  }
  // Keyset on (created_at, id), compared in SQL: a JS Date would drop the microseconds.
  const afterCursor =
    input.after === undefined
      ? undefined
      : sql`(${logDrainBatch.createdAt}, ${logDrainBatch.id}) < (${db
          .select({ createdAt: cursor.createdAt, id: cursor.id })
          .from(cursor)
          .where(
            and(
              eq(cursor.organizationId, input.organizationId),
              eq(cursor.drainId, input.drainId),
              eq(cursor.id, input.after),
            ),
          )})`;
  const rows = await db
    .select()
    .from(logDrainBatch)
    .where(
      and(
        eq(logDrainBatch.organizationId, input.organizationId),
        eq(logDrainBatch.drainId, input.drainId),
        input.status === undefined ? undefined : eq(logDrainBatch.status, input.status),
        afterCursor,
      ),
    )
    // Matches the (drain_id, created_at DESC NULLS LAST) index.
    .orderBy(sql`${logDrainBatch.createdAt} desc nulls last`, desc(logDrainBatch.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return { batches: await withAttempts(input.organizationId, page), hasMore: rows.length > limit };
}

export async function getLogDrainBatch(input: {
  organizationId: string;
  drainId: string;
  id: string;
}): Promise<LogDrainBatchLogEntry | null> {
  if (!isId("drainbat", input.id)) return null;
  const rows = await db
    .select()
    .from(logDrainBatch)
    .where(
      and(
        eq(logDrainBatch.organizationId, input.organizationId),
        eq(logDrainBatch.drainId, input.drainId),
        eq(logDrainBatch.id, input.id),
      ),
    )
    .limit(1);
  const [entry] = await withAttempts(input.organizationId, rows);
  return entry ?? null;
}

/** How many lines are queued for the drain and not yet in a batch. */
export async function countQueuedLogDrainLines(input: {
  organizationId: string;
  drainId: string;
}): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(logDrainRecord)
    .where(
      and(
        eq(logDrainRecord.organizationId, input.organizationId),
        eq(logDrainRecord.drainId, input.drainId),
        isNull(logDrainRecord.batchId),
      ),
    );
  return row?.value ?? 0;
}

async function withAttempts(
  organizationId: string,
  batches: LogDrainBatchRow[],
): Promise<LogDrainBatchLogEntry[]> {
  if (batches.length === 0) return [];
  const attempts = await db
    .select()
    .from(logDrainAttempt)
    .where(
      and(
        eq(logDrainAttempt.organizationId, organizationId),
        inArray(
          logDrainAttempt.batchId,
          batches.map((batch) => batch.id),
        ),
      ),
    )
    .orderBy(asc(logDrainAttempt.attemptedAt), asc(logDrainAttempt.id));
  return batches.map((batch) => ({
    ...batch,
    attempts: attempts.filter((attempt) => attempt.batchId === batch.id),
  }));
}
