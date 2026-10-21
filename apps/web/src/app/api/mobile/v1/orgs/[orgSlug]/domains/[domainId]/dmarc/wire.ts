import type {
  DmarcOverviewResponse,
  DmarcReportResponse,
  DomainStatus,
  MobileDmarcReportSummary,
} from "@coss/companion";
import { DMARC_READINESS } from "@coss/email";
import type {
  DmarcReportObjectOutput,
  DmarcReportSummaryOutput,
  DomainDmarcOutput,
} from "@coss/email/schemas";

/** The DMARC page's policy, guidance and summary (`domains/[domainId]/dmarc/page.tsx`). */
export function toMobileDmarcOverview(
  domain: { id: string; name: string; status: DomainStatus },
  dmarc: DomainDmarcOutput,
): DmarcOverviewResponse {
  const summary = dmarc.report_summary;
  return {
    domain: { id: domain.id, name: domain.name, status: domain.status },
    report_address: dmarc.report_address,
    record: dmarc.record?.value ?? null,
    policy: dmarc.policy,
    inherited_from: dmarc.inherited_from,
    policy_since: dmarc.policy_since,
    stage: dmarc.stage,
    partial: dmarc.partial,
    reporting: dmarc.reporting,
    ready: dmarc.ready,
    next: dmarc.next,
    checks: dmarc.checks.map(({ id, ok, message }) => ({ id, ok, message })),
    warnings: dmarc.warnings,
    summary: {
      window_days: DMARC_READINESS.windowDays,
      messages: summary.messages,
      passing: summary.passing,
      coss_messages: summary.coss_messages,
      coss_passing: summary.coss_passing,
      sources: summary.sources.map((source) => ({
        source_ip: source.source_ip,
        header_from: source.header_from,
        messages: source.messages,
        passing: source.passing,
        via_coss: source.via_coss,
      })),
    },
    days_at_quarantine: DMARC_READINESS.daysAtQuarantine,
  };
}

export function toMobileDmarcReportSummary(
  report: DmarcReportSummaryOutput,
): MobileDmarcReportSummary {
  return {
    id: report.id,
    reporter: report.reporter.org_name,
    period_start: report.period_start,
    period_end: report.period_end,
    messages: report.messages,
    passing: report.passing,
    truncated: report.truncated,
    received_at: report.received_at,
  };
}

/** "p=none sp=reject pct=50", as the report page's "Policy seen". */
function policySeen(policy: DmarcReportSummaryOutput["policy_published"]): string {
  return (
    `p=${policy.p ?? "none"}` +
    (policy.sp ? ` sp=${policy.sp}` : "") +
    (policy.pct !== null && policy.pct < 100 ? ` pct=${policy.pct}` : "")
  );
}

/** Rows sent to the app: a report keeps up to 10,000, too many to draw on a phone. */
export const MOBILE_DMARC_RECORD_LIMIT = 200;

/**
 * A report and its first rows, without the rows' DKIM/SPF auth results (the dashboard's page
 * doesn't show them either).
 */
export function toMobileDmarcReport(
  report: DmarcReportObjectOutput,
): DmarcReportResponse["report"] {
  return {
    ...toMobileDmarcReportSummary(report),
    reporter_email: report.reporter.email,
    report_id: report.report_id,
    policy_seen: policySeen(report.policy_published),
    record_count: report.records.length,
    records: report.records.slice(0, MOBILE_DMARC_RECORD_LIMIT).map((record) => ({
      source_ip: record.source_ip,
      count: record.count,
      header_from: record.header_from,
      envelope_from: record.envelope_from,
      dkim: record.dkim,
      spf: record.spf,
      disposition: record.disposition,
      reasons: record.reasons.map(({ type, comment }) => ({ type, comment })),
      via_coss: record.via_coss,
    })),
  };
}
