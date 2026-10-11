/**
 * Delivery of queued log drain lines (run by the worker): lines are grouped into batches of at
 * most `MAX_BATCH_LINES` lines / `MAX_BATCH_BYTES` bytes and posted as signed NDJSON, one open batch
 * per drain at a time, so lines arrive in order and a failing drain backs off as a whole.
 * System-level: the scan spans organizations, and every write is scoped by the drain's own
 * organization. Drain deliveries are never written to the environment log (that would feed itself).
 */
import { db, type Executor, schema } from "@coss/db";
import { recordOrgAuditEvent } from "@coss/logs";
import { and, asc, eq, exists, inArray, isNull, lt, lte, notExists, or, sql } from "drizzle-orm";
import type { LogDrainDisabledReason } from "./log-drain-schemas.ts";
import {
  discardLogDrainBacklog,
  LOG_DRAIN_FAILED_MESSAGE,
  type LogDrainBatchRow,
} from "./log-drains.ts";
import { decryptSecret, type SecretsKeyRing } from "./secrets.ts";
import type { WebhookSender } from "./sender.ts";
import { signatureHeaders } from "./signing.ts";

const { logDrain, logDrainAttempt, logDrainBatch, logDrainRecord, organizationSuspension } = schema;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/** Wait before each retry: 10 attempts over roughly a day, then the drain is disabled. */
export const LOG_DRAIN_RETRY_DELAYS_MS = [
  5 * SECOND,
  MINUTE,
  5 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  4 * HOUR,
  8 * HOUR,
  8 * HOUR,
];
export const LOG_DRAIN_MAX_ATTEMPTS = LOG_DRAIN_RETRY_DELAYS_MS.length + 1;
export const MAX_BATCH_LINES = 500;
export const MAX_BATCH_BYTES = 1_000_000;
export const LOG_DRAIN_TIMEOUT_MS = 15_000;
export const LOG_DRAIN_CONTENT_TYPE = "application/x-ndjson";
const LEASE_MS = 2 * MINUTE;
const ERROR_MAX_LENGTH = 500;

export type LogDrainDeliveryDeps = {
  /** From `WEBHOOK_SECRETS_KEY` (`parseSecretsKeys`). */
  secretsKeys: SecretsKeyRing;
  send: WebhookSender;
  timeoutMs?: number;
};

type Scope = { organizationIds: string[] } | undefined;

const notSuspended = (
  organizationId: typeof logDrain.organizationId | typeof logDrainBatch.organizationId,
) =>
  notExists(
    db
      .select({ one: sql`1` })
      .from(organizationSuspension)
      .where(eq(organizationSuspension.organizationId, organizationId)),
  );

/** The lines of the next batch: oldest first, within both limits (a single oversized line still goes). */
export function takeBatch<T extends { byteSize: number }>(records: readonly T[]): T[] {
  const taken: T[] = [];
  let bytes = 0;
  for (const record of records.slice(0, MAX_BATCH_LINES)) {
    if (taken.length > 0 && bytes + record.byteSize > MAX_BATCH_BYTES) break;
    taken.push(record);
    bytes += record.byteSize;
  }
  return taken;
}

/**
 * Starts a batch for each drain (up to `limit`) that has queued lines and no open batch. Each drain
 * is locked while its batch forms (`FOR NO KEY UPDATE SKIP LOCKED`: it doesn't block the key-share
 * locks of lines being queued for it); the partial unique index on open batches settles any race.
 */
