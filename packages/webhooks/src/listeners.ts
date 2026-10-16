/**
 * Webhook listeners: how `coss listen` receives an environment's events on a laptop. COSS can't
 * POST to `localhost`, so a listener is a temporary subscriber whose deliveries the CLI pulls with
 * long polls, forwards to the local URL (signing them itself, with its own secret) and
 * acknowledges in its next poll. Fan-out is the outbox's (`enqueueWebhookMessage`); the worker
 * never sees listener deliveries, and endpoints (limits, health, the endpoint API) never see
 * listeners.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { appendLogEntries, type LogEntryInput } from "@coss/logs";
import { versioning as apiVersioning, type Versioning } from "@coss/versioning";
import { and, asc, count, eq, gt, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { renderWebhookPayload } from "./deliver.ts";
import { leaseUntil, MINUTE, SECOND, stillOwned } from "./engine/index.ts";
import { WebhookError } from "./errors.ts";
import {
  DEFAULT_LISTENER_POLL_LIMIT,
  DEFAULT_LISTENER_WAIT_MS,
  MAX_LISTENER_POLL_LIMIT,
  MAX_LISTENER_WAIT_MS,
  type WebhookListenerDeliveryObjectOutput,
  type WebhookListenerObjectOutput,
} from "./schemas.ts";

const { environment, webhookListener, webhookListenerDelivery, webhookMessage } = schema;

/** A listener nobody polled for this long expires. */
export const LISTENER_IDLE_TTL_MS = 10 * MINUTE;
export const MAX_LISTENERS_PER_ENVIRONMENT = 5;
/** A delivery handed out this many times without an acknowledgement fails. */
export const MAX_HAND_OUTS = 5;
const POLL_INTERVAL_MS = SECOND;
const NOT_ACKNOWLEDGED_ERROR = "The CLI never acknowledged it.";

export type WebhookListenerRow = typeof webhookListener.$inferSelect;
type ListenerDeliveryRow = typeof webhookListenerDelivery.$inferSelect;

export type WebhookListenerAck = {
  deliveryId: string;
  ackToken: string;
  /** The local URL's status; `null` when nothing answered or nothing was forwarded. */
  statusCode: number | null;
  durationMs: number;
  /** Why forwarding failed; `null` when it didn't. */
  error: string | null;
};

function checkedApiVersion(value: string, versioning: Versioning): string {
  if (!versioning.isVersion(value)) {
    throw new WebhookError(
      "invalid_api_version",
      `Unknown API version ${value}. Known versions: ${versioning.versions.join(", ")}.`,
    );
  }
  return value;
}

function ours(input: { organizationId: string; environmentId: string; id: string }) {
  return and(
    eq(webhookListener.organizationId, input.organizationId),
    eq(webhookListener.environmentId, input.environmentId),
    eq(webhookListener.id, input.id),
  );
}

/**
 * Opens a listener. It receives the events created from now on (subscribed by `eventTypes`; empty:
 * every type) while it is polled. At most `MAX_LISTENERS_PER_ENVIRONMENT` are open at once; they
 * don't count toward the plan's webhook endpoints.
 */
