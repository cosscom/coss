/**
 * The guided path from `p=none` to `p=reject`: where a domain is (its published DMARC policy),
 * what to publish next, and whether its aggregate reports say that is safe. Three steps, none →
 * quarantine → reject; no `pct` ramp (RFC 9989 removed it), and a record still using `pct` or
 * `t=y` is first completed at its current policy. Pure; computed on every read, so a DNS change
 * shows at the next check without any stored stage.
 */
import {
  type DmarcPolicy,
  type DmarcRecord,
  effectivePolicy,
  nextPolicy,
  partiallyEnforced,
  ruaIncludes,
  withPolicy,
} from "./dmarc-record.ts";

const DAY = 24 * 60 * 60 * 1000;

/** Every threshold of the readiness checks, in one place (the docs quote them). */
export const DMARC_READINESS = {
  /** Reports summarized for readiness. */
  windowDays: 14,
  /** Reports must have been arriving for this long before the first stricter step. */
  coverageDays: 14,
  /** And the latest must be this recent (reporting still works). */
  recentDays: 3,
  /** Time at a full `quarantine` before `reject`. */
  daysAtQuarantine: 14,
  /** Share of mail sent through COSS that must pass DMARC. */
  cossPassRate: 0.99,
  /** Share of all reported mail that must pass, by the policy being moved to. */
  passRate: { quarantine: 0.98, reject: 0.99 } satisfies Record<"quarantine" | "reject", number>,
  /** A source not using COSS that fails DMARC with at least this share of the volume blocks. */
  sourceShare: 0.01,
  /** Mail through COSS failing under an enforcing policy alerts only above this volume. */
  alertMinMessages: 50,
} as const;

export type DmarcSourceSummary = {
  sourceIp: string;
  headerFrom: string;
  messages: number;
  passing: number;
  viaCoss: boolean;
};

/** Aggregates of a domain's recent reports (`dmarcSummary`). */
export type DmarcReportTotals = {
  messages: number;
  passing: number;
  cossMessages: number;
  cossPassing: number;
  sources: DmarcSourceSummary[];
  /** Earliest period start / latest period end of any kept report. */
  firstReportAt: Date | null;
  lastReportAt: Date | null;
};

export type DmarcStage = "not_checked" | "no_record" | "monitoring" | "quarantine" | "reject";

export type DmarcCheck = {
  id: "coverage" | "recent" | "time_at_policy" | "coss_pass_rate" | "pass_rate" | "sources";
  ok: boolean;
  message: string;
};

export type DmarcNextStep = {
  /** `publish`: no record yet; `add_reporting`: send reports to COSS; `complete_rollout`: drop
   * `pct`/`t=y`; `tighten`: the next stricter policy. */
  kind: "publish" | "add_reporting" | "complete_rollout" | "tighten";
  policy: DmarcPolicy;
  record: string;
};

export type DmarcGuidance = {
  stage: DmarcStage;
  policy: DmarcPolicy | null;
  partial: boolean;
  /** The published record sends aggregate reports to COSS. */
  reporting: boolean;
  next: DmarcNextStep | null;
  /** Whether `next` is safe now (always for `publish`/`add_reporting`). */
  ready: boolean;
  checks: DmarcCheck[];
  warnings: string[];
};

export type DmarcGuidanceInput = {
  /** The published record (`null`: none). */
  record: DmarcRecord | null;
  /** Whether DNS was ever checked (the fake provider never checks). */
  checked: boolean;
  /** Since when the current policy is published (`domain.dmarc_policy_changed_at`). */
  policySince: Date | null;
  reportAddress: string | null;
  totals: DmarcReportTotals;
  now: Date;
};

