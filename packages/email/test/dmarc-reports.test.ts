import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { and, eq } from "drizzle-orm";
import { unauthenticatedSources } from "../src/dmarc-guidance.ts";
import { dmarcReportAddress } from "../src/dmarc-record.ts";
import {
  deleteOrganizationDmarcReports,
  dmarcDailySeries,
  dmarcOverview,
  dmarcTotals,
  getDmarcReport,
  ingestDmarcReports,
  isViaCoss,
  listDmarcReports,
} from "../src/dmarc-reports.ts";
import {
  dmarcReportMessage,
  type SampleDmarcReport,
  sampleDmarcReport,
} from "../src/dmarc-sample.ts";
import { checkDomain, type DomainDeps, type DomainRow } from "../src/domains.ts";
import { type InboundMessage, NO_VERDICTS, receiveEmail } from "../src/inbound.ts";
import { inboundAddressFor } from "../src/inbound-address.ts";
import { buildTestMessage } from "../src/inbound-mime.ts";
import { FakeInboundStore } from "../src/inbound-store.ts";
import { FakeIdentityProvider } from "../src/providers/fake-identity.ts";
import { FakeTrackingHostnameProvider } from "../src/providers/fake-tracking-hostnames.ts";
import { purgeExpiredDmarcReports } from "../src/retention.ts";
import { DmarcReportObject, DomainDmarc, DomainWebhookEvent } from "../src/schemas.ts";
import { createVerifiedDomain, fakeDnsResolver } from "../src/testing.ts";

const MANAGED = "inbound.coss.test";
const DAY = 24 * 60 * 60 * 1000;
const deps = { store: new FakeInboundStore(), managedDomain: MANAGED };

function addressOf(row: DomainRow): string {
  return dmarcReportAddress(row.dmarcReportToken, MANAGED) as string;
}

function reportFor(row: DomainRow, overrides: Partial<SampleDmarcReport> = {}): SampleDmarcReport {
  return {
    ...sampleDmarcReport(row),
    reportId: `r-${uniqueSuffix()}`,
    ...overrides,
  };
}

function message(
  raw: Uint8Array,
  recipients: string[],
  overrides: Partial<InboundMessage> = {},
): InboundMessage {
  return {
    provider: "fake",
    providerMessageId: `msg-${uniqueSuffix()}`,
    mailFrom: "noreply-dmarc-support@google.com",
    recipients,
    raw: async () => raw,
    verdicts: { ...NO_VERDICTS, spf: "pass", dkim: "pass", spam: "pass", virus: "pass" },
    receivedAt: new Date(),
    ...overrides,
  };
}

async function reportsOf(domainId: string) {
  return db.select().from(schema.dmarcReport).where(eq(schema.dmarcReport.domainId, domainId));
}

async function setup() {
  const tenant = await createTestTenant();
  const row = await createVerifiedDomain(tenant.organization.id);
  return { tenant, row, organizationId: tenant.organization.id };
}

