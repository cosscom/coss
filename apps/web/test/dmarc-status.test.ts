import { describe, expect, test } from "bun:test";
import { dmarcComplete, dmarcNoNextStep } from "../src/lib/dmarc-status";

const ADDRESS = "dmarc-abcdefghijkmnpqr@inbound.coss.test";
const base = {
  policy: "reject" as const,
  partial: false,
  reporting: true,
  report_address: ADDRESS,
  inherited_from: null,
};

describe("dmarcNoNextStep", () => {
  test("a fully rejecting domain is done; COSS reads its reports only when they reach it", () => {
    expect(dmarcComplete(base)).toBe(true);
    expect(dmarcNoNextStep(base, "acme.test")).toContain("COSS keeps reading the reports");
    const unreported = dmarcNoNextStep({ ...base, reporting: false }, "acme.test");
    expect(unreported).toStartWith("acme.test rejects mail that fails DMARC");
    expect(unreported).not.toContain("COSS keeps reading");
  });

  test("an inherited policy short of reject without receiving claims no protection", () => {
    for (const policy of ["none", "quarantine"] as const) {
      const status = {
        ...base,
        policy,
        reporting: false,
        report_address: null,
        inherited_from: "acme.test",
      };
      expect(dmarcComplete(status)).toBe(false);
      const text = dmarcNoNextStep(status, "mail.acme.test");
      expect(text).not.toContain("rejects");
      expect(text).toContain("doesn't receive email");
    }
  });

  test("partial rejection isn't complete", () => {
    const status = { ...base, partial: true, report_address: null, inherited_from: "acme.test" };
    expect(dmarcComplete(status)).toBe(false);
    expect(dmarcNoNextStep(status, "mail.acme.test")).not.toContain("rejects");
  });

  test("an inherited full reject says whose record applies", () => {
    const status = { ...base, reporting: false, report_address: null, inherited_from: "acme.test" };
    expect(dmarcNoNextStep(status, "mail.acme.test")).toBe(
      "mail.acme.test rejects mail that fails DMARC (through acme.test's record), the strongest protection against spoofing.",
    );
  });
});
