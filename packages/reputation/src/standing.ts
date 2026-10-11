/** Reading an organization's standing, the live-sending gate, and the worker's due marker. */
import { db, type Executor, schema } from "@coss/db";
import { asc, desc, eq, sql } from "drizzle-orm";
import type { CheckResult } from "./checks.ts";
import type {
  ReputationCheckObjectOutput,
  ReputationObjectOutput,
  ReputationStatus,
} from "./schemas.ts";

const { organization, reputationEvent, reputationStanding, user } = schema;

export type ReputationStandingRow = typeof reputationStanding.$inferSelect;
export type ReputationEventRow = typeof reputationEvent.$inferSelect;

/** What an evaluation stores in `reputation_standing.metrics` (and history rows). */
export type MetricsSnapshot = {
  windowStart: string;
  windowEnd: string;
  checks: CheckResult[];
};

export function metricsSnapshot(value: unknown): MetricsSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<MetricsSnapshot>;
  if (!Array.isArray(snapshot.checks) || !snapshot.windowStart || !snapshot.windowEnd) return null;
  return snapshot as MetricsSnapshot;
}

/** The organization's standing row, or `null` (never evaluated: `good`). */
export async function getReputationStanding(
  organizationId: string,
  executor: Executor = db,
): Promise<ReputationStandingRow | null> {
  const [row] = await executor
    .select()
    .from(reputationStanding)
    .where(eq(reputationStanding.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

/** Whether live sending is suspended for the organization (the send gate). */
export async function isSuspended(organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({ status: reputationStanding.status })
    .from(reputationStanding)
    .where(eq(reputationStanding.organizationId, organizationId))
    .limit(1);
  return row?.status === "suspended";
}

/**
 * Asks the worker to evaluate the organization now, in `tx` (e.g. with a new bounce). Only ever
 * moves `next_evaluation_at` earlier, so a burst of events causes one evaluation.
 */
export async function markReputationDue(
  tx: Executor,
  organizationId: string,
  now: Date = new Date(),
): Promise<void> {
  await tx
    .insert(reputationStanding)
    .values({ organizationId, nextEvaluationAt: now })
    .onConflictDoUpdate({
      target: reputationStanding.organizationId,
      set: { nextEvaluationAt: now },
      setWhere: sql`${reputationStanding.nextEvaluationAt} IS NULL OR ${reputationStanding.nextEvaluationAt} > ${now.toISOString()}::timestamptz`,
    });
}

export function toCheckObject(result: CheckResult): ReputationCheckObjectOutput {
  return {
    trigger: result.trigger,
    severity: result.severity,
    message: result.message,
    rate: result.rate,
    count: result.count,
    volume: result.volume,
    warning_threshold: result.warningThreshold,
    suspend_threshold: result.suspendThreshold,
    minimum_volume: result.minimumVolume,
  };
}

/** The public `reputation` object for a standing row (`null`: never evaluated). */
export function toReputationObject(row: ReputationStandingRow | null): ReputationObjectOutput {
  const snapshot = metricsSnapshot(row?.metrics);
  return {
    object: "reputation",
    status: row?.status ?? "good",
    reason: row?.reason ?? null,
    status_changed_at: row?.statusChangedAt?.toISOString() ?? null,
    evaluated_at: row?.lastEvaluatedAt?.toISOString() ?? null,
    window: snapshot ? { start: snapshot.windowStart, end: snapshot.windowEnd } : null,
    checks: snapshot ? snapshot.checks.map(toCheckObject) : [],
  };
}

export async function getReputation(organizationId: string): Promise<ReputationObjectOutput> {
  return toReputationObject(await getReputationStanding(organizationId));
}

export type ReputationEventWithActor = ReputationEventRow & { actorEmail: string | null };

/** The organization's standing history, newest first. */
export async function listReputationEvents(
  organizationId: string,
  opts: { limit?: number } = {},
): Promise<ReputationEventWithActor[]> {
  const rows = await db
    .select({ event: reputationEvent, actorEmail: user.email })
    .from(reputationEvent)
    .leftJoin(user, eq(user.id, reputationEvent.actorUserId))
    .where(eq(reputationEvent.organizationId, organizationId))
    .orderBy(desc(reputationEvent.createdAt), desc(reputationEvent.id))
    .limit(opts.limit ?? 50);
  return rows.map((row) => ({ ...row.event, actorEmail: row.actorEmail }));
}

export type OrganizationStanding = {
  organizationId: string;
  name: string;
  slug: string;
  createdAt: Date;
  standing: ReputationStandingRow | null;
};

/**
 * Platform-admin view: organizations with their standing, suspended first, then warned, then
 * the most recently evaluated.
 */
export async function listOrganizationStandings(
  opts: { status?: ReputationStatus; limit?: number } = {},
): Promise<OrganizationStanding[]> {
  const severity = sql`case ${reputationStanding.status} when 'suspended' then 0 when 'warning' then 1 else 2 end`;
  const rows = await db
    .select({
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      standing: reputationStanding,
    })
    .from(organization)
    .leftJoin(reputationStanding, eq(reputationStanding.organizationId, organization.id))
    .where(
      opts.status === "good"
        ? sql`coalesce(${reputationStanding.status}, 'good') = 'good'`
        : opts.status
          ? eq(reputationStanding.status, opts.status)
          : undefined,
    )
    .orderBy(
      asc(severity),
      sql`${reputationStanding.lastEvaluatedAt} desc nulls last`,
      desc(organization.createdAt),
    )
    .limit(opts.limit ?? 100);
  return rows;
}

/** One organization for the admin detail page, or `null`. */
export async function getOrganizationStanding(
  organizationId: string,
): Promise<OrganizationStanding | null> {
  const [row] = await db
    .select({
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      standing: reputationStanding,
    })
    .from(organization)
    .leftJoin(reputationStanding, eq(reputationStanding.organizationId, organization.id))
    .where(eq(organization.id, organizationId))
    .limit(1);
  return row ?? null;
}