describe("ingesting reports", () => {
  test("a report address is split off; other recipients are received as usual", async () => {
    const { tenant, row } = await setup();
    const { domain: inbound } = await inboundAddressFor(
      { organizationId: tenant.organization.id, environmentId: tenant.production.id },
      MANAGED,
    );
    const raw = dmarcReportMessage(reportFor(row), { to: addressOf(row) });
    const outcomes = await receiveEmail(
      message(raw, [`<${addressOf(row).toUpperCase()}>`, `support@${inbound}`]),
      deps,
    );
    expect(outcomes.map((outcome) => outcome.kind)).toEqual(["received"]);
    expect(outcomes[0]?.recipients).toEqual([`support@${inbound}`]);
    const [report] = await reportsOf(row.id);
    expect(report).toMatchObject({
      organizationId: tenant.organization.id,
      reporterOrg: "google.com",
      provider: "fake",
      truncated: false,
    });
    const records = await db
      .select()
      .from(schema.dmarcReportRecord)
      .where(eq(schema.dmarcReportRecord.dmarcReportId, report?.id ?? ""))
      .orderBy(schema.dmarcReportRecord.position);
    // COSS mail, a forwarder signed with COSS's keys, and an unknown failing source.
    expect(records.map((record) => [record.viaCoss, record.dmarcPass])).toEqual([
      [true, true],
      [true, true],
      [false, false],
    ]);
    expect(report?.messageCount).toBe(records.reduce((total, record) => total + record.count, 0));
    // Nothing of the report message is kept as a received email.
    const received = await db
      .select({ recipients: schema.receivedEmail.recipients })
      .from(schema.receivedEmail)
      .where(eq(schema.receivedEmail.organizationId, tenant.organization.id));
    expect(received.flatMap((email) => email.recipients)).toEqual([`support@${inbound}`]);
  });

  test("drops what can't be trusted", async () => {
    const { row } = await setup();
    const address = addressOf(row);
    const ingest = (
      raw: Uint8Array,
      overrides: Partial<InboundMessage> = {},
      token = row.dmarcReportToken,
    ) =>
      ingestDmarcReports(message(raw, [address], overrides), [token], { managedDomain: MANAGED });
    const raw = dmarcReportMessage(reportFor(row), { to: address });

    expect((await ingest(raw, {}, "zzzzzzzzzzzzzzzz"))[0]?.kind).toBe("unknown_address");
    expect(
      (await ingest(raw, { verdicts: { ...NO_VERDICTS, spf: "fail", dkim: "gray" } }))[0]?.kind,
    ).toBe("unauthenticated");
    const foreign = dmarcReportMessage(reportFor(row, { domain: "other.test" }), { to: address });
    expect((await ingest(foreign))[0]?.kind).toBe("foreign_domain");
    const old = new Date(Date.now() - 200 * DAY);
    const stale = dmarcReportMessage(
      reportFor(row, { begin: old, end: new Date(old.getTime() + DAY) }),
      { to: address },
    );
    expect((await ingest(stale))[0]?.kind).toBe("out_of_range");
    const notAReport = buildTestMessage({
      from: "x@y.test",
      to: [address],
      subject: "hi",
      text: "hi",
    });
    expect((await ingest(notAReport))[0]?.kind).toBe("invalid");
    expect(await reportsOf(row.id)).toHaveLength(0);

    // A subdomain's report belongs to the domain.
    const sub = dmarcReportMessage(reportFor(row, { domain: `mail.${row.name}` }), { to: address });
    expect((await ingest(sub))[0]?.kind).toBe("recorded");
  });

  test("organizations being deleted get no more reports", async () => {
    const { tenant, row } = await setup();
    await db.insert(schema.organizationDeletion).values({
      organizationId: tenant.organization.id,
      organizationName: tenant.organization.name,
      organizationSlug: tenant.organization.slug,
      requestedByEmail: "owner@example.com",
      // Never claimed by a deletion run.
      nextAttemptAt: null,
    });
    const address = addressOf(row);
    const [outcome] = await ingestDmarcReports(
      message(dmarcReportMessage(reportFor(row), { to: address }), [address]),
      [row.dmarcReportToken],
      { managedDomain: MANAGED },
    );
    expect(outcome?.kind).toBe("unknown_address");
    expect(await reportsOf(row.id)).toHaveLength(0);
  });

  test("records a report once, and charges the organization's report budget", async () => {
    const { row, organizationId } = await setup();
    const address = addressOf(row);
    const report = reportFor(row);
    const raw = dmarcReportMessage(report, { to: address });
    const charged: string[] = [];
    let allow = true;
    const quota = {
      async consume(orgId: string, key: string) {
        charged.push(`${orgId}:${key}`);
        return allow;
      },
    };
    const first = await ingestDmarcReports(message(raw, [address]), [row.dmarcReportToken], {
      managedDomain: MANAGED,
      quota,
    });
    expect(first[0]?.kind).toBe("recorded");
    // The reporter resends the same report in a new message.
    const again = await ingestDmarcReports(message(raw, [address]), [row.dmarcReportToken], {
      managedDomain: MANAGED,
      quota,
    });
    expect(again[0]?.kind).toBe("duplicate");
    expect(charged).toHaveLength(2);
    expect(charged[0]).toStartWith(`${organizationId}:`);
    // Over the budget, nothing is even read: the budget bounds the parsing work too.
    allow = false;
    let reads = 0;
    const over = await ingestDmarcReports(
      message(dmarcReportMessage(reportFor(row), { to: address }), [address], {
        raw: async () => {
          reads++;
          return raw;
        },
      }),
      [row.dmarcReportToken],
      { managedDomain: MANAGED, quota },
    );
    expect(over[0]?.kind).toBe("over_limit");
    expect(reads).toBe(0);
    expect(await reportsOf(row.id)).toHaveLength(1);
    // An invalid report is charged as well.
    allow = true;
    const invalid = buildTestMessage({
      from: "x@y.test",
      to: [address],
      subject: "hi",
      text: "hi",
    });
    expect(
      (
        await ingestDmarcReports(message(invalid, [address]), [row.dmarcReportToken], {
          managedDomain: MANAGED,
          quota,
        })
      )[0]?.kind,
    ).toBe("invalid");
    expect(charged).toHaveLength(4);
  });

  test("COSS's mail and another sender's from one IP stay separate sources", async () => {
    const { row, organizationId } = await setup();
    const address = addressOf(row);
    const selector = row.dkimTokens[0] ?? "coss";
    const report = reportFor(row, {
      records: [
        {
          sourceIp: "54.240.8.9",
          count: 985,
          dkim: "pass",
          spf: "pass",
          envelopeFrom: row.mailFromDomain,
          dkimResults: [{ domain: row.name, selector, result: "pass" }],
        },
        {
          sourceIp: "54.240.8.9",
          count: 15,
          dkim: "fail",
          spf: "fail",
          envelopeFrom: "other-esp.example",
          spfResults: [{ domain: "other-esp.example", scope: "mfrom", result: "pass" }],
        },
      ],
    });
    await ingestDmarcReports(
      message(dmarcReportMessage(report, { to: address }), [address]),
      [row.dmarcReportToken],
      { managedDomain: MANAGED },
    );
    const totals = await dmarcTotals(db, { id: row.id, organizationId });
    expect(totals.sources.map((source) => [source.viaCoss, source.messages])).toEqual([
      [true, 985],
      [false, 15],
    ]);
    expect(unauthenticatedSources(totals)).toHaveLength(1);
  });

  test("announces the report to every live environment", async () => {
    const { tenant, row } = await setup();
    for (const environment of [tenant.production, tenant.development]) {
      await createWebhookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: environment.id,
          url: "https://example.com/hook",
          eventTypes: [],
          apiVersion: LATEST_API_VERSION,
          userId: null,
        },
        testManagementDeps,
      );
    }
    const [outcome] = await ingestDmarcReports(
      message(dmarcReportMessage(reportFor(row), { to: addressOf(row) }), [addressOf(row)]),
      [row.dmarcReportToken],
      { managedDomain: MANAGED },
    );
    const messages = await db
      .select()
      .from(schema.webhookMessage)
      .where(
        and(
          eq(schema.webhookMessage.organizationId, tenant.organization.id),
          eq(schema.webhookMessage.type, "domain.dmarc_report_received"),
        ),
      );
    expect(messages.map((m) => m.environmentId)).toEqual([tenant.production.id]);
    const payload = { ...messages[0]?.payload, api_version: "2026-01-01" };
    const event = DomainWebhookEvent.parse(payload);
    expect(event.data).toMatchObject({
      organization_id: tenant.organization.id,
      domain_id: row.id,
      domain: row.name,
      dmarc_report_id: outcome?.dmarcReportId,
      reporter: "google.com",
    });
    expect(JSON.stringify(payload)).not.toContain("54.240.");
  });
});

