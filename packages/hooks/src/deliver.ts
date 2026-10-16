/**
 * Delivery of Hooks messages (run by the worker). System-level: the scan spans organizations, and
 * every write is scoped by the delivery's own organization. Built on `@coss/webhooks/engine`.
 */
import { db, type Executor, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { recordOrgAuditEvent } from "@coss/logs";
import { enqueuePush } from "@coss/push";
import { enqueueWebhookMessage, signatureHeaders, type WebhookSender } from "@coss/webhooks";
import {
  type AttemptResult,
  type DeliveryOutcome,
  DISABLE_FAILING_ENDPOINT_AFTER_MS,
  deliveryOutcome,
  endpointHealth,
  HOUR,
  leaseUntil,
  MINUTE,
  runClaimed,
  SECOND,
  sendAttempt,
  stillOwned,
} from "@coss/webhooks/engine";
import type { StoredHookEndpointWebhookEvent } from "@coss/webhooks/schemas";
import { and, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type { HookDeliveryRow } from "./deliveries.ts";
import { type HookEndpointRow, hookSigningSecrets } from "./endpoints.ts";
import { type HookMessageRow, hookMessagesByIds } from "./messages.ts";
import type { HookManagementDeps } from "./shared.ts";

const { hookApplication, hookAttempt, hookDelivery, hookEndpoint } = schema;

/** Wait before each retry: 8 attempts over roughly 28 hours (shortened by up to 10% of jitter). */
export const HOOK_RETRY_DELAYS_MS = [
  5 * SECOND,
  5 * MINUTE,
  30 * MINUTE,
  2 * HOUR,
  5 * HOUR,
  10 * HOUR,
  10 * HOUR,
];
export const HOOK_TIMEOUT_MS = 15 * SECOND;
/** Endpoints that have been failing get less of the worker's time. */
export const FAILING_ENDPOINT_TIMEOUT_MS = 5 * SECOND;
/** At most this many deliveries of one endpoint per claimed batch (and so in flight per worker). */
export const MAX_IN_FLIGHT_PER_ENDPOINT = 10;
export const HOOK_USER_AGENT = "COSS-Hooks/1.0";
/** How long the deliveries of a suspended or deleting organization are put off at a time. */
export const HELD_DELIVERY_DELAY_MS = HOUR;

/**
 * Charges the attempt to the rate limits (per endpoint, per organization and destination host);
 * when denied, the delivery is put off by `retryAfterMs` without counting an attempt.
 */
export type HookThrottle = (input: {
  organizationId: string;
  endpointId: string;
  host: string;
  rateLimitPerSecond: number | null;
}) => Promise<{ allowed: true } | { allowed: false; retryAfterMs: number }>;

/** A delivery that finished (succeeded, or failed for good). */
export type FinishedHookDelivery = {
  organizationId: string;
  environmentId: string;
  endpointId: string;
  succeeded: boolean;
};

export type HookDeliveryDeps = Pick<HookManagementDeps, "secretsKeys"> & {
  send: WebhookSender;
  throttle?: HookThrottle;
  timeoutMs?: number;
  /** Retry jitter (`Math.random` by default; tests pass `() => 0`). */
  random?: () => number;
  /** How long an endpoint fails before it is disabled (tests shorten it). */
  disableAfterMs?: number;
  /** Called once per run with the deliveries that finished (the worker: reputation counts). */
  onFinished?: (finished: FinishedHookDelivery[]) => Promise<void>;
};

/** Raw rows (from `db.execute`) carry timestamps as Postgres text. */
type RawTimestamp = string | Date;

function timestamp(value: RawTimestamp): Date;
function timestamp(value: RawTimestamp | null): Date | null;
function timestamp(value: RawTimestamp | null): Date | null {
  if (value === null || value instanceof Date) return value;
  // `2026-10-14 12:00:00.123+00` → ISO 8601.
  return new Date(value.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));
}

type RawDelivery = {
  id: string;
  message_created_at: RawTimestamp;
  organization_id: string;
  environment_id: string;
  application_id: string;
  message_id: string;
  endpoint_id: string;
  status: HookDeliveryRow["status"];
  attempt_count: number;
  next_attempt_at: RawTimestamp | null;
  lease_expires_at: RawTimestamp | null;
  last_status_code: number | null;
  last_error: string | null;
  finished_at: RawTimestamp | null;
  updated_at: RawTimestamp;
};

function fromRaw(row: RawDelivery): HookDeliveryRow {
  return {
    id: row.id,
    messageCreatedAt: timestamp(row.message_created_at),
    organizationId: row.organization_id,
    environmentId: row.environment_id,
    applicationId: row.application_id,
    messageId: row.message_id,
    endpointId: row.endpoint_id,
    status: row.status,
    attemptCount: row.attempt_count,
    nextAttemptAt: timestamp(row.next_attempt_at),
    leaseExpiresAt: timestamp(row.lease_expires_at),
    lastStatusCode: row.last_status_code,
    lastError: row.last_error,
    finishedAt: timestamp(row.finished_at),
    updatedAt: timestamp(row.updated_at),
  };
}

/**
 * Leases up to `limit` due deliveries (`FOR UPDATE SKIP LOCKED`), at most
 * `MAX_IN_FLIGHT_PER_ENDPOINT` of any one endpoint, so one slow endpoint can't take every slot.
 * Organizations that are suspended or being deleted are skipped (their due deliveries are put off
 * by `parkHeldHookDeliveries`, so they never pile up at the head of the queue).
 */
async function claimDue(
  now: Date,
  limit: number,
  scope?: { organizationIds: string[] },
): Promise<HookDeliveryRow[]> {
  const lease = leaseUntil(now);
  const scoped = scope
    ? sql`and d.organization_id = any(${sql.param(scope.organizationIds)}::text[])`
    : sql``;
  const result = await db.execute<RawDelivery>(sql`
    with candidates as (
      select d.message_created_at, d.id, d.endpoint_id, d.next_attempt_at
      from hook_delivery d
      where d.status = 'pending'
        and d.next_attempt_at <= ${now}
        and (d.lease_expires_at is null or d.lease_expires_at < ${now})
        ${scoped}
        and not exists (
          select 1 from organization_suspension s where s.organization_id = d.organization_id
        )
        and not exists (
          select 1 from organization_deletion x
          where x.organization_id = d.organization_id and x.status = 'pending'
        )
      order by d.next_attempt_at
      limit ${limit * 4}
    ), picked as (
      select message_created_at, id, next_attempt_at from (
        select message_created_at, id, next_attempt_at,
          row_number() over (partition by endpoint_id order by next_attempt_at) as rank
        from candidates
      ) ranked
      where rank <= ${MAX_IN_FLIGHT_PER_ENDPOINT}
      order by next_attempt_at
      limit ${limit}
    ), locked as (
      select d.message_created_at, d.id
      from hook_delivery d
      join picked p on p.message_created_at = d.message_created_at and p.id = d.id
      where d.status = 'pending'
        and (d.lease_expires_at is null or d.lease_expires_at < ${now})
      for update of d skip locked
    )
    update hook_delivery d
    set lease_expires_at = ${lease}
    from locked
    where d.message_created_at = locked.message_created_at and d.id = locked.id
    returning d.*
  `);
  return result.rows.map(fromRaw);
}

/** The delivery, while this worker still holds the lease it claimed it with. */
function owned(delivery: HookDeliveryRow) {
  return and(
    eq(hookDelivery.messageCreatedAt, delivery.messageCreatedAt),
    eq(hookDelivery.id, delivery.id),
    eq(hookDelivery.organizationId, delivery.organizationId),
    stillOwned(hookDelivery, delivery.leaseExpiresAt),
  );
}

async function failWithoutAttempt(delivery: HookDeliveryRow, now: Date, reason: string) {
  await db
    .update(hookDelivery)
    .set({
      status: "failed",
      nextAttemptAt: null,
      leaseExpiresAt: null,
      lastError: reason,
      finishedAt: now,
    })
    .where(owned(delivery));
}

async function attempt(
  delivery: HookDeliveryRow,
  target: { message?: HookMessageRow; endpoint?: HookEndpointRow },
  now: Date,
  deps: HookDeliveryDeps,
): Promise<FinishedHookDelivery | null> {
  const { message, endpoint } = target;
  if (!message) {
    await failWithoutAttempt(delivery, now, "The message no longer exists.");
    return null;
  }
  if (!endpoint) {
    await failWithoutAttempt(delivery, now, "The endpoint was deleted.");
    return null;
  }
  if (!endpoint.enabled) {
    await failWithoutAttempt(delivery, now, "The endpoint is disabled.");
    return null;
  }
  if (deps.throttle) {
    const decision = await deps.throttle({
      organizationId: delivery.organizationId,
      endpointId: endpoint.id,
      host: new URL(endpoint.url).hostname.toLowerCase(),
      rateLimitPerSecond: endpoint.rateLimitPerSecond,
    });
    if (!decision.allowed) {
      const wait = Math.min(Math.max(decision.retryAfterMs, 250), MINUTE);
      await db
        .update(hookDelivery)
        .set({ nextAttemptAt: new Date(now.getTime() + wait), leaseExpiresAt: null })
        .where(owned(delivery));
      return null;
    }
  }

  // The payload as stored, serialized once: these bytes are signed and sent.
  const body = JSON.stringify(message.payload);
  const result = await sendAttempt(deps.send, {
    url: endpoint.url,
    headers: {
      ...signatureHeaders({
        secrets: hookSigningSecrets(endpoint, deps, now),
        id: message.id,
        timestamp: Math.floor(now.getTime() / 1000),
        body,
      }),
      "coss-event-type": message.eventType,
    },
    body,
    timeoutMs:
      deps.timeoutMs ?? (endpoint.failingSince ? FAILING_ENDPOINT_TIMEOUT_MS : HOOK_TIMEOUT_MS),
    userAgent: HOOK_USER_AGENT,
  });
  const outcome = deliveryOutcome({
    attemptCount: delivery.attemptCount,
    succeeded: result.succeeded,
    schedule: HOOK_RETRY_DELAYS_MS,
    now,
    random: deps.random ?? Math.random,
  });
  return db.transaction(async (tx) => {
    // Fenced first: a worker whose lease expired (and was taken over) records nothing.
    const [finished] = await tx
      .update(hookDelivery)
      .set({
        status: outcome.status,
        attemptCount: outcome.attemptCount,
        nextAttemptAt: outcome.nextAttemptAt,
        leaseExpiresAt: null,
        lastStatusCode: result.statusCode,
        lastError: result.error,
        finishedAt: outcome.status === "pending" ? null : now,
      })
      .where(owned(delivery))
      .returning({ id: hookDelivery.id });
    if (!finished) return null;
    await tx.insert(hookAttempt).values(attemptRow(delivery, now, result));
    await updateEndpointHealth(tx, endpoint, outcome, now, deps);
    return outcome.status === "pending"
      ? null
      : {
          organizationId: delivery.organizationId,
          environmentId: delivery.environmentId,
          endpointId: endpoint.id,
          succeeded: outcome.status === "succeeded",
        };
  });
}

function attemptRow(delivery: HookDeliveryRow, now: Date, result: AttemptResult) {
  return {
    id: newId(ID_PREFIXES.hookAttempt, delivery.messageCreatedAt.getTime()),
    messageCreatedAt: delivery.messageCreatedAt,
    organizationId: delivery.organizationId,
    environmentId: delivery.environmentId,
    applicationId: delivery.applicationId,
    deliveryId: delivery.id,
    endpointId: delivery.endpointId,
    attemptedAt: now,
    statusCode: result.statusCode,
    durationMs: result.durationMs,
    error: result.error,
    responseExcerpt: result.responseExcerpt,
  };
}

/**
 * Tracks the endpoint's failure streak (writing only when it changes, so a healthy endpoint is never
 * written per delivery) and disables an endpoint that has been failing for too long.
 */
async function updateEndpointHealth(
  tx: Executor,
  endpoint: HookEndpointRow,
  outcome: DeliveryOutcome,
  now: Date,
  deps: HookDeliveryDeps,
): Promise<void> {
  const disableAfterMs = deps.disableAfterMs ?? DISABLE_FAILING_ENDPOINT_AFTER_MS;
  const change = endpointHealth({
    failingSince: endpoint.failingSince,
    succeeded: outcome.status === "succeeded",
    final: outcome.status !== "pending",
    now,
    disableAfterMs,
  });
  const ours = and(
    eq(hookEndpoint.id, endpoint.id),
    eq(hookEndpoint.organizationId, endpoint.organizationId),
  );
  switch (change.kind) {
    case "none":
      return;
    case "recovered":
      await tx
        .update(hookEndpoint)
        .set({ failingSince: null, updatedAt: sql`${hookEndpoint.updatedAt}` })
        .where(and(ours, isNotNull(hookEndpoint.failingSince)));
      return;
    case "failing":
      await tx
        .update(hookEndpoint)
        .set({ failingSince: change.since, updatedAt: sql`${hookEndpoint.updatedAt}` })
        .where(and(ours, isNull(hookEndpoint.failingSince)));
      return;
    case "disable": {
      // Re-checked here: a success may have cleared the streak since the endpoint was read.
      const [disabled] = await tx
        .update(hookEndpoint)
        .set({ enabled: false, disabledReason: "failing", disabledAt: now })
        .where(
          and(
            ours,
            eq(hookEndpoint.enabled, true),
            lte(hookEndpoint.failingSince, new Date(now.getTime() - disableAfterMs)),
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
          action: "hook_endpoint.disabled",
          target: { type: "hook_endpoint", id: disabled.id, label: disabled.url },
          metadata: {
            reason: "failing",
            application_id: disabled.applicationId,
            failing_since: change.failingSince.toISOString(),
          },
        },
        tx,
      );
      await announceEndpointDisabled(tx, disabled, change.failingSince, now);
      await enqueuePush(tx, {
        organizationId: disabled.organizationId,
        environmentId: disabled.environmentId,
        kind: "hook_endpoint_disabled",
        subjectId: disabled.id,
        now,
      });
      return;
    }
  }
}

/**
 * Tells the customer, through their own webhook endpoints (`hook_endpoint.disabled`), that one of
 * their applications' endpoints was disabled; in the transaction that disabled it.
 */
async function announceEndpointDisabled(
  tx: Executor,
  endpoint: HookEndpointRow,
  failingSince: Date,
  now: Date,
): Promise<void> {
  const [application] = await tx
    .select({ uid: hookApplication.uid })
    .from(hookApplication)
    .where(
      and(
        eq(hookApplication.id, endpoint.applicationId),
        eq(hookApplication.organizationId, endpoint.organizationId),
      ),
    );
  const id = newId(ID_PREFIXES.webhookEvent);
  const payload: StoredHookEndpointWebhookEvent = {
    id,
    object: "event",
    type: "hook_endpoint.disabled",
    created_at: now.toISOString(),
    data: {
      application_id: endpoint.applicationId,
      application_uid: application?.uid ?? null,
      endpoint_id: endpoint.id,
      url: endpoint.url,
      failing_since: failingSince.toISOString(),
      occurred_at: now.toISOString(),
    },
  };
  await enqueueWebhookMessage(tx, {
    id,
    organizationId: endpoint.organizationId,
    environmentId: endpoint.environmentId,
    type: payload.type,
    payload,
    now,
  });
}

/**
 * Attempts due deliveries (up to `limit`, `concurrency` at a time). `scope` limits the scan to some
 * organizations (tests). Returns how many were claimed.
 */
export async function runDueHookDeliveries(
  opts: {
    now?: Date;
    limit?: number;
    concurrency?: number;
    scope?: { organizationIds: string[] };
  },
  deps: HookDeliveryDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 200;
  const claimed = await claimDue(now, limit, opts.scope);
  if (claimed.length === 0) return 0;
  const organizationIds = [...new Set(claimed.map((delivery) => delivery.organizationId))];
  const [messages, endpoints] = await Promise.all([
    hookMessagesByIds(
      organizationIds,
      claimed.map((delivery) => ({ id: delivery.messageId, createdAt: delivery.messageCreatedAt })),
    ),
    db
      .select()
      .from(hookEndpoint)
      .where(
        and(
          inArray(hookEndpoint.organizationId, organizationIds),
          inArray(hookEndpoint.id, [...new Set(claimed.map((delivery) => delivery.endpointId))]),
        ),
      ),
  ]);
  const messageById = new Map(messages.map((message) => [message.id, message]));
  const endpointById = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]));
  const finished: FinishedHookDelivery[] = [];
  await runClaimed(
    claimed,
    {
      concurrency: opts.concurrency ?? 100,
      label: (delivery) => `[hooks] delivery ${delivery.id}`,
    },
    async (delivery) => {
      const done = await attempt(
        delivery,
        {
          message: messageById.get(delivery.messageId),
          endpoint: endpointById.get(delivery.endpointId),
        },
        now,
        deps,
      );
      if (done) finished.push(done);
    },
    // Release the lease; the delivery is retried when it falls due again.
    (delivery) => db.update(hookDelivery).set({ leaseExpiresAt: null }).where(owned(delivery)),
  );
  if (finished.length > 0 && deps.onFinished) {
    await deps.onFinished(finished).catch((error: unknown) => {
      console.error("[hooks] recording finished deliveries failed:", error);
    });
  }
  return claimed.length;
}

/**
 * Puts off the due deliveries of suspended or deleting organizations by `HELD_DELIVERY_DELAY_MS`
 * (in batches), so a held backlog never sits at the head of the delivery queue. Returns how many.
 */
export async function parkHeldHookDeliveries(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const scoped = opts.scope
    ? sql`and d.organization_id = any(${sql.param(opts.scope.organizationIds)}::text[])`
    : sql``;
  const result = await db.execute(sql`
    with held as (
      select d.message_created_at, d.id
      from hook_delivery d
      where d.status = 'pending'
        and d.next_attempt_at <= ${now}
        and (d.lease_expires_at is null or d.lease_expires_at < ${now})
        ${scoped}
        and (
          exists (select 1 from organization_suspension s where s.organization_id = d.organization_id)
          or exists (
            select 1 from organization_deletion x
            where x.organization_id = d.organization_id and x.status = 'pending'
          )
        )
      limit ${opts.limit ?? 5000}
      for update of d skip locked
    )
    update hook_delivery d
    set next_attempt_at = ${new Date(now.getTime() + HELD_DELIVERY_DELAY_MS)}
    from held
    where d.message_created_at = held.message_created_at and d.id = held.id
  `);
  return result.rowCount ?? 0;
}
