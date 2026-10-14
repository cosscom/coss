/**
 * Endpoint recovery: "send everything that failed since T once more". The request is recorded and
 * the worker requeues the matching deliveries in batches (an endpoint can have millions), oldest
 * first, spread over a minute per batch so a recovered receiver isn't hit all at once.
 */
import { db, schema } from "@coss/db";
import { ID_PREFIXES, isId } from "@coss/db/id";
import { leaseUntil } from "@coss/webhooks/engine";
import { and, asc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { HOOK_MAX_ATTEMPTS } from "./deliveries.ts";
import type { HookEndpointRow } from "./endpoints.ts";
import { HookError } from "./errors.ts";
import type { HookEndpointRecoveryObjectOutput } from "./schemas.ts";

const { hookDelivery, hookEndpointRecovery } = schema;

export type HookEndpointRecoveryRow = typeof hookEndpointRecovery.$inferSelect;

/** Deliveries requeued per batch. */
export const RECOVERY_BATCH = 1000;

export function toHookEndpointRecoveryObject(
  row: HookEndpointRecoveryRow,
): HookEndpointRecoveryObjectOutput {
  return {
    object: "hook_endpoint_recovery",
    id: row.id,
    endpoint_id: row.endpointId,
    since: row.since.toISOString(),
    until: row.until.toISOString(),
    status: row.status,
    requeued: row.requeued,
    created_at: row.createdAt.toISOString(),
    completed_at: row.completedAt?.toISOString() ?? null,
  };
}

/** Records a recovery of the endpoint's deliveries that failed, of messages sent since `since`. */
export async function recoverHookEndpoint(input: {
  endpoint: HookEndpointRow;
  since: Date;
  now?: Date;
}): Promise<HookEndpointRecoveryRow> {
  const { endpoint } = input;
  if (!endpoint.enabled) {
    throw new HookError(
      "endpoint_disabled",
      "Enable the endpoint before recovering its failed deliveries.",
    );
  }
  const now = input.now ?? new Date();
  const [row] = await db
    .insert(hookEndpointRecovery)
    .values({
      organizationId: endpoint.organizationId,
      environmentId: endpoint.environmentId,
      endpointId: endpoint.id,
      since: input.since,
      until: now,
    })
    .returning();
  if (!row) throw new Error("Hook endpoint recovery insert returned no row.");
  return row;
}

export async function getHookEndpointRecovery(input: {
  organizationId: string;
  endpointId: string;
  id: string;
}): Promise<HookEndpointRecoveryRow | null> {
  if (!isId(ID_PREFIXES.hookEndpointRecovery, input.id)) return null;
  const [row] = await db
    .select()
    .from(hookEndpointRecovery)
    .where(
      and(
        eq(hookEndpointRecovery.organizationId, input.organizationId),
        eq(hookEndpointRecovery.endpointId, input.endpointId),
        eq(hookEndpointRecovery.id, input.id),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Works through pending recoveries: each step leases one, requeues its next batch and moves its
 * cursor (or completes it). System-level. Returns how many deliveries were requeued.
 */
export async function runDueHookRecoveries(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const batch = opts.limit ?? RECOVERY_BATCH;
  const [claimed] = await db
    .update(hookEndpointRecovery)
    .set({ leaseExpiresAt: leaseUntil(now) })
    .where(
      eq(
        hookEndpointRecovery.id,
        sql`(${db
          .select({ id: hookEndpointRecovery.id })
          .from(hookEndpointRecovery)
          .where(
            and(
              eq(hookEndpointRecovery.status, "pending"),
              or(
                isNull(hookEndpointRecovery.leaseExpiresAt),
                lt(hookEndpointRecovery.leaseExpiresAt, now),
              ),
              opts.scope
                ? sql`${hookEndpointRecovery.organizationId} = any(${sql.param(opts.scope.organizationIds)}::text[])`
                : undefined,
            ),
          )
          .orderBy(asc(hookEndpointRecovery.createdAt))
          .limit(1)
          .for("update", { skipLocked: true })})`,
      ),
    )
    .returning();
  if (!claimed) return 0;
  return db.transaction(async (tx) => {
    const after =
      claimed.cursorCreatedAt && claimed.cursorId
        ? sql`(${hookDelivery.messageCreatedAt}, ${hookDelivery.id}) > (${claimed.cursorCreatedAt}, ${claimed.cursorId})`
        : undefined;
    const failed = await tx
      .select({ messageCreatedAt: hookDelivery.messageCreatedAt, id: hookDelivery.id })
      .from(hookDelivery)
      .where(
        and(
          eq(hookDelivery.organizationId, claimed.organizationId),
          eq(hookDelivery.endpointId, claimed.endpointId),
          eq(hookDelivery.status, "failed"),
          gte(hookDelivery.messageCreatedAt, claimed.since),
          lt(hookDelivery.messageCreatedAt, claimed.until),
          after,
        ),
      )
      .orderBy(asc(hookDelivery.messageCreatedAt), asc(hookDelivery.id))
      .limit(batch)
      .for("update", { skipLocked: true });
    if (failed.length > 0) {
      await tx.execute(sql`
        update hook_delivery
        set status = 'pending',
            next_attempt_at = ${now}::timestamptz + random() * interval '1 minute',
            lease_expires_at = null,
            finished_at = null,
            attempt_count = least(attempt_count, ${HOOK_MAX_ATTEMPTS - 1})
        where organization_id = ${claimed.organizationId}
          and status = 'failed'
          and (message_created_at, id) in (
            select * from unnest(${sql.param(failed.map((row) => row.messageCreatedAt.toISOString()))}::timestamptz[], ${sql.param(failed.map((row) => row.id))}::text[])
          )
      `);
    }
    const last = failed.at(-1);
    const done = failed.length < batch;
    await tx
      .update(hookEndpointRecovery)
      .set({
        requeued: sql`${hookEndpointRecovery.requeued} + ${failed.length}`,
        cursorCreatedAt: last?.messageCreatedAt ?? claimed.cursorCreatedAt,
        cursorId: last?.id ?? claimed.cursorId,
        leaseExpiresAt: null,
        ...(done && { status: "completed" as const, completedAt: now }),
      })
      .where(eq(hookEndpointRecovery.id, claimed.id));
    return failed.length;
  });
}
