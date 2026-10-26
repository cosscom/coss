import { describe, expect, test } from "bun:test";
import { Coss } from "../src/index.ts";
import { describeSetup, fetchSetupReport, SANDBOX_FROM, SIMULATOR_TO } from "../src/setup.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const record = (status = "missing") => ({
  type: "TXT",
  name: "acme.test",
  value: "v=spf1",
  status,
  required: true,
});

describe("describeSetup", () => {
  test("a sandbox key can send from the example address and should use the simulator", () => {
    const report = describeSetup({ mode: "sandbox", domains: [], webhookEndpoints: [] });
    expect(report.from).toBe(SANDBOX_FROM);
    expect(report.next).toContain(SIMULATOR_TO);
    expect(report.next).toContain("diagnose_email");
    expect(report.next).toContain("npx coss-cli listen");
  });

  test("a live key with a domain that can send is ready", () => {
    const report = describeSetup({
      mode: "live",
      domains: [{ name: "acme.test", can_send: true, records: [record("verified")] }],
      webhookEndpoints: [{ id: "whep_1", url: "https://example.com/hook", enabled: true }],
    });
    expect(report.from).toBe("hello@acme.test");
    expect(report.missing_dns).toEqual([]);
    expect(report.next).toBe("Ready to send from hello@acme.test.");
  });

  test("a live key without a verified domain lists the missing required records", () => {
    const optional = { ...record("missing"), required: false, type: "TXT" };
    const report = describeSetup({
      mode: "live",
      domains: [{ name: "acme.test", can_send: false, records: [record(), optional] }],
      webhookEndpoints: [],
    });
    expect(report.from).toBeNull();
    expect(report.missing_dns).toEqual([
      {
        domain: "acme.test",
        type: "TXT",
        name: "acme.test",
        value: "v=spf1",
        status: "missing",
        required: true,
      },
    ]);
    expect(report.next).toContain("acme.test");
    expect(report.next).toContain("production key");
  });

  test("a domain that can send is ready even when another domain still needs DNS", () => {
    const report = describeSetup({
      mode: "live",
      domains: [
        { name: "acme.test", can_send: false, records: [record()] },
        { name: "ready.test", can_send: true, records: [record("missing")] },
      ],
      webhookEndpoints: [],
    });
    expect(report.from).toBe("hello@ready.test");
    expect(report.missing_dns.map((entry) => entry.domain)).toEqual(["acme.test"]);
    expect(report.next).toBe(
      "Ready to send from hello@ready.test. No webhook endpoints yet: `npx coss-cli listen` forwards events to localhost.",
    );
  });

  test("a live key with no domains says to add one", () => {
    const report = describeSetup({ mode: "live", domains: [], webhookEndpoints: [] });
    expect(report.from).toBeNull();
    expect(report.next).toContain("Add a sending domain");
  });
});

describe("fetchSetupReport", () => {
  test("keeps a next step when the lists fail", async () => {
    const { fetch } = mockFetch(
      json(200, { object: "environment", mode: "sandbox" }),
      apiError(404, { type: "not_found_error", code: "not_found", message: "Not found." }),
      apiError(404, { type: "not_found_error", code: "not_found", message: "Not found." }),
    );
    const report = await fetchSetupReport(
      new Coss({ apiKey: "coss_test_x", fetch, maxRetries: 0 }),
    );
    expect(report.mode).toBe("sandbox");
    expect(report.from).toBe(SANDBOX_FROM);
    expect(report.warning).toBe(
      "Couldn't list domains (Not found.). Couldn't list webhook endpoints (Not found.).",
    );
    expect(report.next).toContain(SIMULATOR_TO);
  });

  test("an environment error still returns a next step", async () => {
    const { fetch } = mockFetch(
      apiError(401, { type: "authentication_error", code: "invalid_api_key", message: "Bad key." }),
    );
    const report = await fetchSetupReport(
      new Coss({ apiKey: "coss_test_x", fetch, maxRetries: 0 }),
    );
    expect(report.mode).toBe("unknown");
    expect(report.warning).toContain("Bad key.");
    expect(report.next).toContain(SIMULATOR_TO);
  });
});
