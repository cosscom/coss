/**
 * DMARC aggregate reports: mailbox providers mail them to each domain's report address
 * (`rua=mailto:dmarc-<token>@<managed inbound domain>`), COSS's own receiving hands them here
 * (`receiveEmail` splits those recipients off before routing), and the dashboard and API read
 * them back with the guided path to enforcement (`dmarc-guidance.ts`).
 *
 * Report addresses are public (they are in DNS), so ingestion trusts nothing it doesn't check: the
 * token must name a live domain, the message must pass SPF or DKIM (major reporters sign), the
 * report must be about that domain (or a subdomain) and recent, the organization's daily report
 * budget (`email.dmarc_reports.day`) bounds the rest, and a report keeps at most
 * `MAX_DMARC_REPORT_RECORDS` rows. Only the parsed report is stored, never the message.
 *
 * Ingestion resolves the organization itself (from the token), like `receiveEmail`; every read
 * is scoped by organization and domain.
 */
import { db, type Executor, schema } from "@coss/db";
import { ID_PREFIXES, isId, newId } from "@coss/db/id";
import { RETENTION_DAYS } from "@coss/retention";
import { enqueueWebhookMessage } from "@coss/webhooks";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  max,
  min,
  notExists,
  notInArray,
  sql,
} from "drizzle-orm";
import { organizationalDomain } from "./bimi.ts";
import {
  DMARC_READINESS,
  type DmarcGuidance,
  type DmarcReportTotals,
  dmarcGuidance,
} from "./dmarc-guidance.ts";
import {
  type DmarcRecord,
  dmarcReportAddress,
  dmarcReportTokenOf,
  parseDmarcRecord,
} from "./dmarc-record.ts";
import {
  type DmarcAggregateRecord,
  type DmarcAggregateReport,
  DmarcReportError,
  parseDmarcAggregateReport,
  unpackDmarcReport,
} from "./dmarc-report-xml.ts";
import type { DomainRow } from "./domains.ts";
import type { InboundMessage, InboundQuota } from "./inbound.ts";
import { parseInboundMessage } from "./inbound-mime.ts";
import type {
  DmarcReportObjectOutput,
  DmarcReportSummaryOutput,
  DomainDmarcOutput,
  StoredDomainWebhookEvent,
} from "./schemas.ts";

const {
  dmarcNotification,
  dmarcReport,
  dmarcReportRecord,
  domain,
  environment,
  organizationDeletion,
} = schema;

const DAY = 24 * 60 * 60 * 1000;
/** Reports covering more than this are refused (RFC 9990 asks for at most a day; some send a week). */
const MAX_REPORT_PERIOD_MS = 31 * DAY;
/** Allowed clock skew for a report's period end, ahead of when it was received. */
const FUTURE_SKEW_MS = DAY;
const RECORD_CHUNK = 500;
/** Sources returned by the overview (the API's `report_summary.sources`). */
const OVERVIEW_SOURCES = 50;

export type DmarcReportRow = typeof dmarcReport.$inferSelect;
export type DmarcReportRecordRow = typeof dmarcReportRecord.$inferSelect;

export type DmarcIngestDeps = {
  managedDomain: string;
  /** The organization's daily report budget (the worker wires `email.dmarc_reports.day`). */
  quota?: InboundQuota | null;
};

export type DmarcIngestOutcome = {
  token: string;
  kind:
    | "recorded"
    | "duplicate"
    | "unknown_address"
    | "unauthenticated"
    | "over_limit"
    | "invalid"
    | "foreign_domain"
    | "out_of_range";
  domainId?: string;
  dmarcReportId?: string;
};

/** Splits envelope recipients into report tokens (deduplicated) and everything else. */
export function splitDmarcReportRecipients(
  recipients: readonly string[],
  managedDomain: string,
): { tokens: string[]; rest: string[] } {
  const tokens = new Set<string>();
  const rest: string[] = [];
  for (const recipient of recipients) {
    const address = recipient.trim().replace(/^<|>$/g, "").toLowerCase().replace(/\.$/, "");
    const token = dmarcReportTokenOf(address, managedDomain);
    if (token) tokens.add(token);
    else rest.push(recipient);
  }
  return { tokens: [...tokens], rest };
}

