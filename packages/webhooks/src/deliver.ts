/**
 * Delivery of queued webhook messages (run by the worker). System-level: the scan spans
 * organizations, and every write is scoped by the delivery's own organization.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { appendLogEntries, type LogEntryInput, recordOrgAuditEvent } from "@coss/logs";
import { versioning as apiVersioning, type Versioning } from "@coss/versioning";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { signingSecrets, type WebhookEndpointRow } from "./endpoints.ts";
import {
  type AttemptResult,
  type DeliveryOutcome,
  DISABLE_FAILING_ENDPOINT_AFTER_MS,
  deliveryOutcome,
  endpointHealth,
  HOUR,
  leaseUntil,
  MINUTE,
  organizationNotHeld,
  runClaimed,
  SECOND,
  sendAttempt,
  stillOwned,
} from "./engine/index.ts";
import { WebhookError } from "./errors.ts";
import type { SecretsKeyRing } from "./secrets.ts";
import { DEFAULT_TIMEOUT_MS, type WebhookSender } from "./sender.ts";
import { signatureHeaders } from "./signing.ts";

const { webhookAttempt, webhookDelivery, webhookEndpoint, webhookMessage } = schema;

/** Wait before each retry: 8 attempts over roughly 28 hours. */
export const RETRY_DELAYS_MS = [
  5 * SECOND,
  5 * MINUTE,
  30 * MINUTE,
  2 * HOUR,
  5 * HOUR,
  10 * HOUR,
  10 * HOUR,
];
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
/** The most failed deliveries one `recoverWebhookEndpoint` call requeues. */
export const MAX_RECOVER_BATCH = 1000;
const ENDPOINT_DISABLED_ERROR = "The endpoint is disabled.";

export type WebhookDeliveryDeps = {
  /** From `WEBHOOK_SECRETS_KEY` (`parseSecretsKeys`). */
  secretsKeys: SecretsKeyRing;
  send: WebhookSender;
  timeoutMs?: number;
  /** The API versions payloads are rendered in (tests inject their own). */
  versioning?: Versioning;
  /** How long an endpoint fails before it is disabled (tests shorten it). */
  disableAfterMs?: number;
};

/**
 * The body sent to an endpoint: the stored (latest-version) event rendered in the endpoint's API version, with
 * `api_version` after `type`. Rendered at every attempt, so changing an endpoint's version also applies to its
 * pending retries.
 */
export function renderWebhookPayload(
  payload: Record<string, unknown>,
  apiVersion: string,
  versioning: Versioning = apiVersioning,
): Record<string, unknown> {
  const resolvedVersion = versioning.resolve(apiVersion);
  const rendered = versioning.downgrade(payload, resolvedVersion) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rendered)) {
    if (key === "api_version") continue;
    out[key] = value;
    if (key === "type") out.api_version = resolvedVersion;
  }
  if (!("api_version" in out)) out.api_version = resolvedVersion;
  return out;
}

type Claimed = typeof webhookDelivery.$inferSelect;

/**
 * Leases due deliveries (`FOR UPDATE SKIP LOCKED`), so concurrent workers never share one.
 * Deliveries of suspended organizations are held (not failed) and resume once it is lifted; those
 * of organizations being deleted are held until the worker deletes them.
 */
async function claimDue(
  now: Date,
  limit: number,
  scope?: { organizationIds: string[] },
): Promise<Claimed[]> {
  const due = db
    .select({ id: webhookDelivery.id })
    .from(webhookDelivery)
    .where(
      and(
        eq(webhookDelivery.status, "pending"),
        lte(webhookDelivery.nextAttemptAt, now),
        or(isNull(webhookDelivery.leaseExpiresAt), lt(webhookDelivery.leaseExpiresAt, now)),
        scope ? inArray(webhookDelivery.organizationId, scope.organizationIds) : undefined,
        organizationNotHeld(webhookDelivery.organizationId),
      ),
    )
    .orderBy(asc(webhookDelivery.nextAttemptAt))
    .limit(limit)
    .for("update", { skipLocked: true });
  return db
    .update(webhookDelivery)
    .set({ leaseExpiresAt: leaseUntil(now) })
    .where(inArray(webhookDelivery.id, due))
    .returning();
}