describe("isViaCoss", () => {
  const target = { name: "acme.test", dkimTokens: ["tok1"], mailFromDomain: "send.acme.test" };
  const none = { dkim: [], spf: [] };
  test("by COSS's DKIM selectors on the domain, or its MAIL FROM domain", () => {
    expect(
      isViaCoss(
        {
          envelopeFrom: null,
          authResults: {
            dkim: [{ domain: "acme.test", selector: "tok1", result: "fail" }],
            spf: [],
          },
        },
        target,
      ),
    ).toBe(true);
    expect(
      isViaCoss(
        {
          envelopeFrom: null,
          authResults: {
            dkim: [{ domain: "evil.test", selector: "tok1", result: "pass" }],
            spf: [],
          },
        },
        target,
      ),
    ).toBe(false);
    expect(isViaCoss({ envelopeFrom: "send.acme.test", authResults: none }, target)).toBe(true);
    expect(isViaCoss({ envelopeFrom: "acme.test", authResults: none }, target)).toBe(false);
  });
});

describe("reading reports", () => {
  test("overview, daily series, pages and one report, scoped by organization", async () => {
    const { row, organizationId } = await setup();
    const other = await createTestTenant();
    const now = new Date();
    for (let day = 3; day >= 1; day--) {
      const end = new Date(Math.floor(now.getTime() / DAY) * DAY - (day - 1) * DAY - 1);
      const sample = reportFor(row, { begin: new Date(end.getTime() + 1 - DAY), end });
      // Distinct source IPs (the sample's are random): nine sources in all.
      const records = sample.records.map((record, index) => ({
        ...record,
        sourceIp: `192.0.2.${day * 10 + index}`,
      }));
      await ingestDmarcReports(
        message(
          dmarcReportMessage(
            { ...sample, records },
            {
              to: addressOf(row),
            },
          ),
          [addressOf(row)],
        ),
        [row.dmarcReportToken],
        { managedDomain: MANAGED },
      );
    }
    const overview = await dmarcOverview(row, MANAGED, now);
    expect(DomainDmarc.parse(overview)).toEqual(overview);
    expect(overview).toMatchObject({
      domain_id: row.id,
      report_address: addressOf(row),
      record: null,
      // createVerifiedDomain never ran a DNS check.
      stage: "not_checked",
      next: { kind: "publish", policy: "none" },
    });
    expect(overview.report_summary.reports).toBe(3);
    expect(overview.report_summary.messages).toBeGreaterThan(
      overview.report_summary.coss_messages - 1,
    );
    expect(overview.report_summary.sources.length).toBe(9);

    const series = await dmarcDailySeries({ organizationId, domainId: row.id, days: 7, now });
    expect(series).toHaveLength(7);
    expect(series.reduce((total, day) => total + day.passing + day.none, 0)).toBe(
      overview.report_summary.messages,
    );

    const page = await listDmarcReports({ organizationId, domainId: row.id, limit: 2 });
    expect(page.hasMore).toBe(true);
    const rest = await listDmarcReports({
      organizationId,
      domainId: row.id,
      limit: 2,
      after: page.data[1]?.id,
    });
    expect(rest).toMatchObject({ hasMore: false });
    expect(rest.data).toHaveLength(1);

    const id = page.data[0]?.id ?? "";
    const report = await getDmarcReport({ organizationId, domainId: row.id, id });
    expect(DmarcReportObject.parse(report)).toEqual(report as never);
    expect(report?.records).toHaveLength(3);
    expect(
      await getDmarcReport({ organizationId: other.organization.id, domainId: row.id, id }),
    ).toBeNull();
    expect(await getDmarcReport({ organizationId, domainId: row.id, id: "nope" })).toBeNull();
    expect(
      (
        await listDmarcReports({
          organizationId: other.organization.id,
          domainId: row.id,
          limit: 5,
        })
      ).data,
    ).toEqual([]);
  });
});