/** Whether `name` is `parent` or a subdomain of it. */
function underDomain(name: string, parent: string): boolean {
  return name === parent || name.endsWith(`.${parent}`);
}

/**
 * A record is "via COSS" when it was signed with one of the domain's COSS DKIM keys (its selectors
 * are the provider's DKIM tokens) or its envelope sender is the domain's COSS MAIL FROM domain,
 * whatever the result: COSS mail that fails is exactly what the guide must point out.
 */
export function isViaCoss(
  record: Pick<DmarcAggregateRecord, "authResults" | "envelopeFrom">,
  target: Pick<DomainRow, "name" | "dkimTokens" | "mailFromDomain">,
): boolean {
  const selectors = new Set(target.dkimTokens.map((token) => token.toLowerCase()));
  const signed = record.authResults.dkim.some(
    (dkim) =>
      dkim.selector !== null &&
      selectors.has(dkim.selector) &&
      underDomain(dkim.domain, target.name),
  );
  const mailFrom = target.mailFromDomain.toLowerCase();
  return (
    signed ||
    record.envelopeFrom === mailFrom ||
    record.authResults.spf.some((spf) => spf.domain === mailFrom)
  );
}

/** The first attachment of the message that unpacks to a report. */
async function reportOf(raw: Uint8Array): Promise<DmarcAggregateReport | DmarcReportError> {
  const parsed = await parseInboundMessage(raw);
  let failure = new DmarcReportError("The message has no report attached.");
  for (const attachment of parsed.attachments) {
    try {
      const xml = unpackDmarcReport(attachment.content);
      if (xml) return parseDmarcAggregateReport(xml);
    } catch (error) {
      if (!(error instanceof DmarcReportError)) throw error;
      failure = error;
    }
  }
  return failure;
}

