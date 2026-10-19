import { describe, expect, test } from "bun:test";
import { bindRecords } from "../src/commands/domains.ts";
import { run } from "../src/run.ts";
import { apiError, fakeFetch, LIVE_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: LIVE_KEY };

type RecordStatus = "verified" | "missing" | "mismatch" | "not_checked";

function domain(
  status: "pending" | "verified" | "failed" = "pending",
  records: { dkim?: RecordStatus; mx?: RecordStatus; spf?: RecordStatus } = {},
) {
  const record = (
    purpose: string,
    type: string,
    name: string,
    value: string,
    state: RecordStatus = "not_checked",
    extra: object = {},
  ) => ({
    purpose,
    type,
    name,
    value,
    priority: null,
    required: true,
    status: state,
    found: [],
    ...extra,
  });
  return {
    object: "domain",
    id: "dom_1",
    name: "acme.com",
    status,
    can_send: status === "verified",
    region: "eu-west-1",
    mail_from_domain: "send.acme.com",
    mail_from_status: "pending",
    records: [
      record("dkim", "CNAME", "abc._domainkey.acme.com", "abc.dkim.amazonses.com", records.dkim),
      record(
        "mail_from_mx",
        "MX",
        "send.acme.com",
        "feedback-smtp.eu-west-1.amazonses.com",
        records.mx,
        {
          priority: 10,
        },
      ),
      record(
        "mail_from_spf",
        "TXT",
        "send.acme.com",
        "v=spf1 include:amazonses.com ~all",
        records.spf,
        {
          found: records.spf === "mismatch" ? ["v=spf1 -all"] : [],
        },
      ),
      record("dmarc", "TXT", "_dmarc.acme.com", "v=DMARC1; p=none;", "missing", {
        required: false,
      }),
    ],
    created_at: "2026-10-15T12:00:00.000Z",
    last_checked_at: null,
    verified_at: null,
    failed_at: null,
    tracking: null,
    receiving: null,
    bimi: {
      status: "not_checked",
      name: "default._bimi.acme.com",
      record: null,
      logo_url: null,
      certificate_url: null,
      dmarc_policy: null,
      issues: [],
    },
  };
}

const list = (...domains: object[]) => ({ object: "list", data: domains, has_more: false });

describe("coss domains", () => {
  test("add prints the records to publish, as a table or zone-file lines", async () => {
    const api = fakeFetch({ "POST /v1/domains": domain() });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["domains", "add", "acme.com"], io)).toBe(0);
    expect(api.requests[0]?.body).toEqual({ name: "acme.com" });
    const output = io.output();
    expect(output).toContain("Added acme.com");
    expect(output).toMatch(/DKIM\s+CNAME\s+abc\._domainkey\.acme\.com\s+abc\.dkim\.amazonses\.com/);
    expect(output).toMatch(/Bounces \(MX\)\s+MX\s+send\.acme\.com\s+10 feedback-smtp/);
    expect(output).toContain("DMARC (recommended)");
    expect(io.errors()).toContain("coss domains verify acme.com --wait");

    const bind = testIo({ fetch: api.fetch, env });
    expect(await run(["domains", "add", "acme.com", "--format", "bind"], bind)).toBe(0);
    expect(bind.output().trim().split("\n")).toEqual([
      "; acme.com: the DNS records coss.com needs",
      "abc._domainkey.acme.com.\t3600\tIN\tCNAME\tabc.dkim.amazonses.com.",
      "send.acme.com.\t3600\tIN\tMX\t10 feedback-smtp.eu-west-1.amazonses.com.",
      'send.acme.com.\t3600\tIN\tTXT\t"v=spf1 include:amazonses.com ~all"',
      '_dmarc.acme.com.\t3600\tIN\tTXT\t"v=DMARC1; p=none;" ; recommended',
    ]);
  });

  test("long TXT values are split into 255-character strings, quotes escaped", () => {
    const value = `v=DKIM1; p=${"A".repeat(300)}"`;
    const [, line] = bindRecords({
      ...domain(),
      records: [{ ...domain().records[2], value }],
    } as never);
    expect(line).toContain(`"v=DKIM1; p=${"A".repeat(244)}" "${"A".repeat(56)}\\""`);
  });

  test("list, and get by name with each record's status", async () => {
    const api = fakeFetch({
      "GET /v1/domains": list(domain("pending", { dkim: "verified", spf: "mismatch" })),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["domains", "list"], io)).toBe(0);
    expect(io.output()).toMatch(/acme\.com\s+pending\s+no\s+dom_1/);

    const get = testIo({ fetch: api.fetch, env });
    expect(await run(["domains", "get", "ACME.com."], get)).toBe(0);
    expect(get.output()).toMatch(/DKIM\s+CNAME.*verified/);
    expect(get.output()).toMatch(/Bounces \(SPF\)\s+TXT.*mismatch/);
    expect(get.output()).toContain("send.acme.com (TXT) is v=spf1 -all");

    const missing = testIo({ fetch: api.fetch, env });
    expect(await run(["domains", "get", "other.com"], missing)).toBe(1);
    expect(missing.errors()).toContain('No domain "other.com"');
  });

  test("verify --wait checks until the domain is verified, saying what's missing", async () => {
    let checks = 0;
    const api = fakeFetch({
      "GET /v1/domains/dom_1": () => domain("pending", checks > 0 ? { dkim: "verified" } : {}),
      "POST /v1/domains/dom_1/verify": () => {
        checks++;
        if (checks === 2) return apiError(429, "rate_limit_error", "domain_recently_checked");
        if (checks < 3) return domain();
        return domain("verified", { dkim: "verified", mx: "verified", spf: "verified" });
      },
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["domains", "verify", "dom_1", "--wait"], io)).toBe(0);
    expect(checks).toBe(3);
    // A throttled check is read instead, never retried.
    expect(api.requests.filter((request) => request.method === "GET")).toHaveLength(2);
    expect(io.errors()).toContain(
      "Still missing: Bounces (MX) (send.acme.com), Bounces (SPF) (send.acme.com)",
    );
    expect(io.output()).toContain("acme.com is verified: live keys can send from it.");
  });

  test("verify: a failed domain starts over; --wait gives up at --timeout", async () => {
    const restarted = fakeFetch({
      "GET /v1/domains/dom_1": domain("failed"),
      "POST /v1/domains/dom_1/verify": domain("pending"),
    });
    const io = testIo({ fetch: restarted.fetch, env });
    expect(await run(["domains", "verify", "dom_1"], io)).toBe(0);
    expect(io.errors()).toContain("started over with new DKIM records");

    let clock = Date.parse("2026-10-15T12:00:00Z");
    const pending = fakeFetch({
      "GET /v1/domains/dom_1": domain(),
      "POST /v1/domains/dom_1/verify": domain(),
    });
    const slow = testIo({
      fetch: pending.fetch,
      env,
      now: () => new Date(clock),
      sleep: async (ms) => {
        clock += ms;
      },
    });
    expect(await run(["domains", "verify", "dom_1", "--wait", "--timeout", "30"], slow)).toBe(1);
    expect(slow.errors()).toContain("acme.com isn't verified yet: still missing DKIM");
  });
});