describe("the DNS check", () => {
  test("stores the published DMARC record and when its policy changed", async () => {
    const { row, organizationId } = await setup();
    const record = (value: string | null) =>
      fakeDnsResolver(value === null ? {} : { [`TXT _dmarc.${row.name}`]: [[value]] });
    const check = (value: string | null, now: Date) =>
      checkDomain({ organizationId, id: row.id, now }, {
        identity: new FakeIdentityProvider(),
        dns: record(value),
        tracking: new FakeTrackingHostnameProvider(),
        dmarcReportDomain: MANAGED,
      } satisfies DomainDeps);
    const t0 = new Date();
    const first = await check(null, t0);
    expect(first).toMatchObject({ dmarcRecord: null, dmarcPolicyChangedAt: t0 });
    expect(first.records.find((r) => r.purpose === "dmarc")?.value).toBe(
      `v=DMARC1; p=none; rua=mailto:${addressOf(row)};`,
    );
    const t1 = new Date(t0.getTime() + 1000);
    const none = await check(`v=DMARC1; p=none; rua=mailto:${addressOf(row)}`, t1);
    expect(none).toMatchObject({ dmarcPolicyChangedAt: t1 });
    // Same policy, other tags: the epoch stays.
    const t2 = new Date(t1.getTime() + 1000);
    expect((await check("v=DMARC1; p=none; fo=1", t2)).dmarcPolicyChangedAt).toEqual(t1);
    const t3 = new Date(t2.getTime() + 1000);
    expect(await check("v=DMARC1; p=quarantine", t3)).toMatchObject({
      dmarcRecord: "v=DMARC1; p=quarantine",
      dmarcPolicyChangedAt: t3,
    });
    // Two records are no record at all for receivers.
    const twice = await checkDomain(
      { organizationId, id: row.id, now: new Date(t3.getTime() + 1000) },
      {
        identity: new FakeIdentityProvider(),
        dns: fakeDnsResolver({
          [`TXT _dmarc.${row.name}`]: [["v=DMARC1; p=none"], ["v=DMARC1; p=reject"]],
        }),
        tracking: new FakeTrackingHostnameProvider(),
      },
    );
    expect(twice.dmarcRecord).toBeNull();
    expect(twice.records.find((r) => r.purpose === "dmarc")?.status).toBe("mismatch");
    // Without DNS nothing changes.
    const unchecked = await checkDomain(
      { organizationId, id: row.id },
      {
        identity: new FakeIdentityProvider(),
        dns: null,
        tracking: new FakeTrackingHostnameProvider(),
      },
    );
    expect(unchecked.dmarcRecord).toBeNull();
    expect(unchecked.dmarcPolicyChangedAt).toEqual(twice.dmarcPolicyChangedAt);
  });

  test("a subdomain without a record of its own gets its organizational domain's", async () => {
    const tenant = await createTestTenant();
    const parent = `p-${uniqueSuffix()}.test`;
    const row = await createVerifiedDomain(tenant.organization.id, { name: `mail.${parent}` });
    const check = (records: Record<string, string[][]>, now: Date) =>
      checkDomain(
        { organizationId: tenant.organization.id, id: row.id, now },
        {
          identity: new FakeIdentityProvider(),
          dns: fakeDnsResolver(records),
          tracking: new FakeTrackingHostnameProvider(),
          dmarcReportDomain: MANAGED,
        },
      );
    const t0 = new Date();
    const inherited = await check(
      { [`TXT _dmarc.${parent}`]: [["v=DMARC1; p=reject; sp=quarantine"]] },
      t0,
    );
    expect(inherited).toMatchObject({
      dmarcRecord: null,
      dmarcInheritedRecord: "v=DMARC1; p=reject; sp=quarantine",
      dmarcPolicyChangedAt: t0,
    });
    const overview = await dmarcOverview(inherited, MANAGED, t0);
    expect(overview).toMatchObject({
      stage: "quarantine",
      policy: "quarantine",
      inherited_from: parent,
      record: null,
      next: { kind: "publish", policy: "quarantine" },
    });

    // Its own record at the same policy: the epoch stays and the inherited one is dropped.
    const t1 = new Date(t0.getTime() + 1000);
    const own = await check(
      {
        [`TXT _dmarc.${row.name}`]: [[`v=DMARC1; p=quarantine; rua=mailto:${addressOf(row)}`]],
        [`TXT _dmarc.${parent}`]: [["v=DMARC1; p=reject; sp=quarantine"]],
      },
      t1,
    );
    expect(own).toMatchObject({ dmarcInheritedRecord: null, dmarcPolicyChangedAt: t0 });
  });
});