/** The delivery, while this worker still holds the lease it claimed it with. */
function owned(delivery: Claimed) {
  return and(
    eq(webhookDelivery.id, delivery.id),
    eq(webhookDelivery.organizationId, delivery.organizationId),
    stillOwned(webhookDelivery, delivery.leaseExpiresAt),
  );
}

async function attempt(delivery: Claimed, now: Date, deps: WebhookDeliveryDeps): Promise<void> {
  const [target] = await db
    .select({
      endpoint: webhookEndpoint,
      payload: webhookMessage.payload,
      type: webhookMessage.type,
    })
    .from(webhookMessage)
    .innerJoin(
      webhookEndpoint,
      and(
        eq(webhookEndpoint.id, delivery.endpointId),
        eq(webhookEndpoint.organizationId, delivery.organizationId),
      ),
    )
    .where(
      and(
        eq(webhookMessage.id, delivery.messageId),
        eq(webhookMessage.organizationId, delivery.organizationId),
      ),
    )
    .limit(1);
  if (!target?.endpoint.enabled) {
    await db
      .update(webhookDelivery)
      .set({
        status: "failed",
        nextAttemptAt: null,
        leaseExpiresAt: null,
        lastError: ENDPOINT_DISABLED_ERROR,
      })
      .where(owned(delivery));
    return;
  }

  // Signed and sent byte for byte; during a secret roll, by the current and the previous secret.
  const body = JSON.stringify(
    renderWebhookPayload(target.payload, target.endpoint.apiVersion, deps.versioning),
  );
  const result = await sendAttempt(deps.send, {
    url: target.endpoint.url,
    headers: signatureHeaders({
      secrets: signingSecrets(target.endpoint, deps.secretsKeys, now),
      id: delivery.messageId,
      timestamp: Math.floor(now.getTime() / 1000),
      body,
    }),
    body,
    timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  const outcome = deliveryOutcome({
    attemptCount: delivery.attemptCount,
    succeeded: result.succeeded,
    schedule: RETRY_DELAYS_MS,
    now,
  });
  await db.transaction(async (tx) => {
    // Fenced first: a worker whose lease expired (and was taken over) records nothing.
    const [finished] = await tx
      .update(webhookDelivery)
      .set({
        status: outcome.status,
        attemptCount: outcome.attemptCount,
        nextAttemptAt: outcome.nextAttemptAt,
        leaseExpiresAt: null,
        lastStatusCode: result.statusCode,
        lastError: result.error,
      })
      .where(owned(delivery))
      .returning({ id: webhookDelivery.id });
    if (!finished) return;
    await tx.insert(webhookAttempt).values({
      organizationId: delivery.organizationId,
      deliveryId: delivery.id,
      attemptedAt: now,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      error: result.error,
      responseExcerpt: result.responseExcerpt,
    });
    await appendLogEntries(tx, [
      attemptLogEntry({
        delivery,
        endpoint: target.endpoint,
        type: target.type,
        payload: target.payload,
        now,
        attempt: outcome.attemptCount,
        result,
        outcome,
      }),
    ]);
    await updateEndpointHealth(tx, target.endpoint, outcome, now, deps.disableAfterMs);
  });
}

/**
 * Tracks the endpoint's failure streak after a delivery finished (writing only when it changes) and
 * disables an endpoint that has been failing for too long.
 */
async function updateEndpointHealth(
  tx: Executor,
  endpoint: WebhookEndpointRow,
  outcome: DeliveryOutcome,
  now: Date,
  disableAfterMs = DISABLE_FAILING_ENDPOINT_AFTER_MS,
): Promise<void> {
  const change = endpointHealth({
    failingSince: endpoint.failingSince,
    succeeded: outcome.status === "succeeded",
    final: outcome.status !== "pending",
    now,
    disableAfterMs,
  });
  const ours = and(
    eq(webhookEndpoint.id, endpoint.id),
    eq(webhookEndpoint.organizationId, endpoint.organizationId),
  );
  switch (change.kind) {
    case "none":
      return;
    case "recovered":
      await tx
        .update(webhookEndpoint)
        .set({ failingSince: null, updatedAt: sql`${webhookEndpoint.updatedAt}` })
        .where(and(ours, isNotNull(webhookEndpoint.failingSince)));
      return;
    case "failing":
      await tx
        .update(webhookEndpoint)
        .set({ failingSince: change.since, updatedAt: sql`${webhookEndpoint.updatedAt}` })
        .where(and(ours, isNull(webhookEndpoint.failingSince)));
      return;
    case "disable": {
      // Re-checked here: a success may have cleared the streak since the endpoint was read.
      const [disabled] = await tx
        .update(webhookEndpoint)
        .set({ enabled: false, disabledReason: "failing", disabledAt: now })
        .where(
          and(
            ours,
            eq(webhookEndpoint.enabled, true),
            lte(webhookEndpoint.failingSince, new Date(now.getTime() - disableAfterMs)),
          ),
        )
        .returning();
      if (!disabled) return;
      await recordOrgAuditEvent(
        {
          organizationId: disabled.organizationId,
          projectId: disabled.projectId,
          environmentId: disabled.environmentId,
          actor: { type: "system", id: null, label: "COSS" },
          action: "webhook_endpoint.disabled",
          target: { type: "webhook_endpoint", id: disabled.id, label: disabled.url },
          metadata: { reason: "failing", failing_since: change.failingSince.toISOString() },
        },
        tx,
      );
      return;
    }
  }
}

/** The environment log line (`webhook.attempt`) for one attempt. */
function attemptLogEntry(input: {
  delivery: Claimed;
  endpoint: WebhookEndpointRow;
  type: string;
  payload: unknown;
  now: Date;
  attempt: number;
  result: AttemptResult;
  outcome: DeliveryOutcome;
}): LogEntryInput {
  const { delivery, endpoint, result } = input;
  const outcome = input.outcome.status === "pending" ? "retrying" : input.outcome.status;
  // Email events name their email, so the line joins that email's timeline.
  const data = (input.payload as { data?: { email_id?: unknown } } | null)?.data;
  const emailId = typeof data?.email_id === "string" ? data.email_id : null;
  const status = result.statusCode ?? result.error ?? "no response";
  return {
    organizationId: delivery.organizationId,
    projectId: endpoint.projectId,
    environmentId: endpoint.environmentId,
    occurredAt: input.now,
    source: "webhook",
    level: outcome === "succeeded" ? "info" : outcome === "retrying" ? "warning" : "error",
    type: "webhook.attempt",
    message: `${input.type} → ${endpoint.url} ${status}`,
    statusCode: result.statusCode,
    durationMs: result.durationMs,
    errorCode: outcome === "succeeded" ? null : "webhook_delivery_failed",
    resourceType: emailId ? "email" : "webhook_endpoint",
    resourceId: emailId ?? endpoint.id,
    searchTerms: [endpoint.id, delivery.id, delivery.messageId],
    attributes: {
      endpoint_id: endpoint.id,
      endpoint_url: endpoint.url,
      delivery_id: delivery.id,
      message_id: delivery.messageId,
      event_type: input.type,
      attempt: input.attempt,
      outcome,
      next_attempt_at: input.outcome.nextAttemptAt?.toISOString() ?? null,
      error: result.error,
      response_excerpt: result.responseExcerpt,
    },
  };
}

/**
 * Attempts every due delivery (up to `limit`) once, concurrently. `scope` limits the scan to some
 * organizations (tests). Returns how many were attempted.
 */
export async function runDueWebhookDeliveries(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } },
  deps: WebhookDeliveryDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 20;
  const claimed = await claimDue(now, limit, opts.scope);
  await runClaimed(
    claimed,
    { concurrency: limit, label: (delivery) => `[webhooks] delivery ${delivery.id}` },
    (delivery) => attempt(delivery, now, deps),
    // Release the lease; the delivery is retried when it falls due again.
    (delivery) => db.update(webhookDelivery).set({ leaseExpiresAt: null }).where(owned(delivery)),
  );
  return claimed.length;
}