/** The live domain a token names; organizations pending deletion receive nothing more. */
async function domainForToken(token: string) {
  const [row] = await db
    .select()
    .from(domain)
    .where(
      and(
        eq(domain.dmarcReportToken, token),
        notInArray(domain.status, ["failed", "deleting"]),
        notExists(
          db
            .select({ one: sql`1` })
            .from(organizationDeletion)
            .where(
              and(
                eq(organizationDeletion.organizationId, domain.organizationId),
                eq(organizationDeletion.status, "pending"),
              ),
            ),
        ),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Records the report a message carries for every domain whose address it was sent to. Throws only
 * on infrastructure failures (database), so the provider notification is retried; reports that
 * can't be accepted are dropped with a warning.
 */
export async function ingestDmarcReports(
  message: Pick<InboundMessage, "provider" | "providerMessageId" | "verdicts" | "receivedAt"> & {
    raw: () => Promise<Uint8Array>;
  },
  tokens: readonly string[],
  deps: DmarcIngestDeps,
): Promise<DmarcIngestOutcome[]> {
  const outcomes: DmarcIngestOutcome[] = [];
  let report: DmarcAggregateReport | DmarcReportError | null = null;
  const drop = (outcome: DmarcIngestOutcome, why: string) => {
    console.warn(
      `[email:dmarc] report ${message.providerMessageId} for ${outcome.domainId ?? outcome.token} dropped: ${why}`,
    );
    outcomes.push(outcome);
  };
  for (const token of tokens) {
    const target = await domainForToken(token);
    if (!target) {
      outcomes.push({ token, kind: "unknown_address" });
      continue;
    }
    const base = { token, domainId: target.id };
    if (message.verdicts.spf !== "pass" && message.verdicts.dkim !== "pass") {
      drop({ ...base, kind: "unauthenticated" }, "the message passed neither SPF nor DKIM");
      continue;
    }
    // Charged before anything is unpacked or parsed: the budget bounds the work too, and an
    // invalid report counts against it.
    if (
      deps.quota &&
      !(await deps.quota.consume(
        target.organizationId,
        JSON.stringify(["dmarc", target.id, message.provider, message.providerMessageId]),
      ))
    ) {
      drop({ ...base, kind: "over_limit" }, "the organization's daily report limit is reached");
      continue;
    }
    report ??= await reportOf(await message.raw());
    if (report instanceof DmarcReportError) {
      drop({ ...base, kind: "invalid" }, report.message);
      continue;
    }
    if (!underDomain(report.policyPublished.domain, target.name)) {
      drop(
        { ...base, kind: "foreign_domain" },
        `it is about ${report.policyPublished.domain}, not ${target.name}`,
      );
      continue;
    }
    const begin = report.periodBegin.getTime();
    const end = report.periodEnd.getTime();
    const received = message.receivedAt.getTime();
    if (
      end < begin ||
      end - begin > MAX_REPORT_PERIOD_MS ||
      end > received + FUTURE_SKEW_MS ||
      end < received - RETENTION_DAYS.dmarcReports * DAY
    ) {
      drop({ ...base, kind: "out_of_range" }, "its period is implausible or too old");
      continue;
    }
    const recorded = await recordReport(target, report, message, deps.managedDomain);
    outcomes.push(
      recorded
        ? { ...base, kind: "recorded", dmarcReportId: recorded }
        : { ...base, kind: "duplicate" },
    );
  }
  return outcomes;
}

/** Inserts the report and its records, announces it and queues notifications: one transaction. */
async function recordReport(
  target: DomainRow,
  report: DmarcAggregateReport,
  message: Pick<InboundMessage, "provider" | "providerMessageId" | "receivedAt">,
  managedDomain: string,
): Promise<string | null> {
  const records = report.records.map((record, position) => ({
    ...record,
    position,
    dmarcPass: record.dkim === "pass" || record.spf === "pass",
    viaCoss: isViaCoss(record, target),
  }));
  const messageCount = records.reduce((total, record) => total + record.count, 0);
  const passCount = records.reduce(
    (total, record) => total + (record.dmarcPass ? record.count : 0),
    0,
  );
  return db.transaction(async (tx) => {
    const id = newId(ID_PREFIXES.dmarcReport);
    const [inserted] = await tx
      .insert(dmarcReport)
      .values({
        id,
        organizationId: target.organizationId,
        domainId: target.id,
        reporterOrg: report.reporterOrg,
        reporterEmail: report.reporterEmail,
        reportId: report.reportId,
        periodBegin: report.periodBegin,
        periodEnd: report.periodEnd,
        policyPublished: report.policyPublished,
        messageCount: Math.min(messageCount, 2 ** 31 - 1),
        passCount: Math.min(passCount, 2 ** 31 - 1),
        truncated: report.truncated,
        provider: message.provider,
        providerMessageId: message.providerMessageId,
        createdAt: message.receivedAt,
      })
      .onConflictDoNothing()
      .returning({ id: dmarcReport.id });
    if (!inserted) return null;
    for (let start = 0; start < records.length; start += RECORD_CHUNK) {
      await tx.insert(dmarcReportRecord).values(
        records.slice(start, start + RECORD_CHUNK).map((record) => ({
          organizationId: target.organizationId,
          domainId: target.id,
          dmarcReportId: id,
          periodBegin: report.periodBegin,
          periodEnd: report.periodEnd,
          sourceIp: record.sourceIp,
          count: record.count,
          disposition: record.disposition,
          dkim: record.dkim,
          spf: record.spf,
          dmarcPass: record.dmarcPass,
          headerFrom: record.headerFrom,
          envelopeFrom: record.envelopeFrom,
          authResults: record.authResults,
          reasons: record.reasons,
          viaCoss: record.viaCoss,
          position: record.position,
        })),
      );
    }
    await announceReport(tx, target, {
      dmarc_report_id: id,
      reporter: report.reporterOrg,
      period_start: report.periodBegin.toISOString(),
      period_end: report.periodEnd.toISOString(),
      messages: messageCount,
      passing: passCount,
      occurredAt: message.receivedAt,
    });
    await queueNotifications(tx, target, managedDomain, message.receivedAt);
    return id;
  });
}

/**
 * `domain.dmarc_report_received`: domains belong to the organization, so (like `account.*` and
 * `billing.*`) the event goes to the endpoints of every live environment.
 */
async function announceReport(
  tx: Executor,
  target: DomainRow,
  data: Omit<
    StoredDomainWebhookEvent["data"],
    "organization_id" | "domain_id" | "domain" | "occurred_at"
  > & { occurredAt: Date },
): Promise<void> {
  const { occurredAt, ...rest } = data;
  const environments = await tx
    .select({ id: environment.id })
    .from(environment)
    .where(
      and(eq(environment.organizationId, target.organizationId), eq(environment.mode, "live")),
    );
  const now = new Date();
  for (const { id: environmentId } of environments) {
    const payload: StoredDomainWebhookEvent = {
      id: newId(ID_PREFIXES.webhookEvent),
      object: "event",
      type: "domain.dmarc_report_received",
      created_at: now.toISOString(),
      data: {
        organization_id: target.organizationId,
        domain_id: target.id,
        domain: target.name,
        ...rest,
        occurred_at: occurredAt.toISOString(),
      },
    };
    await enqueueWebhookMessage(tx, {
      id: payload.id,
      organizationId: target.organizationId,
      environmentId,
      type: payload.type,
      payload: payload as unknown as Record<string, unknown>,
      now,
    });
  }
}

/** ISO 8601 week of a date (`2026-W41`): pass rate alerts repeat at most weekly. */
function isoWeek(date: Date): string {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day.getTime() - yearStart) / DAY + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Queues the owners' emails the new report makes due: the domain became ready for the next
 * policy (once per policy epoch), or mail sent through COSS fails DMARC under an enforcing policy
 * (once per epoch and week).
 */
async function queueNotifications(
  tx: Executor,
  target: DomainRow,
  managedDomain: string,
  now: Date,
): Promise<void> {
  const totals = await dmarcTotals(tx, target, now);
  const { guidance } = guidanceFor(
    target,
    dmarcReportAddress(target.dmarcReportToken, managedDomain),
    totals,
    now,
  );
  const epoch = target.dmarcPolicyChangedAt?.toISOString() ?? "unchecked";
  const rows: (typeof dmarcNotification.$inferInsert)[] = [];
  const base = {
    organizationId: target.organizationId,
    domainId: target.id,
    policyChangedAt: target.dmarcPolicyChangedAt,
    nextAttemptAt: now,
  };
  if (guidance.ready && guidance.next?.kind === "tighten" && guidance.next.policy !== "none") {
    const kind = guidance.next.policy === "quarantine" ? "ready_quarantine" : "ready_reject";
    rows.push({
      ...base,
      kind,
      dedupeKey: `${kind}:${target.id}:${epoch}`,
      detail: { record: guidance.next.record },
    });
  }
  const policy = guidance.policy;
  const cossRate = totals.cossMessages > 0 ? totals.cossPassing / totals.cossMessages : 1;
  if (
    (policy === "quarantine" || policy === "reject") &&
    totals.cossMessages >= DMARC_READINESS.alertMinMessages &&
    cossRate < DMARC_READINESS.cossPassRate
  ) {
    rows.push({
      ...base,
      kind: "pass_rate_dropped",
      dedupeKey: `pass_rate_dropped:${target.id}:${epoch}:${isoWeek(now)}`,
      detail: { policy, coss_pass_rate: cossRate, coss_messages: totals.cossMessages },
    });
  }
  if (rows.length > 0) await tx.insert(dmarcNotification).values(rows).onConflictDoNothing();
}

/** A domain's guidance from its last DNS check (own record, else inherited) and its totals. */
function guidanceFor(
  row: DomainRow,
  reportAddress: string | null,
  totals: DmarcReportTotals,
  now: Date,
): { guidance: DmarcGuidance; record: DmarcRecord | null } {
  const record = row.dmarcRecord ? parseDmarcRecord(row.dmarcRecord) : null;
  const inherited = row.dmarcInheritedRecord ? parseDmarcRecord(row.dmarcInheritedRecord) : null;
  const guidance = dmarcGuidance({
    record,
    invalid: row.dmarcRecord !== null && record === null,
    inherited: inherited ? { domain: organizationalDomain(row.name), record: inherited } : null,
    checked: row.dmarcPolicyChangedAt !== null,
    policySince: row.dmarcPolicyChangedAt,
    reportAddress,
    totals,
    now,
  });
  return { guidance, record };
}

// --- Reads --------------------------------------------------------------------------------------

type DomainScope = { organizationId: string; domainId: string };

function recordScope(scope: DomainScope, since: Date) {
  return and(
    eq(dmarcReportRecord.organizationId, scope.organizationId),
    eq(dmarcReportRecord.domainId, scope.domainId),
    gte(dmarcReportRecord.periodEnd, since),
  );
}

/** Aggregates of the domain's reports over the readiness window (`DMARC_READINESS.windowDays`). */
export async function dmarcTotals(
  executor: Executor,
  target: Pick<DomainRow, "id" | "organizationId">,
  now: Date = new Date(),
): Promise<DmarcReportTotals & { reports: number; since: Date }> {
  const scope = { organizationId: target.organizationId, domainId: target.id };
  const since = new Date(now.getTime() - DMARC_READINESS.windowDays * DAY);
  const messages = sql<string>`coalesce(sum(${dmarcReportRecord.count}), 0)`;
  const passing = sql<string>`coalesce(sum(${dmarcReportRecord.count}) filter (where ${dmarcReportRecord.dmarcPass}), 0)`;
  // One after another: inside a transaction they share one connection.
  const [totals] = await executor
    .select({
      messages,
      passing,
      cossMessages: sql<string>`coalesce(sum(${dmarcReportRecord.count}) filter (where ${dmarcReportRecord.viaCoss}), 0)`,
      cossPassing: sql<string>`coalesce(sum(${dmarcReportRecord.count}) filter (where ${dmarcReportRecord.viaCoss} and ${dmarcReportRecord.dmarcPass}), 0)`,
    })
    .from(dmarcReportRecord)
    .where(recordScope(scope, since));
  const sources = await executor
    .select({
      sourceIp: dmarcReportRecord.sourceIp,
      headerFrom: dmarcReportRecord.headerFrom,
      messages,
      passing,
      viaCoss: dmarcReportRecord.viaCoss,
    })
    .from(dmarcReportRecord)
    .where(recordScope(scope, since))
    // COSS's mail and another sender's from the same IP (two SES integrations, say) stay apart,
    // so the other's failures still count against readiness.
    .groupBy(dmarcReportRecord.sourceIp, dmarcReportRecord.headerFrom, dmarcReportRecord.viaCoss)
    .orderBy(desc(sql`sum(${dmarcReportRecord.count})`))
    .limit(1000);
  const ofDomain = and(
    eq(dmarcReport.organizationId, scope.organizationId),
    eq(dmarcReport.domainId, scope.domainId),
  );
  const [span] = await executor
    .select({ first: min(dmarcReport.periodBegin), last: max(dmarcReport.periodEnd) })
    .from(dmarcReport)
    .where(ofDomain);
  const [reports] = await executor
    .select({
      value: count(),
      truncated: sql<string>`count(*) filter (where ${dmarcReport.truncated})`,
    })
    .from(dmarcReport)
    .where(and(ofDomain, gte(dmarcReport.periodEnd, since)));
  return {
    messages: Number(totals?.messages ?? 0),
    passing: Number(totals?.passing ?? 0),
    cossMessages: Number(totals?.cossMessages ?? 0),
    cossPassing: Number(totals?.cossPassing ?? 0),
    sources: sources.map((source) => ({
      sourceIp: source.sourceIp,
      headerFrom: source.headerFrom,
      messages: Number(source.messages),
      passing: Number(source.passing),
      viaCoss: Boolean(source.viaCoss),
    })),
    firstReportAt: span?.first ?? null,
    lastReportAt: span?.last ?? null,
    truncatedReports: Number(reports?.truncated ?? 0),
    reports: reports?.value ?? 0,
    since,
  };
}

/** The domain's DMARC state, guidance and recent reports (`GET /v1/domains/{id}/dmarc`). */
export async function dmarcOverview(
  row: DomainRow,
  dmarcReportDomain: string | null,
  now: Date = new Date(),
): Promise<DomainDmarcOutput> {
  const totals = await dmarcTotals(db, row, now);
  const reportAddress = dmarcReportAddress(row.dmarcReportToken, dmarcReportDomain);
  const { guidance, record } = guidanceFor(row, reportAddress, totals, now);
  return {
    object: "domain_dmarc",
    domain_id: row.id,
    report_address: reportAddress,
    record:
      record && row.dmarcRecord
        ? {
            value: row.dmarcRecord,
            p: record.p,
            sp: record.sp,
            np: record.np,
            adkim: record.adkim,
            aspf: record.aspf,
            pct: record.pct,
            t: record.t,
            rua: record.rua,
          }
        : null,
    policy: guidance.policy,
    inherited_from: guidance.inheritedFrom,
    policy_since: row.dmarcPolicyChangedAt?.toISOString() ?? null,
    stage: guidance.stage,
    partial: guidance.partial,
    reporting: guidance.reporting,
    ready: guidance.ready,
    next: guidance.next,
    checks: guidance.checks,
    warnings: guidance.warnings,
    report_summary: {
      period_start: totals.since.toISOString(),
      period_end: now.toISOString(),
      reports: totals.reports,
      messages: totals.messages,
      passing: totals.passing,
      coss_messages: totals.cossMessages,
      coss_passing: totals.cossPassing,
      first_report_at: totals.firstReportAt?.toISOString() ?? null,
      last_report_at: totals.lastReportAt?.toISOString() ?? null,
      sources: totals.sources.slice(0, OVERVIEW_SOURCES).map((source) => ({
        source_ip: source.sourceIp,
        header_from: source.headerFrom,
        messages: source.messages,
        passing: source.passing,
        via_coss: source.viaCoss,
      })),
    },
  };
}

export type DmarcDay = {
  /** UTC day, `YYYY-MM-DD`. */
  day: string;
  passing: number;
  /** Failing messages by what receivers did with them. */
  none: number;
  quarantine: number;
  reject: number;
};

/** Messages per UTC day of the reports' periods (the dashboard's chart), oldest first. */
export async function dmarcDailySeries(
  scope: DomainScope & { days: number; now?: Date },
): Promise<DmarcDay[]> {
  const now = scope.now ?? new Date();
  const since = new Date(now.getTime() - scope.days * DAY);
  const day = sql<string>`to_char(date_trunc('day', ${dmarcReportRecord.periodBegin} at time zone 'UTC'), 'YYYY-MM-DD')`;
  const failing = (disposition: string) =>
    sql<string>`coalesce(sum(${dmarcReportRecord.count}) filter (where not ${dmarcReportRecord.dmarcPass} and ${dmarcReportRecord.disposition} = ${disposition}), 0)`;
  const rows = await db
    .select({
      day,
      passing: sql<string>`coalesce(sum(${dmarcReportRecord.count}) filter (where ${dmarcReportRecord.dmarcPass}), 0)`,
      none: failing("none"),
      quarantine: failing("quarantine"),
      reject: failing("reject"),
    })
    .from(dmarcReportRecord)
    .where(recordScope(scope, since))
    .groupBy(day)
    .orderBy(day);
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const series: DmarcDay[] = [];
  for (let offset = scope.days - 1; offset >= 0; offset--) {
    const key = new Date(now.getTime() - offset * DAY).toISOString().slice(0, 10);
    const row = byDay.get(key);
    series.push({
      day: key,
      passing: Number(row?.passing ?? 0),
      none: Number(row?.none ?? 0),
      quarantine: Number(row?.quarantine ?? 0),
      reject: Number(row?.reject ?? 0),
    });
  }
  return series;
}

function toReportSummary(row: DmarcReportRow): DmarcReportSummaryOutput {
  return {
    object: "dmarc_report",
    id: row.id,
    domain_id: row.domainId,
    reporter: { org_name: row.reporterOrg, email: row.reporterEmail },
    report_id: row.reportId,
    period_start: row.periodBegin.toISOString(),
    period_end: row.periodEnd.toISOString(),
    policy_published: row.policyPublished,
    messages: row.messageCount,
    passing: row.passCount,
    truncated: row.truncated,
    received_at: row.createdAt.toISOString(),
  };
}

/** A page of the domain's reports, newest first (cursor: the last id of the previous page). */
export async function listDmarcReports(
  input: DomainScope & { limit: number; after?: string | undefined },
): Promise<{ data: DmarcReportSummaryOutput[]; hasMore: boolean }> {
  const rows = await db
    .select()
    .from(dmarcReport)
    .where(
      and(
        eq(dmarcReport.organizationId, input.organizationId),
        eq(dmarcReport.domainId, input.domainId),
        input.after ? lt(dmarcReport.id, input.after) : undefined,
      ),
    )
    .orderBy(desc(dmarcReport.id))
    .limit(input.limit + 1);
  return {
    data: rows.slice(0, input.limit).map(toReportSummary),
    hasMore: rows.length > input.limit,
  };
}

/** One report with its records, or `null` (malformed, unknown or another domain's id). */
export async function getDmarcReport(
  input: DomainScope & { id: string },
): Promise<DmarcReportObjectOutput | null> {
  if (!isId(ID_PREFIXES.dmarcReport, input.id)) return null;
  const [row] = await db
    .select()
    .from(dmarcReport)
    .where(
      and(
        eq(dmarcReport.id, input.id),
        eq(dmarcReport.organizationId, input.organizationId),
        eq(dmarcReport.domainId, input.domainId),
      ),
    )
    .limit(1);
  if (!row) return null;
  const records = await db
    .select()
    .from(dmarcReportRecord)
    .where(
      and(
        eq(dmarcReportRecord.dmarcReportId, row.id),
        eq(dmarcReportRecord.organizationId, input.organizationId),
      ),
    )
    .orderBy(dmarcReportRecord.position);
  return {
    ...toReportSummary(row),
    records: records.map((record) => ({
      source_ip: record.sourceIp,
      count: record.count,
      disposition: record.disposition as DmarcAggregateRecord["disposition"],
      dkim: record.dkim as DmarcAggregateRecord["dkim"],
      spf: record.spf as DmarcAggregateRecord["spf"],
      dmarc_pass: record.dmarcPass,
      header_from: record.headerFrom,
      envelope_from: record.envelopeFrom,
      via_coss: record.viaCoss,
      auth_results: record.authResults,
      reasons: record.reasons,
    })),
  };
}

/**
 * Deletes the organization's reports in batches (organization deletion, before its domains go, so
 * no domain delete cascades into a large number of records at once).
 */
export async function deleteOrganizationDmarcReports(
  organizationId: string,
  assertLease: () => Promise<void> = async () => {},
  batchSize = 1000,
): Promise<void> {
  for (const table of [dmarcReportRecord, dmarcReport] as const) {
    for (;;) {
      await assertLease();
      const batch = db
        .select({ id: table.id })
        .from(table)
        .where(eq(table.organizationId, organizationId))
        .limit(batchSize);
      const deleted = await db
        .delete(table)
        .where(inArray(table.id, batch))
        .returning({ id: table.id });
      if (deleted.length < batchSize) break;
    }
  }
}