describe("notifications", () => {
  async function readyDomain() {
    const { row, organizationId, tenant } = await setup();
    const since = new Date(Date.now() - 30 * DAY);
    const [updated] = await db
      .update(schema.domain)
      .set({
        dmarcRecord: `v=DMARC1; p=none; rua=mailto:${addressOf(row)}`,
        dmarcPolicyChangedAt: since,
      })
      .where(eq(schema.domain.id, row.id))
      .returning();
    return { row: updated as DomainRow, organizationId, tenant };
  }

  /** A report of only passing COSS mail ending `daysAgo` days ago. */
  function passing(row: DomainRow, daysAgo: number): Uint8Array {
    const end = new Date(Date.now() - daysAgo * DAY);
    return dmarcReportMessage(
      reportFor(row, {
        begin: new Date(end.getTime() - DAY),
        end,
        records: [
          {
            sourceIp: "54.240.8.9",
            count: 500,
            dkim: "pass",
            spf: "pass",
            envelopeFrom: row.mailFromDomain,
            dkimResults: [{ domain: row.name, selector: row.dkimTokens[0] ?? "", result: "pass" }],
          },
        ],
      }),
      { to: addressOf(row) },
    );
  }

  async function notificationsOf(domainId: string) {
    return db
      .select()
      .from(schema.dmarcNotification)
      .where(eq(schema.dmarcNotification.domainId, domainId));
  }

  test("a domain that becomes ready for quarantine is announced once per policy", async () => {
    const { row } = await readyDomain();
    const ingest = (raw: Uint8Array) =>
      ingestDmarcReports(message(raw, [addressOf(row)]), [row.dmarcReportToken], {
        managedDomain: MANAGED,
      });
    // The first report alone is too recent coverage.
    await ingest(passing(row, 1));
    expect(await notificationsOf(row.id)).toHaveLength(0);
    // A report from 20 days ago completes coverage.
    await ingest(passing(row, 20));
    await ingest(passing(row, 2));
    const rows = await notificationsOf(row.id);
    expect(rows.map((r) => [r.kind, r.status])).toEqual([["ready_quarantine", "pending"]]);
    expect(rows[0]?.detail).toEqual({
      record: `v=DMARC1; p=quarantine; rua=mailto:${addressOf(row)};`,
    });
  });

  test("COSS mail failing under an enforcing policy alerts", async () => {
    const { row } = await readyDomain();
    await db
      .update(schema.domain)
      .set({ dmarcRecord: `v=DMARC1; p=reject; rua=mailto:${addressOf(row)}` })
      .where(eq(schema.domain.id, row.id));
    const end = new Date(Date.now() - DAY);
    const raw = dmarcReportMessage(
      reportFor(row, {
        begin: new Date(end.getTime() - DAY),
        end,
        policy: { p: "reject" },
        records: [
          {
            sourceIp: "54.240.8.9",
            count: 100,
            disposition: "reject",
            dkim: "fail",
            spf: "fail",
            envelopeFrom: row.mailFromDomain,
          },
        ],
      }),
      { to: addressOf(row) },
    );
    await ingestDmarcReports(message(raw, [addressOf(row)]), [row.dmarcReportToken], {
      managedDomain: MANAGED,
    });
    const rows = await notificationsOf(row.id);
    expect(rows.map((r) => r.kind)).toEqual(["pass_rate_dropped"]);
    expect(rows[0]?.detail).toMatchObject({ policy: "reject", coss_pass_rate: 0 });
  });
});

