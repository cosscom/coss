/**
 * Risk's purges (`@coss/retention`; the worker's `retention` loop): personal data on assessments
 * first, then memory, then whole assessments. System-level: the scans span organizations; `scope`
 * limits them to some (tests).
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, inArray, isNull, lt, or, type SQL } from "drizzle-orm";
import { NETWORK_REPORT_TTL_MS } from "./assess.ts";

const { riskAssessment, riskIdentity, riskReport } = schema;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

function inScope(
  column: typeof riskAssessment.organizationId,
  opts: PurgeOptions,
): SQL | undefined {
  return opts.scope ? inArray(column, opts.scope.organizationIds) : undefined;
}

/** Clears email, IP and user agent of up to `limit` assessments past `riskPersonalData`. */
export async function purgeExpiredRiskPersonalData(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.riskPersonalData, opts.now);
  const due = and(
    lt(riskAssessment.createdAt, cutoff),
    isNull(riskAssessment.personalDataPurgedAt),
    inScope(riskAssessment.organizationId, opts),
  );
  const ids = db
    .select({ id: riskAssessment.id })
    .from(riskAssessment)
    .where(due)
    .orderBy(asc(riskAssessment.createdAt))
    .limit(opts.limit ?? 1000);
  const updated = await db
    .update(riskAssessment)
    .set({ email: null, ip: null, userAgent: null, personalDataPurgedAt: opts.now ?? new Date() })
    .where(and(inArray(riskAssessment.id, ids), due))
    .returning({ id: riskAssessment.id });
  return updated.length;
}

/** Deletes up to `limit` assessments (with their feedback) past `riskAssessments`. */
export async function purgeExpiredRiskAssessments(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.riskAssessments, opts.now);
  const expired = and(
    lt(riskAssessment.createdAt, cutoff),
    inScope(riskAssessment.organizationId, opts),
  );
  const ids = db
    .select({ id: riskAssessment.id })
    .from(riskAssessment)
    .where(expired)
    .orderBy(asc(riskAssessment.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(riskAssessment)
    .where(and(inArray(riskAssessment.id, ids), expired))
    .returning({ id: riskAssessment.id });
  return deleted.length;
}

/**
 * Deletes mailbox identities not seen within `riskMemory`, network reports once they stop
 * counting (30 days) and other reports after `riskMemory`. Returns [identities, reports].
 */
export async function purgeExpiredRiskMemory(opts: PurgeOptions = {}): Promise<number[]> {
  const now = opts.now ?? new Date();
  const cutoff = retentionCutoff(RETENTION_DAYS.riskMemory, now);
  const staleIdentity = and(
    lt(riskIdentity.lastSeenAt, cutoff),
    opts.scope ? inArray(riskIdentity.organizationId, opts.scope.organizationIds) : undefined,
  );
  const identityIds = db
    .select({ id: riskIdentity.id })
    .from(riskIdentity)
    .where(staleIdentity)
    .orderBy(asc(riskIdentity.lastSeenAt))
    .limit(opts.limit ?? 1000);
  const identities = await db
    .delete(riskIdentity)
    .where(and(inArray(riskIdentity.id, identityIds), staleIdentity))
    .returning({ id: riskIdentity.id });

  const networkCutoff = new Date(now.getTime() - NETWORK_REPORT_TTL_MS);
  const staleReport = and(
    or(
      and(inArray(riskReport.kind, ["ip", "subnet"]), lt(riskReport.reportedAt, networkCutoff)),
      lt(riskReport.reportedAt, cutoff),
    ),
    opts.scope ? inArray(riskReport.organizationId, opts.scope.organizationIds) : undefined,
  );
  const reportIds = db
    .select({ id: riskReport.id })
    .from(riskReport)
    .where(staleReport)
    .orderBy(asc(riskReport.reportedAt))
    .limit(opts.limit ?? 1000);
  const reports = await db
    .delete(riskReport)
    .where(and(inArray(riskReport.id, reportIds), staleReport))
    .returning({ id: riskReport.id });
  return [identities.length, reports.length];
}
