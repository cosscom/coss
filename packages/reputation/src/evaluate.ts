/**
 * The guard itself (worker). System-level: the scan spans organizations, and every write is
 * scoped by the standing row's own organization.
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import type { ReputationCheck } from "./checks.ts";
import { decide } from "./decide.ts";
import { effectivePolicy, type ReputationPolicy } from "./schemas.ts";
import type { MetricsSnapshot, ReputationStandingRow } from "./standing.ts";
import { getReputationStanding } from "./standing.ts";
import { applyTransition } from "./transitions.ts";

const { reputationStanding } = schema;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
/** A claimed organization is not picked up by another worker for this long. */
export const EVALUATION_LEASE_MS = 5 * MINUTE;
/** While warned, re-evaluate this often so a recovery clears the warning. */
export const WARNING_RECHECK_MS = 60 * MINUTE;

export type ReputationDeps = { checks: ReputationCheck[] };

export type EvaluationOutcome = {
  status: ReputationStandingRow["status"];
  metrics: MetricsSnapshot;
  transitioned: boolean;
};

function policyOf(row: ReputationStandingRow | null): ReputationPolicy {
  try {
    return effectivePolicy(row?.policyOverrides);
  } catch (error) {
    // Overrides are validated when saved; never let a bad row switch the guard off.
    console.error(`[reputation] ignoring invalid policy of ${row?.organizationId}:`, error);
    return effectivePolicy(null);
  }
}

/**
 * Runs every check for one organization, stores the results and applies what the guard decides.
 * `lease` is the `next_evaluation_at` the caller claimed: the next evaluation time is only
 * replaced if nothing marked the organization due again meanwhile.
 */
export async function evaluateOrganization(
  organizationId: string,
  deps: ReputationDeps,
  opts: { now?: Date; lease?: Date } = {},
): Promise<EvaluationOutcome> {
  const now = opts.now ?? new Date();
  const row = await getReputationStanding(organizationId);
  const policy = policyOf(row);
  const windowStart = new Date(
    Math.max(now.getTime() - policy.windowDays * DAY, row?.reinstatedAt?.getTime() ?? 0),
  );
  // One context object for every check, so checks can share work per evaluation.
  const context = { organizationId, now, windowStart, policy };
  const checks = await Promise.all(deps.checks.map((check) => check.evaluate(context)));
  const metrics: MetricsSnapshot = {
    windowStart: windowStart.toISOString(),
    windowEnd: now.toISOString(),
    checks,
  };
  const current = { status: row?.status ?? "good", reason: row?.reason ?? null };
  const decision = decide(current, checks);

  return db.transaction(async (tx) => {
    await tx.insert(reputationStanding).values({ organizationId }).onConflictDoNothing();
    const transitioned = decision
      ? Boolean(
          await applyTransition(tx, {
            organizationId,
            from: current.status,
            to: decision.to,
            type: decision.type,
            trigger: decision.trigger,
            actor: { kind: "system" },
            metrics,
            now,
          }),
        )
      : false;
    const status = transitioned && decision ? decision.to : current.status;
    const nextEvaluationAt =
      status === "warning" ? new Date(now.getTime() + WARNING_RECHECK_MS) : null;
    const thisOrganization = eq(reputationStanding.organizationId, organizationId);
    await tx
      .update(reputationStanding)
      .set({ metrics, lastEvaluatedAt: now })
      .where(thisOrganization);
    await tx
      .update(reputationStanding)
      .set({ nextEvaluationAt })
      .where(
        opts.lease
          ? and(thisOrganization, eq(reputationStanding.nextEvaluationAt, opts.lease))
          : thisOrganization,
      );
    return { status, metrics, transitioned };
  });
}

/**
 * Evaluates organizations that are due (a new bounce or complaint, a warning to re-check, a
 * policy change), oldest first. Each is leased by moving `next_evaluation_at` forward, so
 * concurrent workers never evaluate one organization at once. Returns how many were evaluated.
 * `scope` limits the scan to some organizations (tests).
 */
export async function runDueReputationEvaluations(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } },
  deps: ReputationDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select({
      organizationId: reputationStanding.organizationId,
      nextEvaluationAt: reputationStanding.nextEvaluationAt,
    })
    .from(reputationStanding)
    .where(
      and(
        isNotNull(reputationStanding.nextEvaluationAt),
        lte(reputationStanding.nextEvaluationAt, now),
        opts.scope
          ? inArray(reputationStanding.organizationId, opts.scope.organizationIds)
          : undefined,
      ),
    )
    .orderBy(asc(reputationStanding.nextEvaluationAt))
    .limit(opts.limit ?? 50);

  let evaluated = 0;
  for (const candidate of due) {
    if (!candidate.nextEvaluationAt) continue;
    const lease = new Date(now.getTime() + EVALUATION_LEASE_MS);
    const [leased] = await db
      .update(reputationStanding)
      .set({ nextEvaluationAt: lease })
      .where(
        and(
          eq(reputationStanding.organizationId, candidate.organizationId),
          eq(reputationStanding.nextEvaluationAt, candidate.nextEvaluationAt),
        ),
      )
      .returning({ organizationId: reputationStanding.organizationId });
    if (!leased) continue;
    try {
      await evaluateOrganization(candidate.organizationId, deps, { now, lease });
      evaluated++;
    } catch (error) {
      console.error(`[reputation] evaluating ${candidate.organizationId} failed:`, error);
    }
  }
  return evaluated;
}