describe("purges and deletion", () => {
  test("expired reports go with their records; organization deletion removes the rest", async () => {
    const { row, organizationId } = await setup();
    for (let i = 0; i < 2; i++) {
      await ingestDmarcReports(
        message(dmarcReportMessage(reportFor(row), { to: addressOf(row) }), [addressOf(row)]),
        [row.dmarcReportToken],
        { managedDomain: MANAGED },
      );
    }
    const scope = { organizationIds: [organizationId] };
    expect(await purgeExpiredDmarcReports({ scope })).toBe(0);
    const later = new Date(Date.now() + 91 * DAY);
    // Records first (3 per report), in batches of `limit`.
    expect(await purgeExpiredDmarcReports({ now: later, scope, limit: 4 })).toBe(4);
    expect(await purgeExpiredDmarcReports({ now: later, scope, limit: 4 })).toBe(4);
    expect(await reportsOf(row.id)).toHaveLength(0);

    await ingestDmarcReports(
      message(dmarcReportMessage(reportFor(row), { to: addressOf(row) }), [addressOf(row)]),
      [row.dmarcReportToken],
      { managedDomain: MANAGED },
    );
    await deleteOrganizationDmarcReports(organizationId, async () => {}, 2);
    expect(await reportsOf(row.id)).toHaveLength(0);
    const records = await db
      .select()
      .from(schema.dmarcReportRecord)
      .where(eq(schema.dmarcReportRecord.organizationId, organizationId));
    expect(records).toHaveLength(0);
  });
});