export async function createWebhookListener(input: {
  organizationId: string;
  environmentId: string;
  apiVersion: string;
  eventTypes: string[];
  description?: string | null;
  apiKeyId?: string | null;
  now?: Date;
  versioning?: Versioning;
}): Promise<WebhookListenerRow> {
  const now = input.now ?? new Date();
  const apiVersion = checkedApiVersion(input.apiVersion, input.versioning ?? apiVersioning);
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
  const [open] = await db
    .select({ value: count() })
    .from(webhookListener)
    .where(
      and(
        eq(webhookListener.organizationId, input.organizationId),
        eq(webhookListener.environmentId, input.environmentId),
        gt(webhookListener.expiresAt, now),
      ),
    );
  if ((open?.value ?? 0) >= MAX_LISTENERS_PER_ENVIRONMENT) {
    throw new WebhookError(
      "too_many_listeners",
      `An environment can have at most ${MAX_LISTENERS_PER_ENVIRONMENT} open listeners. Stop ` +
        "another `coss listen`, or wait for an abandoned one to expire (10 minutes).",
    );
  }
  const [listener] = await db
    .insert(webhookListener)
    .values({
      organizationId: input.organizationId,
      projectId: env.projectId,
      environmentId: input.environmentId,
      apiVersion,
      eventTypes: [...new Set(input.eventTypes)].sort(),
      description: input.description?.trim() || null,
      createdByApiKeyId: input.apiKeyId ?? null,
      lastPolledAt: now,
      expiresAt: new Date(now.getTime() + LISTENER_IDLE_TTL_MS),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!listener) throw new Error("Webhook listener insert returned no row.");
  return listener;
}

/** Keeps an open listener alive; `null` when it is unknown, expired or closed. */
export async function touchWebhookListener(input: {
  organizationId: string;
  environmentId: string;
  id: string;
  now?: Date;
}): Promise<WebhookListenerRow | null> {
  if (!isId("whlis", input.id)) return null;
  const now = input.now ?? new Date();
  const [listener] = await db
    .update(webhookListener)
    .set({
      lastPolledAt: now,
      expiresAt: new Date(now.getTime() + LISTENER_IDLE_TTL_MS),
      updatedAt: now,
    })
    .where(and(ours(input), gt(webhookListener.expiresAt, now)))
    .returning();
  return listener ?? null;
}

/**
 * Closes an open listener: it receives nothing more. Soft (it expires now), so an event being
 * fanned out concurrently never fails on it; the retention purge deletes it. `false` when it is
 * unknown, expired or already closed.
 */
export async function closeWebhookListener(input: {
  organizationId: string;
  environmentId: string;
  id: string;
  now?: Date;
}): Promise<boolean> {
  if (!isId("whlis", input.id)) return false;
  const now = input.now ?? new Date();
  const closed = await db
    .update(webhookListener)
    .set({ expiresAt: now, updatedAt: now })
    .where(and(ours(input), gt(webhookListener.expiresAt, now)))
    .returning({ id: webhookListener.id });
  return closed.length > 0;
}

/** The environment's open listeners (the dashboard's webhooks page). */
export async function listOpenWebhookListeners(input: {
  organizationId: string;
  environmentId: string;
  now?: Date;
}): Promise<WebhookListenerRow[]> {
  return db
    .select()
    .from(webhookListener)
    .where(
      and(
        eq(webhookListener.organizationId, input.organizationId),
        eq(webhookListener.environmentId, input.environmentId),
        gt(webhookListener.expiresAt, input.now ?? new Date()),
      ),
    )
    .orderBy(asc(webhookListener.createdAt), asc(webhookListener.id));
}

/** The lease a delivery was handed out with, as the opaque token its acknowledgement returns. */
function ackTokenOf(lease: Date): string {
  return lease.getTime().toString(36);
}

function leaseOf(token: string): Date | null {
  if (!/^[0-9a-z]{1,12}$/.test(token)) return null;
  const ms = Number.parseInt(token, 36);
  return Number.isSafeInteger(ms) ? new Date(ms) : null;
}

/**
 * Records what the CLI reported for deliveries it was handed out. Fenced by the lease: an
 * acknowledgement from a poll whose lease expired (the delivery was handed out again) records
 * nothing. Writes one `webhook.forward` log line per acknowledged delivery. Returns how many
 * matched.
 */
export async function ackWebhookListenerDeliveries(
  tx: Executor,
  input: { listener: WebhookListenerRow; acks: readonly WebhookListenerAck[]; now?: Date },
): Promise<number> {
  const now = input.now ?? new Date();
  const { listener } = input;
  const finished: { row: ListenerDeliveryRow; ack: WebhookListenerAck }[] = [];
  const seen = new Set<string>();
  for (const ack of input.acks) {
    const lease = leaseOf(ack.ackToken);
    if (!lease || seen.has(ack.deliveryId) || !isId("whlisdel", ack.deliveryId)) continue;
    seen.add(ack.deliveryId);
    const succeeded =
      ack.error === null &&
      (ack.statusCode === null || (ack.statusCode >= 200 && ack.statusCode < 300));
    const [row] = await tx
      .update(webhookListenerDelivery)
      .set({
        status: succeeded ? "succeeded" : "failed",
        leaseExpiresAt: null,
        statusCode: ack.statusCode,
        durationMs: ack.durationMs,
        error: ack.error,
        forwardedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(webhookListenerDelivery.id, ack.deliveryId),
          eq(webhookListenerDelivery.organizationId, listener.organizationId),
          eq(webhookListenerDelivery.listenerId, listener.id),
          stillOwned(webhookListenerDelivery, lease),
        ),
      )
      .returning();
    if (row) finished.push({ row, ack });
  }
  if (finished.length === 0) return 0;

  const messages = await tx
    .select({ id: webhookMessage.id, type: webhookMessage.type, payload: webhookMessage.payload })
    .from(webhookMessage)
    .where(
      and(
        eq(webhookMessage.organizationId, listener.organizationId),
        inArray(
          webhookMessage.id,
          finished.map(({ row }) => row.messageId),
        ),
      ),
    );
  const byId = new Map(messages.map((message) => [message.id, message]));
  await appendLogEntries(
    tx,
    finished.map(({ row, ack }) =>
      forwardLogEntry({ listener, delivery: row, ack, message: byId.get(row.messageId), now }),
    ),
  );
  return finished.length;
}

/** The environment log line (`webhook.forward`) for one delivery the CLI forwarded. */
function forwardLogEntry(input: {
  listener: WebhookListenerRow;
  delivery: ListenerDeliveryRow;
  ack: WebhookListenerAck;
  message: { type: string; payload: unknown } | undefined;
  now: Date;
}): LogEntryInput {
  const { listener, delivery, ack } = input;
  const type = input.message?.type ?? "event";
  // Email events name their email, so the line joins that email's timeline.
  const data = (input.message?.payload as { data?: { email_id?: unknown } } | null)?.data;
  const emailId = typeof data?.email_id === "string" ? data.email_id : null;
  const forwarded = delivery.status === "succeeded";
  const status = ack.statusCode ?? ack.error ?? "printed";
  return {
    organizationId: listener.organizationId,
    projectId: listener.projectId,
    environmentId: listener.environmentId,
    occurredAt: input.now,
    source: "webhook",
    level: forwarded ? "info" : "error",
    type: "webhook.forward",
    message: `${type} → coss listen${listener.description ? ` (${listener.description})` : ""} ${status}`,
    statusCode: ack.statusCode,
    durationMs: ack.durationMs,
    errorCode: forwarded ? null : "webhook_forward_failed",
    resourceType: emailId ? "email" : "webhook_listener",
    resourceId: emailId ?? listener.id,
    searchTerms: [listener.id, delivery.id, delivery.messageId],
    attributes: {
      listener_id: listener.id,
      delivery_id: delivery.id,
      message_id: delivery.messageId,
      event_type: type,
      error: ack.error,
    },
  };
}

/**
 * Hands out up to `limit` of the listener's pending deliveries, oldest first, leased: a delivery
 * whose answer is lost is handed out again once its lease expires (at least once, with the same
 * event id). Deliveries handed out `MAX_HAND_OUTS` times fail instead.
 */
async function claimWebhookListenerDeliveries(input: {
  listener: WebhookListenerRow;
  limit: number;
  now: Date;
  versioning: Versioning;
}): Promise<WebhookListenerDeliveryObjectOutput[]> {
  const { listener, now } = input;
  const free = or(
    isNull(webhookListenerDelivery.leaseExpiresAt),
    lt(webhookListenerDelivery.leaseExpiresAt, now),
  );
  const pending = and(
    eq(webhookListenerDelivery.organizationId, listener.organizationId),
    eq(webhookListenerDelivery.listenerId, listener.id),
    eq(webhookListenerDelivery.status, "pending"),
    free,
  );
  await db
    .update(webhookListenerDelivery)
    .set({ status: "failed", leaseExpiresAt: null, error: NOT_ACKNOWLEDGED_ERROR, updatedAt: now })
    .where(and(pending, gte(webhookListenerDelivery.handedOutCount, MAX_HAND_OUTS)));
  const lease = leaseUntil(now);
  const due = db
    .select({ id: webhookListenerDelivery.id })
    .from(webhookListenerDelivery)
    .where(pending)
    .orderBy(asc(webhookListenerDelivery.createdAt), asc(webhookListenerDelivery.id))
    .limit(input.limit)
    .for("update", { skipLocked: true });
  const claimed = await db
    .update(webhookListenerDelivery)
    .set({
      leaseExpiresAt: lease,
      handedOutCount: sql`${webhookListenerDelivery.handedOutCount} + 1`,
      updatedAt: now,
    })
    .where(inArray(webhookListenerDelivery.id, due))
    .returning();
  if (claimed.length === 0) return [];

  const messages = await db
    .select({
      id: webhookMessage.id,
      type: webhookMessage.type,
      payload: webhookMessage.payload,
    })
    .from(webhookMessage)
    .where(
      and(
        eq(webhookMessage.organizationId, listener.organizationId),
        inArray(
          webhookMessage.id,
          claimed.map((row) => row.messageId),
        ),
      ),
    );
  const byId = new Map(messages.map((message) => [message.id, message]));
  return claimed
    .sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .flatMap((row) => {
      const message = byId.get(row.messageId);
      if (!message) return [];
      return [
        {
          object: "webhook_listener_delivery" as const,
          id: row.id,
          ack_token: ackTokenOf(lease),
          event_id: message.id,
          event_type: message.type,
          attempt: row.handedOutCount,
          // A string, so the response's versioning never rewrites it: these are the bytes to forward.
          body: JSON.stringify(
            renderWebhookPayload(message.payload, listener.apiVersion, input.versioning),
          ),
          created_at: row.createdAt.toISOString(),
        },
      ];
    });
}

/** Resolves after `ms`, or as soon as `signal` aborts. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
  });
}

/**
 * One long poll: records `acks`, keeps the listener alive, then waits up to `waitMs` for
 * deliveries (checking every `intervalMs`, never holding a connection in between) and hands them
 * out. Returns early with nothing when `signal` aborts (the client left, or the API is shutting
 * down). `null` when the listener is unknown, expired or closed.
 */
export async function pollWebhookListener(input: {
  organizationId: string;
  environmentId: string;
  id: string;
  acks?: readonly WebhookListenerAck[];
  waitMs?: number;
  limit?: number;
  signal?: AbortSignal;
  intervalMs?: number;
  clock?: () => Date;
  versioning?: Versioning;
}): Promise<{
  listener: WebhookListenerRow;
  deliveries: WebhookListenerDeliveryObjectOutput[];
  acknowledged: number;
} | null> {
  const clock = input.clock ?? (() => new Date());
  const versioning = input.versioning ?? apiVersioning;
  const started = clock();
  const listener = await touchWebhookListener({ ...input, now: started });
  if (!listener) return null;
  const acks = input.acks ?? [];
  const acknowledged =
    acks.length > 0
      ? await db.transaction((tx) =>
          ackWebhookListenerDeliveries(tx, { listener, acks, now: started }),
        )
      : 0;
  const waitMs = Math.min(
    Math.max(input.waitMs ?? DEFAULT_LISTENER_WAIT_MS, 0),
    MAX_LISTENER_WAIT_MS,
  );
  const limit = Math.min(
    Math.max(input.limit ?? DEFAULT_LISTENER_POLL_LIMIT, 1),
    MAX_LISTENER_POLL_LIMIT,
  );
  const deadline = started.getTime() + waitMs;
  const intervalMs = input.intervalMs ?? POLL_INTERVAL_MS;
  for (;;) {
    const now = clock();
    const deliveries = await claimWebhookListenerDeliveries({ listener, limit, now, versioning });
    const remaining = deadline - clock().getTime();
    if (deliveries.length > 0 || remaining <= 0 || input.signal?.aborted) {
      return { listener, deliveries, acknowledged };
    }
    await sleep(Math.min(intervalMs, remaining), input.signal);
    if (input.signal?.aborted) return { listener, deliveries: [], acknowledged };
  }
}

export function toWebhookListenerObject(row: WebhookListenerRow): WebhookListenerObjectOutput {
  return {
    object: "webhook_listener",
    id: row.id,
    api_version: row.apiVersion,
    event_types: row.eventTypes,
    description: row.description,
    expires_at: row.expiresAt.toISOString(),
    created_at: row.createdAt.toISOString(),
  };
}
