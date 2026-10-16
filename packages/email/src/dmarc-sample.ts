/**
 * Builds DMARC aggregate reports like mailbox providers send them: tests, and the dashboard's
 * "Send a sample report" while it runs the fake provider (development).
 */
import { randomBytes, randomInt } from "node:crypto";
import { gzipSync } from "node:zlib";
import { dmarcReportAddress } from "./dmarc-record.ts";
import { type DmarcIngestOutcome, ingestDmarcReports } from "./dmarc-reports.ts";
import type { DomainRow } from "./domains.ts";
import { NO_VERDICTS } from "./inbound.ts";
import { buildTestMessage } from "./inbound-mime.ts";

export type SampleDmarcRecord = {
  sourceIp: string;
  count: number;
  disposition?: "none" | "quarantine" | "reject";
  dkim: "pass" | "fail";
  spf: "pass" | "fail";
  headerFrom?: string;
  envelopeFrom?: string;
  dkimResults?: { domain: string; selector: string; result: string }[];
  spfResults?: { domain: string; scope?: string; result: string }[];
};

export type SampleDmarcReport = {
  /** The domain the report is about (`policy_published`). */
  domain: string;
  reporterOrg?: string;
  reporterEmail?: string;
  reportId?: string;
  begin: Date;
  end: Date;
  policy?: { p?: string; sp?: string; pct?: number; adkim?: string; aspf?: string };
  records: SampleDmarcRecord[];
  /** RFC 9990's namespaced format (`urn:ietf:params:xml:ns:dmarc-2.0`). */
  rfc9990?: boolean;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** The report's XML document. */
export function dmarcReportXml(report: SampleDmarcReport): string {
  const tag = (name: string, value: string | number | undefined) =>
    value === undefined ? "" : `<${name}>${escapeXml(String(value))}</${name}>`;
  const policy = report.policy ?? {};
  const records = report.records
    .map((record) => {
      const headerFrom = record.headerFrom ?? report.domain;
      const dkim = (record.dkimResults ?? [])
        .map(
          (result) =>
            `<dkim>${tag("domain", result.domain)}${tag("selector", result.selector)}${tag("result", result.result)}</dkim>`,
        )
        .join("");
      const spf = (
        record.spfResults ?? [
          { domain: record.envelopeFrom ?? headerFrom, scope: "mfrom", result: record.spf },
        ]
      )
        .map(
          (result) =>
            `<spf>${tag("domain", result.domain)}${tag("scope", result.scope)}${tag("result", result.result)}</spf>`,
        )
        .join("");
      return (
        "<record><row>" +
        tag("source_ip", record.sourceIp) +
        tag("count", record.count) +
        `<policy_evaluated>${tag("disposition", record.disposition ?? "none")}${tag("dkim", record.dkim)}${tag("spf", record.spf)}</policy_evaluated>` +
        "</row><identifiers>" +
        tag("header_from", headerFrom) +
        tag("envelope_from", record.envelopeFrom) +
        `</identifiers><auth_results>${dkim}${spf}</auth_results></record>`
      );
    })
    .join("\n");
  const root = report.rfc9990
    ? '<feedback xmlns="urn:ietf:params:xml:ns:dmarc-2.0">'
    : "<feedback>";
  return [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    root,
    report.rfc9990 ? tag("version", "1.0") : "",
    "<report_metadata>",
    tag("org_name", report.reporterOrg ?? "google.com"),
    tag("email", report.reporterEmail ?? "noreply-dmarc-support@google.com"),
    tag("report_id", report.reportId ?? randomBytes(8).readBigUInt64BE().toString()),
    `<date_range>${tag("begin", Math.floor(report.begin.getTime() / 1000))}${tag("end", Math.floor(report.end.getTime() / 1000))}</date_range>`,
    "</report_metadata>",
    "<policy_published>",
    tag("domain", report.domain),
    tag("adkim", policy.adkim ?? "r"),
    tag("aspf", policy.aspf ?? "r"),
    tag("p", policy.p ?? "none"),
    tag("sp", policy.sp),
    tag("pct", policy.pct),
    "</policy_published>",
    records,
    "</feedback>",
  ].join("\n");
}

/** The report as an email, attached gzip'ed (the default) or as plain XML. */
export function dmarcReportMessage(
  report: SampleDmarcReport,
  options: { to: string; from?: string; encoding?: "gzip" | "xml" } = { to: "" },
): Uint8Array {
  const xml = new TextEncoder().encode(dmarcReportXml(report));
  const reporter = report.reporterOrg ?? "google.com";
  const reportId = report.reportId ?? "sample";
  const base = `${reporter}!${report.domain}!${Math.floor(report.begin.getTime() / 1000)}!${Math.floor(report.end.getTime() / 1000)}`;
  const gzip = (options.encoding ?? "gzip") === "gzip";
  return buildTestMessage({
    from: options.from ?? report.reporterEmail ?? "noreply-dmarc-support@google.com",
    to: [options.to],
    subject: `Report domain: ${report.domain} Submitter: ${reporter} Report-ID: ${reportId}`,
    text: "This is an aggregate report from a mailbox provider.",
    attachments: [
      gzip
        ? { filename: `${base}.xml.gz`, contentType: "application/gzip", content: gzipSync(xml) }
        : { filename: `${base}.xml`, contentType: "text/xml", content: xml },
    ],
  });
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * A plausible day of reports about `target`: most mail through coss.com (signed with its DKIM keys,
 * from its MAIL FROM domain), a forwarder, and an unknown source failing DMARC.
 */
export function sampleDmarcReport(
  target: Pick<DomainRow, "name" | "dkimTokens" | "mailFromDomain">,
  options: { now?: Date; policy?: string; reporterOrg?: string } = {},
): SampleDmarcReport {
  const now = options.now ?? new Date();
  const end = new Date(Math.floor(now.getTime() / DAY) * DAY - 1);
  const begin = new Date(end.getTime() + 1 - DAY);
  const selector = target.dkimTokens[0] ?? "coss";
  const disposition =
    options.policy === "reject"
      ? "reject"
      : options.policy === "quarantine"
        ? "quarantine"
        : "none";
  return {
    domain: target.name,
    reporterOrg: options.reporterOrg ?? "google.com",
    begin,
    end,
    policy: { p: options.policy ?? "none" },
    records: [
      {
        sourceIp: `54.240.8.${randomInt(2, 250)}`,
        count: randomInt(400, 2000),
        dkim: "pass",
        spf: "pass",
        envelopeFrom: target.mailFromDomain,
        dkimResults: [{ domain: target.name, selector, result: "pass" }],
      },
      {
        sourceIp: `54.240.27.${randomInt(2, 250)}`,
        count: randomInt(1, 20),
        dkim: "pass",
        spf: "fail",
        envelopeFrom: "forwarder.example",
        dkimResults: [{ domain: target.name, selector, result: "pass" }],
        spfResults: [{ domain: "forwarder.example", scope: "mfrom", result: "pass" }],
      },
      {
        sourceIp: `203.0.113.${randomInt(2, 250)}`,
        count: randomInt(1, 15),
        disposition,
        dkim: "fail",
        spf: "fail",
        envelopeFrom: target.name,
        spfResults: [{ domain: target.name, scope: "mfrom", result: "softfail" }],
      },
    ],
  };
}

/**
 * Ingests a sample report about `target` as if a mailbox provider had mailed it to the domain's
 * report address (the dashboard's simulator, with the fake provider).
 */
export async function receiveSampleDmarcReport(
  target: DomainRow,
  managedDomain: string,
  options: { now?: Date } = {},
): Promise<DmarcIngestOutcome | null> {
  const now = options.now ?? new Date();
  const address = dmarcReportAddress(target.dmarcReportToken, managedDomain);
  if (!address) return null;
  const parsed = target.dmarcRecord?.match(/\bp\s*=\s*(\w+)/i)?.[1]?.toLowerCase();
  const report = sampleDmarcReport(target, { now, policy: parsed });
  const raw = dmarcReportMessage(report, { to: address });
  const [outcome] = await ingestDmarcReports(
    {
      provider: "fake",
      providerMessageId: `fake-${randomBytes(12).toString("hex")}`,
      raw: async () => raw,
      verdicts: { ...NO_VERDICTS, spf: "pass", dkim: "pass" },
      receivedAt: now,
    },
    [target.dmarcReportToken],
    { managedDomain },
  );
  return outcome ?? null;
}
