/**
 * Hooks retention. Messages, deliveries and attempts are dropped by whole days with their
 * partitions (`HOOK_PARTITIONS` from `@coss/db/partitions`, run by the worker); these purge the
 * small tables around them. System-level.
 */
import { db, schema } from "@coss/db";
import { IDEMPOTENCY_KEY_TTL_MS } from "@coss/db/idempotency";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, eq, lt, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export { purgeExpiredHookPortalSessions } from "./portal.ts";

const { hookEndpointRecovery, hookIdempotencyKey } = schema;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

function inScope(column: AnyPgColumn, scope?: PurgeOptions["scope"]) {
  return scope ? sql`${column} = any(${sql.param(scope.organizationIds)}::text[])` : undefined;
}

/** Deletes idempotency keys older than a day (their message replays no more). */
export async function purgeExpiredHookIdempotencyKeys(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = new Date((opts.now ?? new Date()).getTime() - IDEMPOTENCY_KEY_TTL_MS);
  const expired = and(
    lt(hookIdempotencyKey.createdAt, cutoff),
    inScope(hookIdempotencyKey.organizationId, opts.scope),
  );
  const ids = db
    .select({ id: hookIdempotencyKey.id })
    .from(hookIdempotencyKey)
    .where(expired)
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(hookIdempotencyKey)
    .where(and(sql`${hookIdempotencyKey.id} in ${ids}`, expired))
    .returning({ id: hookIdempotencyKey.id });
  return deleted.length;
}

/** Deletes recoveries finished more than `RETENTION_DAYS.hookRecoveries` ago. */
export async function purgeFinishedHookRecoveries(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.hookRecoveries, opts.now);
  const expired = and(
    eq(hookEndpointRecovery.status, "completed"),
    lt(hookEndpointRecovery.completedAt, cutoff),
    inScope(hookEndpointRecovery.organizationId, opts.scope),
  );
  const ids = db
    .select({ id: hookEndpointRecovery.id })
    .from(hookEndpointRecovery)
    .where(expired)
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(hookEndpointRecovery)
    .where(and(sql`${hookEndpointRecovery.id} in ${ids}`, expired))
    .returning({ id: hookEndpointRecovery.id });
  return deleted.length;
}
