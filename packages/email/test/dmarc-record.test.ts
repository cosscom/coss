import { describe, expect, test } from "bun:test";
import {
  dmarcPolicyKey,
  dmarcReportAddress,
  dmarcReportTokenOf,
  effectivePolicy,
  parseDmarcRecord,
  partiallyEnforced,
  recommendedDmarc,
  ruaIncludes,
  withPolicy,
  withReporting,
} from "../src/dmarc-record.ts";

const ADDRESS = "dmarc-abcdefghijkmnpqr@inbound.coss.test";

describe("parseDmarcRecord", () => {
  test("reads the tags COSS uses and keeps the rest", () => {
    const record = parseDmarcRecord(
      "v=DMARC1; p=Quarantine; sp=none; pct=50; rua=mailto:a@x.test, mailto:b@y.test!10m; fo=1",
    );
    expect(record).toMatchObject({
      p: "quarantine",
      sp: "none",
      pct: 50,
      rua: ["mailto:a@x.test", "mailto:b@y.test!10m"],
    });
    expect(record?.tags).toContainEqual(["fo", "1"]);
    expect(record && partiallyEnforced(record)).toBe(true);
  });

  test("refuses anything that isn't a DMARC record", () => {
    expect(parseDmarcRecord("v=spf1 include:amazonses.com ~all")).toBeNull();
    expect(parseDmarcRecord("p=reject; v=DMARC1")).toBeNull();
    expect(parseDmarcRecord("")).toBeNull();
  });

  test("an invalid or missing p counts as none", () => {
    expect(effectivePolicy(parseDmarcRecord("v=DMARC1; p=bogus"))).toBe("none");
    expect(effectivePolicy(parseDmarcRecord("v=DMARC1;"))).toBe("none");
    expect(effectivePolicy(null)).toBeNull();
  });

  test("t=y is partial enforcement; out-of-range pct is ignored", () => {
    const record = parseDmarcRecord("v=DMARC1; p=reject; t=y; pct=500");
    expect(record?.pct).toBeNull();
    expect(record && partiallyEnforced(record)).toBe(true);
  });
});

describe("policy keys", () => {
  test("change with the policy and with partial enforcement", () => {
    const key = (value: string | null) =>
      dmarcPolicyKey(value === null ? null : parseDmarcRecord(value));
    expect(key(null)).toBe("none-published");
    expect(key("v=DMARC1; p=none; rua=mailto:x@y.test")).toBe("none");
    expect(key("v=DMARC1; p=none")).toBe("none");
    expect(key("v=DMARC1; p=quarantine; pct=25")).toBe("quarantine:partial");
    expect(key("v=DMARC1; p=quarantine")).toBe("quarantine");
  });
});

describe("report addresses", () => {
  test("round-trip through the token", () => {
    const address = dmarcReportAddress("abcdefghijkmnpqr", "Inbound.COSS.test");
    expect(address).toBe(ADDRESS);
    expect(dmarcReportTokenOf(ADDRESS, "inbound.coss.test")).toBe("abcdefghijkmnpqr");
    expect(dmarcReportTokenOf(ADDRESS.toUpperCase(), "inbound.coss.test")).toBe("abcdefghijkmnpqr");
    expect(dmarcReportAddress("abcdefghijkmnpqr", null)).toBeNull();
  });

  test("only match well-formed tokens at the managed domain itself", () => {
    expect(dmarcReportTokenOf("dmarc-short@inbound.coss.test", "inbound.coss.test")).toBeNull();
    expect(
      dmarcReportTokenOf("dmarc-abcdefghijkmnpqr@x.inbound.coss.test", "inbound.coss.test"),
    ).toBeNull();
    expect(dmarcReportTokenOf("hello@inbound.coss.test", "inbound.coss.test")).toBeNull();
  });

  test("ruaIncludes ignores case and size limits", () => {
    const record = parseDmarcRecord(`v=DMARC1; p=none; rua=mailto:${ADDRESS.toUpperCase()}!10m`);
    expect(record && ruaIncludes(record, ADDRESS)).toBe(true);
  });
});

describe("withPolicy", () => {
  test("recommends monitoring with COSS's address", () => {
    expect(recommendedDmarc(ADDRESS)).toBe(`v=DMARC1; p=none; rua=mailto:${ADDRESS};`);
    expect(recommendedDmarc(null)).toBe("v=DMARC1; p=none;");
  });

  test("keeps the customer's tags and addresses, drops pct and t, adds COSS once", () => {
    const current = parseDmarcRecord(
      "v=DMARC1; p=none; pct=50; t=y; rua=mailto:ops@acme.test; adkim=s; fo=1",
    );
    expect(withPolicy(current, "quarantine", ADDRESS)).toBe(
      `v=DMARC1; p=quarantine; adkim=s; fo=1; rua=mailto:ops@acme.test,mailto:${ADDRESS};`,
    );
    const reporting = parseDmarcRecord(`v=DMARC1; p=quarantine; rua=mailto:${ADDRESS}`);
    expect(withPolicy(reporting, "reject", ADDRESS)).toBe(
      `v=DMARC1; p=reject; rua=mailto:${ADDRESS};`,
    );
  });
});

describe("withReporting", () => {
  test("adds COSS's address and changes nothing else", () => {
    const current = parseDmarcRecord(
      "v=DMARC1; p=quarantine; pct=25; rua=mailto:ops@acme.test; fo=1",
    );
    expect(current && withReporting(current, ADDRESS)).toBe(
      `v=DMARC1; p=quarantine; pct=25; fo=1; rua=mailto:ops@acme.test,mailto:${ADDRESS};`,
    );
    const reporting = parseDmarcRecord(`v=DMARC1; p=none; rua=mailto:${ADDRESS}; t=y`);
    expect(reporting && withReporting(reporting, ADDRESS)).toBe(
      `v=DMARC1; p=none; rua=mailto:${ADDRESS}; t=y;`,
    );
  });
});