async function formBatches(now: Date, limit: number, scope: Scope): Promise<LogDrainBatchRow[]> {
  if (limit <= 0) return [];
  const candidates = await db
    .select({ id: logDrain.id, organizationId: logDrain.organizationId })
    .from(logDrain)
    .where(
      and(
        eq(logDrain.enabled, true),
        scope ? inArray(logDrain.organizationId, scope.organizationIds) : undefined,
        notSuspended(logDrain.organizationId),
        notExists(
          db
            .select({ one: sql`1` })
            .from(logDrainBatch)
            .where(
              and(
                sql`${logDrainBatch.drainId} = ${logDrain.id}`,
                eq(logDrainBatch.status, "pending"),
              ),
            ),
        ),
        exists(
          db
            .select({ one: sql`1` })
            .from(logDrainRecord)
            .where(
              and(sql`${logDrainRecord.drainId} = ${logDrain.id}`, isNull(logDrainRecord.batchId)),
            ),
        ),
      ),
    )
    .limit(limit);
  const formed: LogDrainBatchRow[] = [];
  for (const candidate of candidates) {
    const batch = await db
      .transaction(async (tx) => {
        const [drain] = await tx
          .select({ id: logDrain.id })
          .from(logDrain)
          .where(
            and(
              eq(logDrain.id, candidate.id),
              eq(logDrain.organizationId, candidate.organizationId),
              eq(logDrain.enabled, true),
            ),
          )
          .for("no key update", { skipLocked: true });
        if (!drain) return null;
        const queued = await tx
          .select({ id: logDrainRecord.id, byteSize: logDrainRecord.byteSize })
          .from(logDrainRecord)
          .where(
            and(
              eq(logDrainRecord.organizationId, candidate.organizationId),
              eq(logDrainRecord.drainId, candidate.id),
              isNull(logDrainRecord.batchId),
            ),
          )
          .orderBy(asc(logDrainRecord.id))
          .limit(MAX_BATCH_LINES);
        const lines = takeBatch(queued);
        if (lines.length === 0) return null;
        const [created] = await tx
          .insert(logDrainBatch)
          .values({
            organizationId: candidate.organizationId,
            drainId: candidate.id,
            recordCount: lines.length,
            byteSize: lines.reduce((sum, line) => sum + line.byteSize, 0),
            nextAttemptAt: now,
            leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
          })
          .onConflictDoNothing()
          .returning();
        // Another worker opened one first.
        if (!created) return null;
        await tx
          .update(logDrainRecord)
          .set({ batchId: created.id })
          .where(
            and(
              eq(logDrainRecord.organizationId, candidate.organizationId),
              inArray(
                logDrainRecord.id,
                lines.map((line) => line.id),
              ),
            ),
          );
        return created;
      })
      .catch((error: unknown) => {
        console.error(`[log-drains] batch for ${candidate.id} not formed:`, error);
        return null;
      });
    if (batch) formed.push(batch);
  }
  return formed;
}

/**
 * Leases due retries (`FOR UPDATE SKIP LOCKED`), so concurrent workers never share one. Batches of
 * suspended organizations are held (not failed) and resume once it is lifted.
 */
async function claimDue(now: Date, limit: number, scope: Scope): Promise<LogDrainBatchRow[]> {
  if (limit <= 0) return [];
  const due = db
    .select({ id: logDrainBatch.id })
    .from(logDrainBatch)
    .where(
      and(
        eq(logDrainBatch.status, "pending"),
        lte(logDrainBatch.nextAttemptAt, now),
        or(isNull(logDrainBatch.leaseExpiresAt), lt(logDrainBatch.leaseExpiresAt, now)),
        scope ? inArray(logDrainBatch.organizationId, scope.organizationIds) : undefined,
        notSuspended(logDrainBatch.organizationId),
      ),
    )
    .orderBy(asc(logDrainBatch.nextAttemptAt))
    .limit(limit)
    .for("update", { skipLocked: true });
  return db
    .update(logDrainBatch)
    .set({ leaseExpiresAt: new Date(now.getTime() + LEASE_MS) })
    .where(inArray(logDrainBatch.id, due))
    .returning();
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, ERROR_MAX_LENGTH) || "Request failed.";
}

/** The request body: one JSON object per line, each line ending with `\n`. */
export function ndjson(lines: readonly unknown[]): string {
  return lines.map((line) => `${JSON.stringify(line)}\n`).join("");
}

/** Turns a drain off after a batch failed every attempt, dropping its backlog. */
async function disableFailingDrain(
  tx: Executor,
  batch: LogDrainBatchRow,
  now: Date,
): Promise<void> {
  const [disabled] = await tx
    .update(logDrain)
    .set({
      enabled: false,
      disabledReason: "failing" satisfies LogDrainDisabledReason,
      disabledAt: now,
    })
    .where(
      and(
        eq(logDrain.id, batch.drainId),
        eq(logDrain.organizationId, batch.organizationId),
        eq(logDrain.enabled, true),
      ),
    )
    .returning();
  if (!disabled) return;
  await discardLogDrainBacklog(tx, disabled, LOG_DRAIN_FAILED_MESSAGE);
  await recordOrgAuditEvent(
    {
      organizationId: disabled.organizationId,
      projectId: disabled.projectId,
      environmentId: disabled.environmentId,
      actor: { type: "system", id: null, label: "COSS" },
      action: "log_drain.disabled",
      target: { type: "log_drain", id: disabled.id, label: disabled.url },
      metadata: { reason: "failing", batch_id: batch.id },
    },
    tx,
  );
}