/** Queues a finished delivery for one more immediate attempt. */
export async function retryWebhookDelivery(input: {
  organizationId: string;
  endpointId: string;
  id: string;
}): Promise<boolean> {
  if (!isId("whdel", input.id)) return false;
  return db.transaction(async (tx) => {
    // Serialize with retention on the parent, before locking/updating the child delivery.
    const [message] = await tx
      .select({ id: webhookMessage.id })
      .from(webhookMessage)
      .innerJoin(webhookDelivery, eq(webhookDelivery.messageId, webhookMessage.id))
      .where(
        and(
          eq(webhookDelivery.organizationId, input.organizationId),
          eq(webhookDelivery.endpointId, input.endpointId),
          eq(webhookDelivery.id, input.id),
        ),
      )
      .for("update", { of: webhookMessage });
    if (!message) return false;
    const [updated] = await tx
      .update(webhookDelivery)
      .set({
        status: "pending",
        nextAttemptAt: new Date(),
        leaseExpiresAt: null,
        // A failed delivery gets exactly one more attempt.
        attemptCount: sql`least(${webhookDelivery.attemptCount}, ${MAX_ATTEMPTS - 1})`,
      })
      .where(
        and(
          eq(webhookDelivery.organizationId, input.organizationId),
          eq(webhookDelivery.endpointId, input.endpointId),
          eq(webhookDelivery.id, input.id),
          ne(webhookDelivery.status, "pending"),
        ),
      )
      .returning({ id: webhookDelivery.id });
    return Boolean(updated);
  });
}

