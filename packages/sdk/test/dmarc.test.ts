/** `coss.domains.dmarc`: request shape and results. */
import { describe, expect, test } from "bun:test";
import { Coss, type DmarcReportSummary } from "../src/index.ts";
import { apiError, json, mockFetch, sampleDomain } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return {
    coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch, maxRetries: 0 }),
    calls,
  };
}

const report: DmarcReportSummary = {
  object: "dmarc_report",
  id: "dmarcrep_01k7c8m4q2f3e9v6t5r1n0p8yz",
  domain_id: sampleDomain.id,
  reporter: { org_name: "google.com", email: "noreply-dmarc-support@google.com" },
  report_id: "13845021974128475",
  period_start: "2026-10-09T00:00:00.000Z",
  period_end: "2026-10-09T23:59:59.000Z",
  policy_published: {
    domain: "acme.com",
    p: "none",
    sp: null,
    np: null,
    adkim: "r",
    aspf: "r",
    pct: 100,
    testing: null,
  },
  messages: 1204,
  passing: 1200,
  truncated: false,
  received_at: "2026-10-10T03:12:44.000Z",
};

describe("coss.domains.dmarc", () => {
  test("get, reports.list and reports.get hit the documented routes", async () => {
    const { coss, calls } = client(json(200, { object: "list", data: [report], has_more: false }));
    await coss.domains.dmarc.get(sampleDomain.id);
    const list = await coss.domains.dmarc.reports.list(sampleDomain.id, {
      limit: 5,
      after: "dmarcrep_x",
    });
    await coss.domains.dmarc.reports.get(sampleDomain.id, report.id);
    expect(list.data?.data[0]?.reporter.org_name).toBe("google.com");
    expect(
      calls.map(
        (call) => `${call.method} ${new URL(call.url).pathname}${new URL(call.url).search}`,
      ),
    ).toEqual([
      `GET /v1/domains/${sampleDomain.id}/dmarc`,
      `GET /v1/domains/${sampleDomain.id}/dmarc/reports?limit=5&after=dmarcrep_x`,
      `GET /v1/domains/${sampleDomain.id}/dmarc/reports/${report.id}`,
    ]);
  });

  test("errors come back as values", async () => {
    const { coss } = client(apiError(404, { type: "invalid_request_error", code: "not_found" }));
    const result = await coss.domains.dmarc.get("dom_missing");
    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ status: 404, code: "not_found" });
  });
});