function percent(rate: number): string {
  const value = rate * 100;
  return `${value >= 99.95 || value === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
}

function days(ms: number): number {
  return Math.floor(ms / DAY);
}

const STRICTNESS: Record<DmarcPolicy, number> = { none: 0, quarantine: 1, reject: 2 };

/** Sources not using COSS whose failing mail is at least `sourceShare` of the volume. */
export function unauthenticatedSources(totals: DmarcReportTotals): DmarcSourceSummary[] {
  if (totals.messages === 0) return [];
  return totals.sources
    .filter(
      (source) =>
        !source.viaCoss &&
        source.messages - source.passing >= totals.messages * DMARC_READINESS.sourceShare,
    )
    .sort((a, b) => b.messages - b.passing - (a.messages - a.passing));
}

/** The checks gating a move to `target` (quarantine or reject). */
function readinessChecks(
  target: "quarantine" | "reject",
  input: DmarcGuidanceInput,
  current: DmarcPolicy,
): DmarcCheck[] {
  const { totals, now } = input;
  const checks: DmarcCheck[] = [];
  const firstAge = totals.firstReportAt ? now.getTime() - totals.firstReportAt.getTime() : 0;
  checks.push({
    id: "coverage",
    ok: firstAge >= DMARC_READINESS.coverageDays * DAY,
    message: totals.firstReportAt
      ? `Reports have arrived for ${days(firstAge)} of ${DMARC_READINESS.coverageDays} days.`
      : "No reports have arrived yet.",
  });
  const lastAge = totals.lastReportAt ? now.getTime() - totals.lastReportAt.getTime() : Infinity;
  checks.push({
    id: "recent",
    ok: lastAge <= DMARC_READINESS.recentDays * DAY,
    message: totals.lastReportAt
      ? lastAge <= DMARC_READINESS.recentDays * DAY
        ? "Reports are still arriving."
        : `No report for ${days(lastAge)} days: check that the record still names COSS's address.`
      : "Waiting for the first report.",
  });
  if (target === "reject") {
    const since = input.policySince && current === "quarantine" ? input.policySince : null;
    const age = since ? now.getTime() - since.getTime() : 0;
    checks.push({
      id: "time_at_policy",
      ok: age >= DMARC_READINESS.daysAtQuarantine * DAY,
      message: `Quarantine has applied in full for ${days(age)} of ${DMARC_READINESS.daysAtQuarantine} days.`,
    });
  }
  const cossRate = totals.cossMessages > 0 ? totals.cossPassing / totals.cossMessages : 0;
  checks.push({
    id: "coss_pass_rate",
    ok: totals.cossMessages > 0 && cossRate >= DMARC_READINESS.cossPassRate,
    message:
      totals.cossMessages > 0
        ? `${percent(cossRate)} of mail sent through COSS passes DMARC (${percent(DMARC_READINESS.cossPassRate)} needed).`
        : "No mail sent through COSS appears in the reports yet.",
  });
  const rate = totals.messages > 0 ? totals.passing / totals.messages : 0;
  const needed = DMARC_READINESS.passRate[target];
  checks.push({
    id: "pass_rate",
    ok: totals.messages > 0 && rate >= needed,
    message:
      totals.messages > 0
        ? `${percent(rate)} of all reported mail passes DMARC (${percent(needed)} needed).`
        : "No reported mail yet.",
  });
  const failing = unauthenticatedSources(totals);
  checks.push({
    id: "sources",
    ok: failing.length === 0,
    message:
      failing.length === 0
        ? "Every source with real volume authenticates (or sends through COSS)."
        : `${failing.length} ${failing.length === 1 ? "source" : "sources"} not using COSS ${failing.length === 1 ? "fails" : "fail"} DMARC: authorize ${failing.length === 1 ? "it" : "them"} (SPF or DKIM aligned with your domain) or confirm ${failing.length === 1 ? "it isn't" : "they aren't"} yours.`,
  });
  return checks;
}

export function dmarcGuidance(input: DmarcGuidanceInput): DmarcGuidance {
  const { record, reportAddress } = input;
  const policy = effectivePolicy(record);
  const partial = record ? partiallyEnforced(record) : false;
  const reporting = Boolean(record && reportAddress && ruaIncludes(record, reportAddress));
  const warnings: string[] = [];
  if (record?.sp && policy && STRICTNESS[record.sp] < STRICTNESS[policy]) {
    warnings.push(
      `Subdomains get a weaker policy (sp=${record.sp}) than the domain (p=${policy}): mail spoofing a subdomain is treated less strictly.`,
    );
  }
  const totals = input.totals;
  const cossRate = totals.cossMessages > 0 ? totals.cossPassing / totals.cossMessages : 1;
  if (
    (policy === "quarantine" || policy === "reject") &&
    totals.cossMessages >= DMARC_READINESS.alertMinMessages &&
    cossRate < DMARC_READINESS.cossPassRate
  ) {
    warnings.push(
      `Only ${percent(cossRate)} of mail sent through COSS passes DMARC, so receivers ${policy === "reject" ? "reject" : "quarantine"} the rest. Check the domain's DKIM and MAIL FROM records.`,
    );
  }

  const base = { policy, partial, reporting, warnings };
  if (!record || !policy) {
    return {
      ...base,
      stage: input.checked ? "no_record" : "not_checked",
      next: { kind: "publish", policy: "none", record: withPolicy(null, "none", reportAddress) },
      ready: true,
      checks: [],
    };
  }
  const stage: DmarcStage = policy === "none" ? "monitoring" : policy;
  if (reportAddress && !reporting) {
    return {
      ...base,
      stage,
      next: { kind: "add_reporting", policy, record: withPolicy(record, policy, reportAddress) },
      ready: true,
      checks: [],
    };
  }
  if (partial && policy !== "none") {
    const checks = readinessChecks(policy, input, policy === "reject" ? "quarantine" : "none");
    // Partly enforced already: time at policy counts from when this record was published.
    const relevant = checks.filter((check) => check.id !== "time_at_policy");
    return {
      ...base,
      stage,
      next: {
        kind: "complete_rollout",
        policy,
        record: withPolicy(record, policy, reportAddress),
      },
      ready: relevant.every((check) => check.ok),
      checks: relevant,
    };
  }
  const target = nextPolicy(policy);
  if (!target || target === "none") return { ...base, stage, next: null, ready: false, checks: [] };
  const checks = readinessChecks(target, input, policy);
  return {
    ...base,
    stage,
    next: { kind: "tighten", policy: target, record: withPolicy(record, target, reportAddress) },
    ready: checks.every((check) => check.ok),
    checks,
  };
}
