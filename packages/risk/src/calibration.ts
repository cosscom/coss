/**
 * Learning from feedback: how often each reason and rule was right, by the outcomes customers
 * reported on assessments of the last 90 days, and the reason weights that supports. COSS only
 * suggests: the environment's weights change when the customer applies them (`reason_weights`),
 * like every other decision about their traffic.
 *
 * The suggestion is the reason's precision among assessments with feedback, pulled toward its
 * current default by a prior worth `PRIOR_STRENGTH` assessments, so a handful of reports moves it
 * a little and hundreds move it a lot. Reasons with weight 0 by design (`ip.private`) get none.
 */
import { db } from "@coss/db";
import { sql } from "drizzle-orm";
import type { RiskEnvironmentScope } from "./read.ts";
import { listRiskRuleRows } from "./rules.ts";
import {
  CALIBRATION_WINDOW_DAYS,
  MAX_REASON_WEIGHT,
  MIN_CALIBRATION_FEEDBACK,
  REASONS,
  type RiskCalibrationOutput,
  type RiskReasonCode,
  WEIGHTABLE_REASON_CODES,
} from "./schemas.ts";
import { reasonWeight } from "./score.ts";
import { resolveRiskSettings } from "./settings.ts";

/** How many assessments' worth of belief the default weight carries. */
export const PRIOR_STRENGTH = 10;

type Tally = { fired: number; fraud: number; legitimate: number };

/** The weight `tally`'s feedback supports, or `null` with too little of it. */
export function suggestedWeight(code: RiskReasonCode, tally: Tally): number | null {
  const prior = REASONS[code].weight;
  if (prior === 0) return null;
  const labeled = tally.fraud + tally.legitimate;
  if (labeled < MIN_CALIBRATION_FEEDBACK) return null;
  const weight = (tally.fraud + PRIOR_STRENGTH * prior) / (labeled + PRIOR_STRENGTH);
  return Math.round(Math.min(MAX_REASON_WEIGHT, Math.max(0, weight)) * 100) / 100;
}

function precision(tally: { fraud: number; legitimate: number }): number | null {
  const labeled = tally.fraud + tally.legitimate;
  return labeled === 0 ? null : Math.round((tally.fraud / labeled) * 1000) / 1000;
}

export async function getRiskCalibration(
  scope: RiskEnvironmentScope,
  opts: { now?: Date } = {},
): Promise<RiskCalibrationOutput> {
  const since = new Date(
    (opts.now ?? new Date()).getTime() - CALIBRATION_WINDOW_DAYS * 24 * 60 * 60_000,
  );
  const inWindow = sql`a.organization_id = ${scope.organizationId}
    and a.environment_id = ${scope.environmentId}
    and a.created_at >= ${since.toISOString()}::timestamptz`;
  const [totals, tallies, settings, rules] = await Promise.all([
    db.execute<{ assessments: string; labeled: string }>(sql`
      select count(*) as assessments, count(a.outcome) as labeled
      from risk_assessment a where ${inWindow}`),
    // One pass over the window: every reason (and rule) with its assessment's outcome.
    db.execute<{ code: string; rule: string | null; outcome: string | null; total: string }>(sql`
      select r->>'code' as code, r->>'rule' as rule, a.outcome::text as outcome, count(*) as total
      from risk_assessment a, jsonb_array_elements(a.reasons) r
      where ${inWindow}
      group by 1, 2, 3`),
    resolveRiskSettings(db, scope),
    listRiskRuleRows(db, scope),
  ]);

  const reasons = new Map<string, Tally>();
  const matched = new Map<string, Tally>();
  for (const row of tallies.rows) {
    const total = Number(row.total);
    const target = row.code === "rule.matched" ? matched : reasons;
    const key = row.code === "rule.matched" ? (row.rule ?? "") : row.code;
    const tally = target.get(key) ?? { fired: 0, fraud: 0, legitimate: 0 };
    tally.fired += total;
    if (row.outcome === "legitimate") tally.legitimate += total;
    else if (row.outcome === "fraud" || row.outcome === "abuse") tally.fraud += total;
    target.set(key, tally);
  }

  const codes = WEIGHTABLE_REASON_CODES.filter(
    (code) => reasons.has(code) || settings.reasonWeights[code] !== undefined,
  );
  const empty = { fired: 0, fraud: 0, legitimate: 0 };
  return {
    object: "risk_calibration",
    window_days: CALIBRATION_WINDOW_DAYS,
    assessments: Number(totals.rows[0]?.assessments ?? 0),
    labeled: Number(totals.rows[0]?.labeled ?? 0),
    reasons: codes
      .map((code) => {
        const tally = reasons.get(code) ?? empty;
        return {
          code,
          ...tally,
          precision: precision(tally),
          default_weight: REASONS[code].weight,
          weight: reasonWeight(code, settings.reasonWeights),
          suggested_weight: suggestedWeight(code, tally),
        };
      })
      .sort((a, b) => b.fired - a.fired || a.code.localeCompare(b.code)),
    rules: rules.map((rule) => {
      const tally = matched.get(rule.id) ?? empty;
      return {
        rule: rule.id,
        name: rule.name,
        matched: tally.fired,
        fraud: tally.fraud,
        legitimate: tally.legitimate,
        precision: precision(tally),
      };
    }),
  };
}