/**
 * Queues the endpoint's deliveries that failed since `since` for one more attempt each, oldest
 * first, at most `MAX_RECOVER_BATCH` per call (`hasMore` says to call again). Their attempts are
 * spread over the next minute so a recovered receiver isn't hit all at once.
 */
export async function recoverWebhookEndpoint(input: {
  organizationId: string;
  id: string;
  since: Date;
  now?: Date;
  limit?: number;
}): Promise<{ requeued: number; hasMore: boolean }> {
  const now = input.now ?? new Date();
  const limit = Math.min(input.limit ?? MAX_RECOVER_BATCH, MAX_RECOVER_BATCH);
  return db.transaction(async (tx) => {
    const [endpoint] = await tx
      .select({ enabled: webhookEndpoint.enabled })
      .from(webhookEndpoint)
      .where(
        and(
          eq(webhookEndpoint.organizationId, input.organizationId),
          eq(webhookEndpoint.id, input.id),
        ),
      );
    if (!endpoint) throw new WebhookError("not_found", "Webhook endpoint not found.");
    if (!endpoint.enabled) {
      throw new WebhookError(
        "endpoint_disabled",
        "Enable the endpoint before recovering its failed deliveries.",
      );
    }
    const failed = await tx
      .select({ id: webhookDelivery.id, messageId: webhookDelivery.messageId })
      .from(webhookDelivery)
      .where(
        and(
          eq(webhookDelivery.organizationId, input.organizationId),
          eq(webhookDelivery.endpointId, input.id),
          eq(webhookDelivery.status, "failed"),
          gte(webhookDelivery.createdAt, input.since),
        ),
      )
      .orderBy(asc(webhookDelivery.createdAt), asc(webhookDelivery.id))
      .limit(limit + 1);
    const batch = failed.slice(0, limit);
    if (batch.length === 0) return { requeued: 0, hasMore: false };
    // Serialize with retention on the parents (in id order, like every other locker), so a purge
    // can't delete a delivery this call requeues.
    await tx
      .select({ id: webhookMessage.id })
      .from(webhookMessage)
      .where(
        and(
          eq(webhookMessage.organizationId, input.organizationId),
          inArray(webhookMessage.id, [...new Set(batch.map((row) => row.messageId))]),
        ),
      )
      .orderBy(asc(webhookMessage.id))
      .for("update");
    const requeued = await tx
      .update(webhookDelivery)
      .set({
        status: "pending",
        nextAttemptAt: sql`${now}::timestamptz + random() * interval '1 minute'`,
        leaseExpiresAt: null,
        // Each gets exactly one more attempt.
        attemptCount: sql`least(${webhookDelivery.attemptCount}, ${MAX_ATTEMPTS - 1})`,
      })
      .where(
        and(
          eq(webhookDelivery.organizationId, input.organizationId),
          eq(webhookDelivery.endpointId, input.id),
          eq(webhookDelivery.status, "failed"),
          inArray(
            webhookDelivery.id,
            batch.map((row) => row.id),
          ),
        ),
      )
      .returning({ id: webhookDelivery.id });
    return { requeued: requeued.length, hasMore: failed.length > limit };
  });
}
