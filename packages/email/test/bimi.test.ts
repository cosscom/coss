import { describe, expect, test } from "bun:test";
import type { DomainBimi } from "@coss/db/schema";
import { checkBimi, parseTagList, toBimiObject } from "../src/bimi.ts";
import type { DnsResolver } from "../src/dns.ts";
import { fakeDnsResolver } from "../src/testing.ts";

const LOGO = "https://acme.test/brand/logo.svg";
const CERTIFICATE = "https://acme.test/brand/vmc.pem";
const RECORD = `v=BIMI1; l=${LOGO}; a=${CERTIFICATE}`;
const ENFORCED = "v=DMARC1; p=reject; rua=mailto:dmarc@acme.test";

describe("parseTagList", () => {
  test("lower-cases keys, trims values and ignores empty or malformed parts", () => {
    const tags = parseTagList(" V=BIMI1 ;L = https://a.test/l.svg;; junk ;a=;");
    expect([...tags]).toEqual([
      ["v", "BIMI1"],
      ["l", "https://a.test/l.svg"],
      ["a", ""],
    ]);
  });

  test("keeps the first value of a repeated tag, and says there was one", () => {
    const tags = parseTagList("v=DMARC1; p=reject; P=none");
    expect(tags.get("p")).toBe("reject");
    expect(tags.duplicate).toBe(true);
    expect(parseTagList("v=DMARC1; p=reject").duplicate).toBe(false);
  });
});

