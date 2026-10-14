/**
 * Hooks in the reputation guard: finished live deliveries are counted per organization and hour
 * (`hook_delivery_rollup`), and `hookFailureRateCheck` grades the share that failed every attempt.
 * By default it only warns (`ReputationPolicy.hookFailureRate.suspend` is `null`): endpoints belong
 * to the customer's users, and endpoint auto-disable is what stops requests to dead ones.
 */
import { db, schema } from "@coss/db";
import { markReputationDue, type ReputationCheck, rateResult } from "@coss/reputation";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";
import type { FinishedHookDelivery } from "./deliver.ts";

const { environment, hookDeliveryRollup } = schema;

export const HOOK_FAILURE_TRIGGER = "hook_failure_rate";
const HOUR_MS = 60 * 60 * 1000;

/**
 * Adds a run's finished deliveries of live environments to the hourly counts (one upsert per
 * organization), and asks the guard to look at organizations with new failures. Sandbox
 * deliveries don't count: anyone can point a sandbox endpoint anywhere.
 */
export async function recordHookDeliveryOutcomes(
  finished: readonly FinishedHookDelivery[],
  now: Date = new Date(),
): Promise<void> {
  if (finished.length === 0) return;
  const live = new Set(
    (
      await db
        .select({ id: environment.id })
        .from(environment)
        .where(
          and(
            inArray(environment.id, [...new Set(finished.map((row) => row.environmentId))]),
            eq(environment.mode, "live"),
          ),
        )
    ).map((row) => row.id),
  );
  const counts = new Map<string, { succeeded: number; failed: number }>();
  for (const row of finished) {
    if (!live.has(row.environmentId)) continue;
    const count = counts.get(row.organizationId) ?? { succeeded: 0, failed: 0 };
    if (row.succeeded) count.succeeded++;
    else count.failed++;
    counts.set(row.organizationId, count);
  }
  if (counts.size === 0) return;
  const hour = new Date(Math.floor(now.getTime() / HOUR_MS) * HOUR_MS);
  await db.transaction(async (tx) => {
    // Sorted, so concurrent workers lock the rows in the same order.
    for (const [organizationId, count] of [...counts].sort(([a], [b]) => (a < b ? -1 : 1))) {
      await tx
        .insert(hookDeliveryRollup)
        .values({ organizationId, hour, ...count })
        .onConflictDoUpdate({
          target: [hookDeliveryRollup.organizationId, hookDeliveryRollup.hour],
          set: {
            succeeded: sql`${hookDeliveryRollup.succeeded} + ${count.succeeded}`,
            failed: sql`${hookDeliveryRollup.failed} + ${count.failed}`,
          },
        });
      if (count.failed > 0) await markReputationDue(tx, organizationId, now);
    }
  });
}

/** The share of an organization's finished live Hooks deliveries that failed every attempt. */
export const hookFailureRateCheck: ReputationCheck = {
  trigger: HOOK_FAILURE_TRIGGER,
  async evaluate(context) {
    const from = new Date(Math.floor(context.windowStart.getTime() / HOUR_MS) * HOUR_MS);
    const [row] = await db
      .select({
        succeeded: sum(hookDeliveryRollup.succeeded),
        failed: sum(hookDeliveryRollup.failed),
      })
      .from(hookDeliveryRollup)
      .where(
        and(
          eq(hookDeliveryRollup.organizationId, context.organizationId),
          gte(hookDeliveryRollup.hour, from),
        ),
      );
    const failed = Number(row?.failed ?? 0);
    const volume = failed + Number(row?.succeeded ?? 0);
    const threshold = context.policy.hookFailureRate;
    return rateResult({
      trigger: HOOK_FAILURE_TRIGGER,
      label: "Hooks delivery failure rate",
      count: failed,
      volume,
      threshold: {
        warning: threshold.warning,
        suspend: threshold.suspend,
        minimumRecipients: threshold.minimumDeliveries,
      },
      unit: "deliveries",
    });
  },
};

/** Deletes hourly counts older than the longest reputation window (`RETENTION_DAYS.reputationRollups`). */
export async function purgeExpiredHookDeliveryRollups(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.reputationRollups, opts.now);
  const expired = and(
    lt(hookDeliveryRollup.hour, cutoff),
    opts.scope ? inArray(hookDeliveryRollup.organizationId, opts.scope.organizationIds) : undefined,
  );
  const batch = db
    .select({ organizationId: hookDeliveryRollup.organizationId, hour: hookDeliveryRollup.hour })
    .from(hookDeliveryRollup)
    .where(expired)
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(hookDeliveryRollup)
    .where(
      and(
        sql`(${hookDeliveryRollup.organizationId}, ${hookDeliveryRollup.hour}) in (${batch})`,
        expired,
      ),
    )
    .returning({ hour: hookDeliveryRollup.hour });
  return deleted.length;
}