async function attempt(batch: LogDrainBatchRow, now: Date, deps: LogDrainDeliveryDeps) {
  const ours = and(
    eq(logDrainBatch.id, batch.id),
    eq(logDrainBatch.organizationId, batch.organizationId),
  );
  const [drain] = await db
    .select()
    .from(logDrain)
    .where(and(eq(logDrain.id, batch.drainId), eq(logDrain.organizationId, batch.organizationId)))
    .limit(1);
  if (!drain?.enabled) {
    await db
      .update(logDrainBatch)
      .set({
        status: "failed",
        nextAttemptAt: null,
        leaseExpiresAt: null,
        lastError: LOG_DRAIN_FAILED_MESSAGE,
      })
      .where(ours);
    return;
  }
  const records = await db
    .select({ line: logDrainRecord.line })
    .from(logDrainRecord)
    .where(
      and(
        eq(logDrainRecord.organizationId, batch.organizationId),
        eq(logDrainRecord.batchId, batch.id),
      ),
    )
    .orderBy(asc(logDrainRecord.id));

  // Signed and sent byte for byte. The batch id is the `webhook-id` on every attempt, so a
  // receiver can drop a batch it already stored.
  const body = ndjson(records.map((record) => record.line));
  const headers = {
    ...signatureHeaders({
      secrets: [decryptSecret(drain.secretCiphertext, deps.secretsKeys)],
      id: batch.id,
      timestamp: Math.floor(now.getTime() / 1000),
      body,
    }),
    "coss-log-drain-id": drain.id,
    "coss-environment-id": drain.environmentId,
  };
  const started = performance.now();
  let statusCode: number | null = null;
  let responseExcerpt: string | null = null;
  let error: string | null = null;
  try {
    const response = await deps.send({
      url: drain.url,
      headers,
      body,
      timeoutMs: deps.timeoutMs ?? LOG_DRAIN_TIMEOUT_MS,
      contentType: LOG_DRAIN_CONTENT_TYPE,
      userAgent: "COSS-LogDrains/1.0",
    });
    statusCode = response.status;
    responseExcerpt = response.body || null;
    if (statusCode < 200 || statusCode >= 300) error = `HTTP ${statusCode}`;
  } catch (cause) {
    error = describeError(cause);
  }
  const durationMs = Math.round(performance.now() - started);

  const attempts = batch.attemptCount + 1;
  const succeeded = error === null;
  const exhausted = !succeeded && attempts >= LOG_DRAIN_MAX_ATTEMPTS;
  const retryDelay = LOG_DRAIN_RETRY_DELAYS_MS[attempts - 1] ?? 0;
  await db.transaction(async (tx) => {
    await tx.insert(logDrainAttempt).values({
      organizationId: batch.organizationId,
      batchId: batch.id,
      attemptedAt: now,
      statusCode,
      durationMs,
      error,
      responseExcerpt,
    });
    await tx
      .update(logDrainBatch)
      .set({
        status: succeeded ? "succeeded" : exhausted ? "failed" : "pending",
        attemptCount: attempts,
        byteSize: Buffer.byteLength(body),
        nextAttemptAt: succeeded || exhausted ? null : new Date(now.getTime() + retryDelay),
        leaseExpiresAt: null,
        lastStatusCode: statusCode,
        lastError: error,
      })
      .where(ours);
    if (exhausted) await disableFailingDrain(tx, batch, now);
  });
}

/**
 * Forms new batches and attempts them, plus due retries (up to `limit` in all), once each,
 * concurrently. `scope` limits the scan to some organizations (tests). Returns how many batches
 * were attempted.
 */
export async function runDueLogDrainDeliveries(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } },
  deps: LogDrainDeliveryDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 10;
  const retries = await claimDue(now, limit, opts.scope);
  const formed = await formBatches(now, limit - retries.length, opts.scope);
  const batches = [...retries, ...formed];
  await Promise.all(
    batches.map((batch) =>
      attempt(batch, now, deps).catch(async (error: unknown) => {
        console.error(`[log-drains] batch ${batch.id} failed unexpectedly:`, error);
        // Release the lease; the batch is retried when it falls due again.
        await db
          .update(logDrainBatch)
          .set({ leaseExpiresAt: null })
          .where(eq(logDrainBatch.id, batch.id));
      }),
    ),
  );
  return batches.length;
}
