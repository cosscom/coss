/**
 * The guard itself (worker). System-level: the scan spans organizations, and every write is
 * scoped by the standing row's own organization.
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";
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

export type ReputationDeps = {
  checks: ReputationCheck[];
  /**
   * COSS's own organization (the one sending account and notification emails): the guard only
   * ever warns it. Suspending it would stop every sign-up, password reset and invitation email.
   */
  systemOrganizationId?: string | null;
};

export type EvaluationOutcome = {
  status: ReputationStandingRow["status"];
  metrics: MetricsSnapshot;
  transitioned: boolean;
};

/** The organization's effective policy; invalid stored overrides fall back to the defaults. */
export function policyOf(row: ReputationStandingRow | null): ReputationPolicy {
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
 * `lease` identifies the worker claim independently of the due marker, which holds new evidence.
 */
export async function evaluateOrganization(
  organizationId: string,
  deps: ReputationDeps,
  opts: { now?: Date; lease?: Date } = {},
): Promise<EvaluationOutcome> {
  await db.insert(reputationStanding).values({ organizationId }).onConflictDoNothing();
  for (let attempt = 0; attempt < 3; attempt++) {
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
    const decision = decide(current, checks, {
      canSuspend: organizationId !== deps.systemOrganizationId,
    });

    const outcome = await db.transaction(async (tx) => {
      const [latest] = await tx
        .select()
        .from(reputationStanding)
        .where(eq(reputationStanding.organizationId, organizationId))
        .for("update");
      if (!latest) throw new Error("Standing disappeared during evaluation.");
      if (opts.lease && latest.evaluationLeaseUntil?.getTime() !== opts.lease.getTime()) {
        throw new Error("Evaluation lease was superseded.");
      }
      // Compare a monotonic revision, so good -> suspended -> good is also detected.
      if (latest.revision !== row?.revision) return null;
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
      const belowMinimumUnhealthy = checks.some(
        (check) =>
          check.minimumVolume !== null &&
          check.volume < check.minimumVolume &&
          check.rate !== null &&
          check.warningThreshold !== null &&
          check.rate >= check.warningThreshold,
      );
      const scheduledAt =
        status === "warning" || (status === "good" && belowMinimumUnhealthy)
          ? new Date(now.getTime() + WARNING_RECHECK_MS)
          : null;
      // The claim consumed its due marker. Any pending marker now is newer evidence.
      const nextEvaluationAt =
        opts.lease && latest.nextEvaluationAt
          ? scheduledAt && scheduledAt < latest.nextEvaluationAt
            ? scheduledAt
            : latest.nextEvaluationAt
          : scheduledAt;
      const thisOrganization = eq(reputationStanding.organizationId, organizationId);
      await tx
        .update(reputationStanding)
        .set({
          metrics,
          lastEvaluatedAt: now,
          revision: latest.revision + 1,
          ...(opts.lease ? { evaluationLeaseUntil: null } : {}),
        })
        .where(thisOrganization);
      await tx
        .update(reputationStanding)
        .set({ nextEvaluationAt })
        .where(
          opts.lease
            ? thisOrganization
            : and(
                thisOrganization,
                row?.nextEvaluationAt
                  ? eq(reputationStanding.nextEvaluationAt, row.nextEvaluationAt)
                  : isNull(reputationStanding.nextEvaluationAt),
              ),
        );
      return { status, metrics, transitioned };
    });
    if (outcome) return outcome;
  }
  throw new Error("Standing or policy repeatedly changed during evaluation; retry required.");
}

/**
 * Evaluates organizations that are due (a new bounce or complaint, a warning to re-check, a
 * policy change), oldest first. Claims consume the due marker and have a separate expiring lease.
 * Expired claims are retried even without new evidence. Returns how many were evaluated.
 * `scope` limits the scan to some organizations (tests).
 */
export async function runDueReputationEvaluations(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } },
  deps: ReputationDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const claimable = or(
    and(
      isNull(reputationStanding.evaluationLeaseUntil),
      lte(reputationStanding.nextEvaluationAt, now),
    ),
    lte(reputationStanding.evaluationLeaseUntil, now),
  );
  const due = await db
    .select({
      organizationId: reputationStanding.organizationId,
      nextEvaluationAt: reputationStanding.nextEvaluationAt,
    })
    .from(reputationStanding)
    .where(
      and(
        claimable,
        opts.scope
          ? inArray(reputationStanding.organizationId, opts.scope.organizationIds)
          : undefined,
      ),
    )
    .orderBy(asc(reputationStanding.nextEvaluationAt))
    .limit(opts.limit ?? 50);

  let evaluated = 0;
  for (const candidate of due) {
    const lease = new Date(now.getTime() + EVALUATION_LEASE_MS);
    const [leased] = await db
      .update(reputationStanding)
      .set({ nextEvaluationAt: null, evaluationLeaseUntil: lease })
      .where(and(claimable, eq(reputationStanding.organizationId, candidate.organizationId)))
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
