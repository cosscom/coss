/**
 * Delivery of queued webhook messages (run by the worker). System-level: the scan spans
 * organizations, and every write is scoped by the delivery's own organization.
 */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, eq, inArray, isNull, lt, lte, ne, notExists, or, sql } from "drizzle-orm";
import { decryptSecret } from "./secrets.ts";
import { DEFAULT_TIMEOUT_MS, type WebhookSender } from "./sender.ts";
import { signatureHeaders } from "./signing.ts";

const { organizationSuspension, webhookAttempt, webhookDelivery, webhookEndpoint, webhookMessage } =
  schema;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

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
const LEASE_MS = 2 * MINUTE;
const ERROR_MAX_LENGTH = 500;

export type WebhookDeliveryDeps = {
  secretsKey: Buffer;
  send: WebhookSender;
  timeoutMs?: number;
};

type Claimed = typeof webhookDelivery.$inferSelect;

/**
 * Leases due deliveries (`FOR UPDATE SKIP LOCKED`), so concurrent workers never share one.
 * Deliveries of suspended organizations are held (not failed) and resume once it is lifted.
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
        notExists(
          db
            .select({ one: sql`1` })
            .from(organizationSuspension)
            .where(eq(organizationSuspension.organizationId, webhookDelivery.organizationId)),
        ),
      ),
    )
    .orderBy(asc(webhookDelivery.nextAttemptAt))
    .limit(limit)
    .for("update", { skipLocked: true });
  return db
    .update(webhookDelivery)
    .set({ leaseExpiresAt: new Date(now.getTime() + LEASE_MS) })
    .where(inArray(webhookDelivery.id, due))
    .returning();
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, ERROR_MAX_LENGTH) || "Request failed.";
}

async function attempt(delivery: Claimed, now: Date, deps: WebhookDeliveryDeps): Promise<void> {
  const [target] = await db
    .select({ endpoint: webhookEndpoint, payload: webhookMessage.payload })
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
  const ours = and(
    eq(webhookDelivery.id, delivery.id),
    eq(webhookDelivery.organizationId, delivery.organizationId),
  );
  if (!target?.endpoint.enabled) {
    await db
      .update(webhookDelivery)
      .set({
        status: "failed",
        nextAttemptAt: null,
        leaseExpiresAt: null,
        lastError: "The endpoint is disabled.",
      })
      .where(ours);
    return;
  }

  const body = JSON.stringify(target.payload);
  const headers = signatureHeaders({
    secret: decryptSecret(target.endpoint.secretCiphertext, deps.secretsKey),
    id: delivery.messageId,
    timestamp: Math.floor(now.getTime() / 1000),
    body,
  });
  const started = performance.now();
  let statusCode: number | null = null;
  let responseExcerpt: string | null = null;
  let error: string | null = null;
  try {
    const response = await deps.send({
      url: target.endpoint.url,
      headers,
      body,
      timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    statusCode = response.status;
    responseExcerpt = response.body || null;
    if (statusCode < 200 || statusCode >= 300) error = `HTTP ${statusCode}`;
  } catch (cause) {
    error = describeError(cause);
  }
  const durationMs = Math.round(performance.now() - started);

  const attempts = delivery.attemptCount + 1;
  const succeeded = error === null;
  const exhausted = attempts >= MAX_ATTEMPTS;
  const retryDelay = RETRY_DELAYS_MS[attempts - 1] ?? 0;
  await db.transaction(async (tx) => {
    await tx.insert(webhookAttempt).values({
      organizationId: delivery.organizationId,
      deliveryId: delivery.id,
      attemptedAt: now,
      statusCode,
      durationMs,
      error,
      responseExcerpt,
    });
    await tx
      .update(webhookDelivery)
      .set({
        status: succeeded ? "succeeded" : exhausted ? "failed" : "pending",
        attemptCount: attempts,
        nextAttemptAt: succeeded || exhausted ? null : new Date(now.getTime() + retryDelay),
        leaseExpiresAt: null,
        lastStatusCode: statusCode,
        lastError: error,
      })
      .where(ours);
  });
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
  const claimed = await claimDue(now, opts.limit ?? 20, opts.scope);
  await Promise.all(
    claimed.map((delivery) =>
      attempt(delivery, now, deps).catch(async (error: unknown) => {
        console.error(`[webhooks] delivery ${delivery.id} failed unexpectedly:`, error);
        // Release the lease; the delivery is retried when it falls due again.
        await db
          .update(webhookDelivery)
          .set({ leaseExpiresAt: null })
          .where(eq(webhookDelivery.id, delivery.id));
      }),
    ),
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
  const [updated] = await db
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
}