describe("checkBimi", () => {
  test("is configured with a valid record and an enforced DMARC policy", async () => {
    const dns = fakeDnsResolver({
      "TXT _dmarc.acme.test": [[ENFORCED]],
      // Long records come back in chunks.
      "TXT default._bimi.acme.test": [[`v=BIMI1; l=${LOGO};`, ` a=${CERTIFICATE}`]],
    });

    expect(await checkBimi("acme.test", dns)).toEqual({
      status: "configured",
      name: "default._bimi.acme.test",
      record: `v=BIMI1; l=${LOGO}; a=${CERTIFICATE}`,
      logoUrl: LOGO,
      certificateUrl: CERTIFICATE,
      dmarcPolicy: "reject",
      issues: [],
    });
  });

  test("ignores other TXT records at the DMARC and BIMI names", async () => {
    const dns = fakeDnsResolver({
      "TXT _dmarc.acme.test": [["google-site-verification=x"], ["v=DMARC1;p=quarantine"]],
      "TXT default._bimi.acme.test": [["something-else"], [RECORD]],
    });

    const bimi = await checkBimi("acme.test", dns);

    expect(bimi).toMatchObject({ status: "configured", dmarcPolicy: "quarantine", issues: [] });
  });

  test("is missing without a record, and still says what DMARC needs", async () => {
    const dns = fakeDnsResolver({ "TXT _dmarc.acme.test": [["v=DMARC1; p=none;"]] });

    expect(await checkBimi("acme.test", dns)).toEqual({
      status: "missing",
      name: "default._bimi.acme.test",
      record: null,
      logoUrl: null,
      certificateUrl: null,
      dmarcPolicy: "none",
      issues: ["dmarc_not_enforced"],
    });
  });

  test("a record needs DMARC at enforcement, for all of the mail", async () => {
    const cases: [string | null, DomainBimi["issues"]][] = [
      [null, ["dmarc_missing"]],
      ["v=DMARC1; p=none", ["dmarc_not_enforced"]],
      ["v=DMARC1; p=bogus", ["dmarc_not_enforced"]],
      ["v=DMARC1; p=quarantine; pct=50", ["dmarc_partial"]],
      ["v=DMARC1; p=reject; t=y", ["dmarc_partial"]],
      ["v=DMARC1; p=reject; pct=100", []],
    ];
    for (const [dmarc, issues] of cases) {
      const dns = fakeDnsResolver({
        ...(dmarc ? { "TXT _dmarc.acme.test": [[dmarc]] } : {}),
        "TXT default._bimi.acme.test": [[RECORD]],
      });
      const bimi = await checkBimi("acme.test", dns);
      expect([dmarc, bimi.issues]).toEqual([dmarc, issues]);
      expect(bimi.status).toBe(issues.length === 0 ? "configured" : "invalid");
    }
  });

  test("two DMARC records at one name mean no DMARC", async () => {
    const dns = fakeDnsResolver({
      "TXT _dmarc.acme.test": [[ENFORCED], ["v=DMARC1; p=none"]],
      "TXT default._bimi.acme.test": [[RECORD]],
    });

    expect(await checkBimi("acme.test", dns)).toMatchObject({
      status: "invalid",
      dmarcPolicy: null,
      issues: ["dmarc_missing"],
    });
  });

  test("a subdomain without DMARC of its own takes the parent's sp, then p", async () => {
    const withSp = fakeDnsResolver({
      "TXT _dmarc.acme.test": [["v=DMARC1; p=reject; sp=none"]],
      "TXT default._bimi.mail.acme.test": [[RECORD]],
    });
    expect(await checkBimi("mail.acme.test", withSp)).toMatchObject({
      status: "invalid",
      dmarcPolicy: "none",
      issues: ["dmarc_not_enforced"],
    });

    const withoutSp = fakeDnsResolver({
      "TXT _dmarc.acme.test": [[ENFORCED]],
      "TXT default._bimi.mail.acme.test": [[RECORD]],
    });
    expect(await checkBimi("mail.acme.test", withoutSp)).toMatchObject({
      status: "configured",
      name: "default._bimi.mail.acme.test",
      dmarcPolicy: "reject",
    });
  });

  test("a subdomain's own DMARC record wins over the parent's", async () => {
    const dns = fakeDnsResolver({
      "TXT _dmarc.mail.acme.test": [["v=DMARC1; p=quarantine; sp=none"]],
      "TXT _dmarc.acme.test": [["v=DMARC1; p=none"]],
      "TXT default._bimi.mail.acme.test": [[RECORD]],
    });

    expect(await checkBimi("mail.acme.test", dns)).toMatchObject({
      status: "configured",
      dmarcPolicy: "quarantine",
    });
  });

  test("without a record of its own, a subdomain uses the organizational domain's", async () => {
    const dns = fakeDnsResolver({
      "TXT _dmarc.acme.test": [[ENFORCED]],
      "TXT default._bimi.acme.test": [[RECORD]],
    });

    expect(await checkBimi("mail.acme.test", dns)).toMatchObject({
      status: "configured",
      name: "default._bimi.acme.test",
      logoUrl: LOGO,
    });
  });

  test("the organizational domain's record applies even when the subdomain has its own DMARC", async () => {
    const dns = fakeDnsResolver({
      "TXT _dmarc.mail.eu.acme.test": [[ENFORCED]],
      "TXT default._bimi.acme.test": [[RECORD]],
    });

    expect(await checkBimi("mail.eu.acme.test", dns)).toMatchObject({
      status: "configured",
      name: "default._bimi.acme.test",
    });
  });

  test("unrelated TXT records at the subdomain's name don't stop the fallback", async () => {
    const dns = fakeDnsResolver({
      "TXT _dmarc.acme.test": [[ENFORCED]],
      "TXT default._bimi.mail.acme.test": [["some-verification=abc"]],
      "TXT default._bimi.acme.test": [[RECORD]],
    });

    expect(await checkBimi("mail.acme.test", dns)).toMatchObject({
      status: "configured",
      name: "default._bimi.acme.test",
    });
  });

  test("a record that lists a tag twice is invalid", async () => {
    const record = `v=BIMI1; l=${LOGO}; l=https://acme.test/other.svg; a=${CERTIFICATE}`;
    const dns = fakeDnsResolver({
      "TXT _dmarc.acme.test": [[ENFORCED]],
      "TXT default._bimi.acme.test": [[record]],
    });

    expect(await checkBimi("acme.test", dns)).toMatchObject({
      status: "invalid",
      record,
      logoUrl: null,
      issues: ["record_invalid"],
    });
  });

  test("reports invalid and duplicate records", async () => {
    const invalid = fakeDnsResolver({
      "TXT _dmarc.acme.test": [[ENFORCED]],
      "TXT default._bimi.acme.test": [[`v=BIMI2; l=${LOGO}`]],
    });
    expect(await checkBimi("acme.test", invalid)).toMatchObject({
      status: "invalid",
      record: `v=BIMI2; l=${LOGO}`,
      logoUrl: null,
      issues: ["record_invalid"],
    });

    const duplicate = fakeDnsResolver({
      "TXT _dmarc.acme.test": [[ENFORCED]],
      "TXT default._bimi.acme.test": [[RECORD], ["v=BIMI1; l=https://acme.test/other.svg"]],
    });
    expect(await checkBimi("acme.test", duplicate)).toMatchObject({
      status: "invalid",
      record: RECORD,
      issues: ["record_multiple"],
    });
  });

  test("needs https logo and certificate URLs", async () => {
    const cases: [string, DomainBimi["issues"]][] = [
      ["v=BIMI1; l=; a=", ["logo_missing", "certificate_missing"]],
      [`v=BIMI1; l=${LOGO}`, ["certificate_missing"]],
      [`v=BIMI1; l=http://acme.test/logo.svg; a=${CERTIFICATE}`, ["logo_not_https"]],
      [`v=BIMI1; l=${LOGO}; a=not a url`, ["certificate_not_https"]],
    ];
    for (const [record, issues] of cases) {
      const dns = fakeDnsResolver({
        "TXT _dmarc.acme.test": [[ENFORCED]],
        "TXT default._bimi.acme.test": [[record]],
      });
      const bimi = await checkBimi("acme.test", dns);
      expect([record, bimi.status, bimi.issues]).toEqual([record, "invalid", issues]);
    }
  });

  test("lookup failures and a missing resolver leave it unchecked", async () => {
    const failing: DnsResolver = {
      ...fakeDnsResolver({}),
      resolveTxt: async () => {
        throw Object.assign(new Error("timeout"), { code: "ETIMEOUT" });
      },
    };
    const notChecked: DomainBimi = {
      status: "not_checked",
      name: "default._bimi.acme.test",
      record: null,
      logoUrl: null,
      certificateUrl: null,
      dmarcPolicy: null,
      issues: [],
    };

    expect(await checkBimi("acme.test", failing)).toEqual(notChecked);
    expect(await checkBimi("acme.test", null)).toEqual(notChecked);
  });
});

describe("toBimiObject", () => {
  test("renders issue messages, and a never-checked domain as not_checked", () => {
    expect(toBimiObject({ name: "acme.test", bimi: null })).toEqual({
      status: "not_checked",
      name: "default._bimi.acme.test",
      record: null,
      logo_url: null,
      certificate_url: null,
      dmarc_policy: null,
      issues: [],
    });

    const object = toBimiObject({
      name: "acme.test",
      bimi: {
        status: "missing",
        name: "default._bimi.acme.test",
        record: null,
        logoUrl: null,
        certificateUrl: null,
        dmarcPolicy: null,
        issues: ["dmarc_missing"],
      },
    });
    expect(object.issues).toEqual([
      { code: "dmarc_missing", message: expect.stringContaining("no DMARC record") },
    ]);
  });
});
