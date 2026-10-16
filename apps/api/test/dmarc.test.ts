import { describe, expect, test } from "bun:test";
import { uniqueSuffix } from "@coss/db/testing";
import {
  dmarcReportAddress,
  dmarcReportMessage,
  ingestDmarcReports,
  NO_VERDICTS,
  sampleDmarcReport,
} from "@coss/email";
import type {
  DmarcReportListOutput,
  DmarcReportObjectOutput,
  DomainDmarcOutput,
} from "@coss/email/schemas";
import { createVerifiedDomain } from "@coss/email/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  setKeyPermissions,
  TEST_INBOUND_DOMAIN,
} from "./helpers.ts";

async function withReport() {
  const tenant = await createTestTenant();
  const domain = await createVerifiedDomain(tenant.organization.id);
  const address = dmarcReportAddress(domain.dmarcReportToken, TEST_INBOUND_DOMAIN) as string;
  const raw = dmarcReportMessage(
    { ...sampleDmarcReport(domain), reportId: `r-${uniqueSuffix()}` },
    { to: address },
  );
  const [outcome] = await ingestDmarcReports(
    {
      provider: "fake",
      providerMessageId: `msg-${uniqueSuffix()}`,
      raw: async () => raw,
      verdicts: { ...NO_VERDICTS, spf: "pass", dkim: "pass" },
      receivedAt: new Date(),
    },
    [domain.dmarcReportToken],
    { managedDomain: TEST_INBOUND_DOMAIN },
  );
  return { tenant, domain, address, reportId: outcome?.dmarcReportId ?? "" };
}

describe("GET /v1/domains/{id}/dmarc", () => {
  test("returns the guidance and a summary of the reports", async () => {
    const { tenant, domain, address } = await withReport();
    const { app } = createTestApp();
    const res = await apiRequest(app, "GET", `/v1/domains/${domain.id}/dmarc`, {
      key: tenant.sandboxKey,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as DomainDmarcOutput;
    expect(body).toMatchObject({
      object: "domain_dmarc",
      domain_id: domain.id,
      report_address: address,
      stage: "not_checked",
      next: { kind: "publish", policy: "none", record: `v=DMARC1; p=none; rua=mailto:${address};` },
      report_summary: { reports: 1 },
    });
    expect(body.report_summary.sources).toHaveLength(3);
  });

  test("the recommended DNS record names the report address", async () => {
    const { tenant, domain, address } = await withReport();
    const { app } = createTestApp();
    const res = await apiRequest(app, "GET", `/v1/domains/${domain.id}`, { key: tenant.liveKey });
    const body = (await res.json()) as { records: { purpose: string; value: string }[] };
    // Verified test domains were never DNS-checked, so the records are what to publish.
    expect(body.records.find((record) => record.purpose === "dmarc")?.value).toBe(
      `v=DMARC1; p=none; rua=mailto:${address};`,
    );
  });

  test("another organization's domain is 404, a key without domain:read 403", async () => {
    const { domain } = await withReport();
    const other = await createTestTenant();
    const { app } = createTestApp();
    const res = await apiRequest(app, "GET", `/v1/domains/${domain.id}/dmarc`, {
      key: other.liveKey,
    });
    expect(res.status).toBe(404);
    const keyId = await apiKeyIdForEnvironment(other.production.id);
    await setKeyPermissions(keyId, { email: ["send"] });
    const forbidden = await apiRequest(app, "GET", `/v1/domains/${domain.id}/dmarc/reports`, {
      key: other.liveKey,
    });
    expect(forbidden.status).toBe(403);
    expect(await errorOf(forbidden)).toMatchObject({ type: "permission_error" });
  });
});

describe("GET /v1/domains/{id}/dmarc/reports", () => {
  test("lists reports and retrieves one with its records", async () => {
    const { tenant, domain, reportId } = await withReport();
    const { app } = createTestApp();
    const list = await apiRequest(app, "GET", `/v1/domains/${domain.id}/dmarc/reports?limit=5`, {
      key: tenant.liveKey,
    });
    expect(list.status).toBe(200);
    const page = (await list.json()) as DmarcReportListOutput;
    expect(page).toMatchObject({ object: "list", has_more: false });
    expect(page.data.map((report) => report.id)).toEqual([reportId]);
    expect(page.data[0]).not.toHaveProperty("records");

    const one = await apiRequest(app, "GET", `/v1/domains/${domain.id}/dmarc/reports/${reportId}`, {
      key: tenant.liveKey,
    });
    expect(one.status).toBe(200);
    const report = (await one.json()) as DmarcReportObjectOutput;
    expect(report).toMatchObject({ object: "dmarc_report", id: reportId, domain_id: domain.id });
    expect(report.records).toHaveLength(3);

    const missing = await apiRequest(
      app,
      "GET",
      `/v1/domains/${domain.id}/dmarc/reports/dmarcrep_01k7c8m4q2f3e9v6t5r1n0p8yz`,
      { key: tenant.liveKey },
    );
    expect(missing.status).toBe(404);
    const invalid = await apiRequest(
      app,
      "GET",
      `/v1/domains/${domain.id}/dmarc/reports?limit=1000`,
      { key: tenant.liveKey },
    );
    expect(invalid.status).toBe(422);
  });
});
