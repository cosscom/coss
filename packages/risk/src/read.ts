/** Reading assessments: the wire object, one by id, and keyset-paginated lists. */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { emailDomainOf } from "@coss/signals/email";
import { and, desc, eq, lt, or, type SQL, sql } from "drizzle-orm";
import {
  DEFAULT_RISK_LIST_LIMIT,
  type ListRiskAssessmentsQueryOutput,
  MAX_RISK_LIST_LIMIT,
  type RiskAssessmentListOutput,
  type RiskAssessmentOutput,
  type RiskDegradedSignal,
} from "./schemas.ts";
import { type StoredReason, toReasonObject } from "./score.ts";

const { riskAssessment } = schema;

export type RiskAssessmentRow = typeof riskAssessment.$inferSelect;

/** The environment an assessment belongs to (from the API key or the dashboard's route). */
export type RiskEnvironmentScope = { organizationId: string; environmentId: string };

/** `signals` as stored: no identifiers (the email domain is derived from the `email` column). */
export type StoredSignals = {
  email: Omit<NonNullable<RiskAssessmentOutput["signals"]["email"]>, "domain"> | null;
  ip: RiskAssessmentOutput["signals"]["ip"];
  velocity: RiskAssessmentOutput["signals"]["velocity"];
  captcha: RiskAssessmentOutput["signals"]["captcha"];
  login: RiskAssessmentOutput["signals"]["login"];
  /** Scores only: the content itself is never stored. */
  content: RiskAssessmentOutput["signals"]["content"];
  /** Never the card's fingerprint (only its hash, in `card_hash`). */
  checkout: RiskAssessmentOutput["signals"]["checkout"];
  /** Never the device id (only its hash, in `device_hash`). */
  device: RiskAssessmentOutput["signals"]["device"];
};

export function inRiskEnvironment(scope: RiskEnvironmentScope): SQL | undefined {
  return and(
    eq(riskAssessment.organizationId, scope.organizationId),
    eq(riskAssessment.environmentId, scope.environmentId),
  );
}

export function toRiskAssessmentObject(row: RiskAssessmentRow): RiskAssessmentOutput {
  const signals = row.signals as Partial<StoredSignals>;
  return {
    object: "risk_assessment",
    id: row.id,
    event: row.event,
    event_name: row.eventName,
    decision: row.decision,
    // `real` is single precision: 0.62 would read back as 0.6200000047683716.
    score: Math.round(row.score * 1000) / 1000,
    reasons: (row.reasons as StoredReason[]).map(toReasonObject),
    signals: {
      // Assessments made before a signal existed have no value for it.
      email: signals.email
        ? {
            domain: row.email ? emailDomainOf(row.email) : null,
            ...signals.email,
            domain_age_days: signals.email.domain_age_days ?? null,
          }
        : null,
      ip: signals.ip ? { ...signals.ip, privacy: signals.ip.privacy ?? null } : null,
      velocity: signals.velocity ?? null,
      captcha: signals.captcha ?? null,
      login: signals.login ?? null,
      content: signals.content ?? null,
      checkout: signals.checkout ?? null,
      device: signals.device ?? null,
    },
    user: { id: row.userId, email: row.email },
    ip: row.ip,
    degraded: row.degraded as RiskDegradedSignal[],
    outcome: row.outcome,
    review_status: row.reviewStatus,
    created_at: row.createdAt.toISOString(),
  };
}

export async function getRiskAssessmentRow(
  scope: RiskEnvironmentScope,
  id: string,
): Promise<RiskAssessmentRow | null> {
  if (!isId("rsk", id)) return null;
  const [row] = await db
    .select()
    .from(riskAssessment)
    .where(and(inRiskEnvironment(scope), eq(riskAssessment.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getRiskAssessment(
  scope: RiskEnvironmentScope,
  id: string,
): Promise<RiskAssessmentOutput | null> {
  const row = await getRiskAssessmentRow(scope, id);
  return row ? toRiskAssessmentObject(row) : null;
}

/** Newest first. An unknown `after` cursor gives an empty page. */
export async function listRiskAssessments(
  scope: RiskEnvironmentScope,
  query: ListRiskAssessmentsQueryOutput = {},
): Promise<RiskAssessmentListOutput> {
  const limit = Math.min(query.limit ?? DEFAULT_RISK_LIST_LIMIT, MAX_RISK_LIST_LIMIT);
  const empty: RiskAssessmentListOutput = { object: "list", data: [], has_more: false };
  if (query.after !== undefined && !isId("rsk", query.after)) return empty;
  const [cursor] = query.after
    ? await db
        .select({
          // Keep PostgreSQL's microseconds so the next page cannot skip same-millisecond rows.
          createdAt: sql<string>`${riskAssessment.createdAt}::text`,
          sequence: riskAssessment.sequence,
        })
        .from(riskAssessment)
        .where(and(inRiskEnvironment(scope), eq(riskAssessment.id, query.after)))
        .limit(1)
    : [];
  if (query.after && !cursor) return empty;
  const rows = await db
    .select()
    .from(riskAssessment)
    .where(
      and(
        inRiskEnvironment(scope),
        query.event === undefined ? undefined : eq(riskAssessment.event, query.event),
        query.decision === undefined ? undefined : eq(riskAssessment.decision, query.decision),
        query.user_id === undefined ? undefined : eq(riskAssessment.userId, query.user_id),
        query.review_status === undefined
          ? undefined
          : eq(riskAssessment.reviewStatus, query.review_status),
        cursor
          ? or(
              lt(riskAssessment.createdAt, sql`${cursor.createdAt}::timestamptz`),
              and(
                eq(riskAssessment.createdAt, sql`${cursor.createdAt}::timestamptz`),
                lt(riskAssessment.sequence, cursor.sequence),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(riskAssessment.createdAt), desc(riskAssessment.sequence))
    .limit(limit + 1);
  return {
    object: "list",
    data: rows.slice(0, limit).map(toRiskAssessmentObject),
    has_more: rows.length > limit,
  };
}

/**
 * The environment's assessments of one address (case-insensitive), newest first: the admin
 * console finds a coss.com user's sign-up assessment this way (sign-ups are assessed before the user
 * exists, so they carry no user id). Addresses are cleared after `riskPersonalData` days.
 */
export async function listRiskAssessmentsForEmail(
  scope: RiskEnvironmentScope,
  email: string,
  opts: { event?: RiskAssessmentOutput["event"]; limit?: number } = {},
): Promise<RiskAssessmentOutput[]> {
  const rows = await db
    .select()
    .from(riskAssessment)
    .where(
      and(
        inRiskEnvironment(scope),
        sql`lower(${riskAssessment.email}) = ${email.toLowerCase()}`,
        opts.event === undefined ? undefined : eq(riskAssessment.event, opts.event),
      ),
    )
    .orderBy(desc(riskAssessment.createdAt), desc(riskAssessment.sequence))
    .limit(Math.min(opts.limit ?? 5, MAX_RISK_LIST_LIMIT));
  return rows.map(toRiskAssessmentObject);
}
