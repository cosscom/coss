/**
 * Risk's purges (`@coss/retention`; the worker's `retention` loop): personal data on assessments
 * first, then memory, then whole assessments. System-level: the scans span organizations; `scope`
 * limits them to some (tests).
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, inArray, isNull, lt, or, type SQL, sql } from "drizzle-orm";
import { NETWORK_REPORT_TTL_MS } from "./assess.ts";

const { riskAssessment, riskDomainAge, riskIdentity, riskReport, riskUserNetwork } = schema;

/** Cached domain ages are refreshed long before this; older rows are domains nobody uses. */
const DOMAIN_AGE_CACHE_DAYS = 90;

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
 * Deletes mailbox identities and users' login networks not seen within `riskMemory`, network
 * reports once they stop counting (30 days), other reports after `riskMemory`, and cached domain
 * ages nobody looked up for 90 days, and assessment preparations after 48 hours. Returns
 * [identities, reports, networks, domain ages, preparations].
 */
export async function purgeExpiredRiskMemory(opts: PurgeOptions = {}): Promise<number[]> {
  const now = opts.now ?? new Date();
  // Preparation fingerprints and scores have no purpose beyond idempotency's lifetime.
  const preparation = schema.riskAssessmentPreparation;
  const stalePreparation = and(
    lt(preparation.createdAt, new Date(now.getTime() - 48 * 60 * 60_000)),
    opts.scope
      ? inArray(
          preparation.environmentId,
          db
            .select({ id: schema.environment.id })
            .from(schema.environment)
            .where(inArray(schema.environment.organizationId, opts.scope.organizationIds)),
        )
      : undefined,
  );
  const expiredPreparations = db
    .select({
      environmentId: preparation.environmentId,
      idempotencyKey: preparation.idempotencyKey,
    })
    .from(preparation)
    .where(stalePreparation)
    .orderBy(asc(preparation.createdAt))
    .limit(opts.limit ?? 1000);
  const preparations = await db
    .delete(preparation)
    .where(
      and(
        stalePreparation,
        sql`(${preparation.environmentId}, ${preparation.idempotencyKey}) in (${expiredPreparations})`,
      ),
    )
    .returning({ key: preparation.idempotencyKey });
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
  const staleNetwork = and(
    lt(riskUserNetwork.lastSeenAt, cutoff),
    opts.scope ? inArray(riskUserNetwork.organizationId, opts.scope.organizationIds) : undefined,
  );
  const networkIds = db
    .select({ id: riskUserNetwork.id })
    .from(riskUserNetwork)
    .where(staleNetwork)
    .orderBy(asc(riskUserNetwork.lastSeenAt))
    .limit(opts.limit ?? 1000);
  const networks = await db
    .delete(riskUserNetwork)
    .where(and(inArray(riskUserNetwork.id, networkIds), staleNetwork))
    .returning({ id: riskUserNetwork.id });

  // Platform-wide cache: tests scope it away (other suites share it).
  let domainAges = 0;
  if (!opts.scope) {
    const staleDomain = lt(riskDomainAge.checkedAt, retentionCutoff(DOMAIN_AGE_CACHE_DAYS, now));
    const domains = db
      .select({ domain: riskDomainAge.domain })
      .from(riskDomainAge)
      .where(staleDomain)
      .limit(opts.limit ?? 1000);
    domainAges = (
      await db
        .delete(riskDomainAge)
        .where(and(inArray(riskDomainAge.domain, domains), staleDomain))
        .returning({ domain: riskDomainAge.domain })
    ).length;
  }
  return [identities.length, reports.length, networks.length, domainAges, preparations.length];
}
