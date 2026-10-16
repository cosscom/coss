/** DMARC wire types (hand-written mirrors of the API's `DomainDmarc` and `DmarcReport` schemas). */

export type DmarcPolicy = "none" | "quarantine" | "reject";

/** Where a domain is on the path from `p=none` to `p=reject`. */
export type DmarcStage = "not_checked" | "no_record" | "monitoring" | "quarantine" | "reject";

/**
 * `publish` a first record, `add_reporting` (send reports to coss.com), `complete_rollout` (drop
 * `pct`/`t=y`) or `tighten` to the next policy.
 */
export type DmarcNextStepKind = "publish" | "add_reporting" | "complete_rollout" | "tighten";

export type DmarcCheckId =
  | "coverage"
  | "recent"
  | "complete"
  | "time_at_policy"
  | "coss_pass_rate"
  | "pass_rate"
  | "sources";

/** The DMARC record found at `_dmarc.<domain>` by the latest DNS check. */
export interface DmarcPublishedRecord {
  /** The `v=DMARC1` TXT record as published. */
  value: string;
  p: DmarcPolicy | null;
  sp: DmarcPolicy | null;
  np: DmarcPolicy | null;
  adkim: "r" | "s" | null;
  aspf: "r" | "s" | null;
  /** Removed by RFC 9989 but still honored by many receivers. */
  pct: number | null;
  t: "y" | "n" | null;
  /** Aggregate report addresses. */
  rua: string[];
}

/** Messages from one source IP with one From domain, over the report summary's period. */
export interface DmarcSource {
  source_ip: string;
  /** The domain in the messages' From header. */
  header_from: string;
  messages: number;
  /** Messages that passed DMARC. */
  passing: number;
  /** Signed with the domain's coss.com DKIM keys or sent from its coss.com MAIL FROM domain. */
  via_coss: boolean;
}

/** One readiness check gating `DomainDmarc.next`. */
export interface DmarcCheck {
  id: DmarcCheckId;
  ok: boolean;
  message: string;
}

/** The next step on the path to `p=reject`. */
export interface DmarcNextStep {
  kind: DmarcNextStepKind;
  policy: DmarcPolicy;
  /** The TXT record to publish at `_dmarc.<domain>`. */
  record: string;
}

/** A domain's DMARC status: its record, the guided next step and recent reports. */
export interface DomainDmarc {
  object: "domain_dmarc";
  domain_id: string;
  /** Where the domain's aggregate reports go; `null` when the deployment doesn't receive email. */
  report_address: string | null;
  /** The domain's own record. `null`: none found (or an invalid one), or DNS not checked yet. */
  record: DmarcPublishedRecord | null;
  /** The policy receivers apply: the domain's own, else its organizational domain's (`sp`, else `p`). */
  policy: DmarcPolicy | null;
  /** The organizational domain whose record applies, when the domain publishes none of its own. */
  inherited_from: string | null;
  /** ISO 8601 timestamp: when a DNS check first saw the current policy. */
  policy_since: string | null;
  stage: DmarcStage;
  /** The policy applies only partly (`pct` below 100, or `t=y`). */
  partial: boolean;
  /** The published record sends aggregate reports to `report_address`. */
  reporting: boolean;
  /** Whether `next` is safe to publish now. */
  ready: boolean;
  /** `null` at `p=reject`. */
  next: DmarcNextStep | null;
  checks: DmarcCheck[];
  warnings: string[];
  report_summary: {
    /** ISO 8601 timestamps of the summarized period (the last 14 days). */
    period_start: string;
    period_end: string;
    reports: number;
    messages: number;
    passing: number;
    coss_messages: number;
    coss_passing: number;
    first_report_at: string | null;
    last_report_at: string | null;
    /** The 50 sources with the most messages in the period. */
    sources: DmarcSource[];
  };
}

/** The policy a reporter found when it evaluated the mail. */
export interface DmarcPolicyPublished {
  domain: string;
  p: string | null;
  sp: string | null;
  np: string | null;
  adkim: string | null;
  aspf: string | null;
  pct: number | null;
  testing: string | null;
}

/** A DMARC aggregate report, without its rows (lists). */
export interface DmarcReportSummary {
  object: "dmarc_report";
  id: string;
  domain_id: string;
  reporter: { org_name: string; email: string | null };
  /** The reporter's own id of the report. */
  report_id: string;
  /** ISO 8601 timestamps. */
  period_start: string;
  period_end: string;
  policy_published: DmarcPolicyPublished;
  messages: number;
  passing: number;
  /** The report listed more rows than are kept (10,000); totals cover the kept rows. */
  truncated: boolean;
  /** ISO 8601 timestamp. */
  received_at: string;
}

/** One row of a report: messages from one source IP with one outcome. */
export interface DmarcReportRecord {
  source_ip: string;
  count: number;
  /** What the receiver did with the messages. */
  disposition: DmarcPolicy;
  /** Aligned DKIM result. */
  dkim: "pass" | "fail";
  /** Aligned SPF result. */
  spf: "pass" | "fail";
  dmarc_pass: boolean;
  header_from: string;
  envelope_from: string | null;
  via_coss: boolean;
  auth_results: {
    dkim: { domain: string; selector: string | null; result: string }[];
    spf: { domain: string; scope: string | null; result: string }[];
  };
  reasons: { type: string; comment: string | null }[];
}

/** A DMARC aggregate report with its rows. */
export interface DmarcReport extends DmarcReportSummary {
  records: DmarcReportRecord[];
}

/** Query of `coss.domains.dmarc.reports.list`. */
export interface ListDmarcReportsParams {
  /** 1-100, default 20. */
  limit?: number;
  /** The `id` of the last report of the previous page. */
  after?: string;
}
