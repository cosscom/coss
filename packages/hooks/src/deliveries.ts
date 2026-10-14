/** The delivery log: deliveries per endpoint or message, their attempts, and manual retries. */
import { db, schema } from "@coss/db";
import { ID_PREFIXES } from "@coss/db/id";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { cursorOf, type HookMessageRow } from "./messages.ts";
import {
  DEFAULT_LIST_LIMIT,
  type HookAttemptObjectOutput,
  type HookDeliveryObjectOutput,
  type HookDeliveryStatus,
  MAX_LIST_LIMIT,
} from "./schemas.ts";

const { hookAttempt, hookDelivery } = schema;

export type HookDeliveryRow = typeof hookDelivery.$inferSelect;
export type HookAttemptRow = typeof hookAttempt.$inferSelect;

/** Attempts a delivery gets on its own: the first, then one after each retry delay. */
export const HOOK_MAX_ATTEMPTS = 8;

export function toHookDeliveryObject(row: HookDeliveryRow): HookDeliveryObjectOutput {
  return {
    object: "hook_delivery",
    id: row.id,
    application_id: row.applicationId,
    message_id: row.messageId,
    endpoint_id: row.endpointId,
    status: row.status,
    attempt_count: row.attemptCount,
    next_attempt_at: row.nextAttemptAt?.toISOString() ?? null,
    last_status_code: row.lastStatusCode,
    last_error: row.lastError,
    created_at: row.messageCreatedAt.toISOString(),
    finished_at: row.finishedAt?.toISOString() ?? null,
  };
}

export function toHookAttemptObject(row: HookAttemptRow): HookAttemptObjectOutput {
  return {
    object: "hook_attempt",
    id: row.id,
    delivery_id: row.deliveryId,
    endpoint_id: row.endpointId,
    attempted_at: row.attemptedAt.toISOString(),
    status_code: row.statusCode,
    duration_ms: row.durationMs,
    error: row.error,
    response_excerpt: row.responseExcerpt,
  };
}

/** One page of deliveries, newest first, of an endpoint (`endpointId`) or an application. */
export async function pageHookDeliveries(input: {
  organizationId: string;
  applicationId: string;
  endpointId?: string;
  status?: HookDeliveryStatus;
  limit?: number;
  after?: string;
}): Promise<{ deliveries: HookDeliveryRow[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
  const cursor =
    input.after === undefined ? undefined : cursorOf(ID_PREFIXES.hookDelivery, input.after);
  if (cursor === null) return { deliveries: [], hasMore: false };
  const rows = await db
    .select()
    .from(hookDelivery)
    .where(
      and(
        eq(hookDelivery.organizationId, input.organizationId),
        eq(hookDelivery.applicationId, input.applicationId),
        input.endpointId === undefined ? undefined : eq(hookDelivery.endpointId, input.endpointId),
        input.status === undefined ? undefined : eq(hookDelivery.status, input.status),
        cursor === undefined
          ? undefined
          : sql`(${hookDelivery.messageCreatedAt}, ${hookDelivery.id}) < (${cursor.createdAt}, ${cursor.id})`,
        cursor === undefined
          ? undefined
          : sql`${hookDelivery.messageCreatedAt} <= ${cursor.createdAt}`,
      ),
    )
    .orderBy(desc(hookDelivery.messageCreatedAt), desc(hookDelivery.id))
    .limit(limit + 1);
  return { deliveries: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** The message's deliveries, one per endpoint it went to. */
export async function listMessageDeliveries(input: {
  organizationId: string;
  message: HookMessageRow;
}): Promise<HookDeliveryRow[]> {
  return db
    .select()
    .from(hookDelivery)
    .where(
      and(
        eq(hookDelivery.messageCreatedAt, input.message.createdAt),
        eq(hookDelivery.messageId, input.message.id),
        eq(hookDelivery.organizationId, input.organizationId),
      ),
    )
    .orderBy(asc(hookDelivery.id));
}

/** The application's delivery `id`; `null` for an unknown id or another application's. */
export async function getHookDelivery(input: {
  organizationId: string;
  applicationId: string;
  id: string;
}): Promise<HookDeliveryRow | null> {
  const cursor = cursorOf(ID_PREFIXES.hookDelivery, input.id);
  if (!cursor) return null;
  const [row] = await db
    .select()
    .from(hookDelivery)
    .where(
      and(
        eq(hookDelivery.messageCreatedAt, cursor.createdAt),
        eq(hookDelivery.id, input.id),
        eq(hookDelivery.organizationId, input.organizationId),
        eq(hookDelivery.applicationId, input.applicationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Every HTTP attempt of the delivery, oldest first. */
export async function listHookAttempts(delivery: HookDeliveryRow): Promise<HookAttemptRow[]> {
  return db
    .select()
    .from(hookAttempt)
    .where(
      and(
        eq(hookAttempt.messageCreatedAt, delivery.messageCreatedAt),
        eq(hookAttempt.deliveryId, delivery.id),
        eq(hookAttempt.organizationId, delivery.organizationId),
      ),
    )
    .orderBy(asc(hookAttempt.attemptedAt), asc(hookAttempt.id));
}

/**
 * Queues a finished delivery for one more attempt now (a pending one is left as it is). Returns the
 * delivery as it is afterwards; `null` when there is none.
 */
export async function retryHookDelivery(input: {
  organizationId: string;
  applicationId: string;
  id: string;
  now?: Date;
}): Promise<HookDeliveryRow | null> {
  const cursor = cursorOf(ID_PREFIXES.hookDelivery, input.id);
  if (!cursor) return null;
  const where = and(
    eq(hookDelivery.messageCreatedAt, cursor.createdAt),
    eq(hookDelivery.id, input.id),
    eq(hookDelivery.organizationId, input.organizationId),
    eq(hookDelivery.applicationId, input.applicationId),
  );
  const [retried] = await db
    .update(hookDelivery)
    .set({
      status: "pending",
      nextAttemptAt: input.now ?? new Date(),
      leaseExpiresAt: null,
      finishedAt: null,
      // Exactly one more attempt.
      attemptCount: sql`least(${hookDelivery.attemptCount}, ${HOOK_MAX_ATTEMPTS - 1})`,
    })
    .where(and(where, ne(hookDelivery.status, "pending")))
    .returning();
  if (retried) return retried;
  const [unchanged] = await db.select().from(hookDelivery).where(where).limit(1);
  return unchanged ?? null;
}
