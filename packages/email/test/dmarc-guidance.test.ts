import { describe, expect, test } from "bun:test";
import {
  DMARC_READINESS,
  type DmarcGuidanceInput,
  type DmarcReportTotals,
  dmarcGuidance,
  unauthenticatedSources,
} from "../src/dmarc-guidance.ts";
import { parseDmarcRecord } from "../src/dmarc-record.ts";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-15T12:00:00Z");
const ADDRESS = "dmarc-abcdefghijkmnpqr@inbound.coss.test";
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

/** Healthy reports: 20 days of them, all COSS mail passing, a small forwarder failing. */
const HEALTHY: DmarcReportTotals = {
  messages: 10_000,
  passing: 9_950,
  cossMessages: 9_900,
  cossPassing: 9_900,
  sources: [
    {
      sourceIp: "54.240.8.1",
      headerFrom: "acme.test",
      messages: 9_900,
      passing: 9_900,
      viaCoss: true,
    },
    {
      sourceIp: "198.51.100.7",
      headerFrom: "acme.test",
      messages: 100,
      passing: 50,
      viaCoss: false,
    },
  ],
  firstReportAt: ago(20),
  lastReportAt: ago(1),
  truncatedReports: 0,
};

function input(
  record: string | null,
  overrides: Partial<DmarcGuidanceInput> = {},
): DmarcGuidanceInput {
  return {
    record: record === null ? null : parseDmarcRecord(record),
    invalid: false,
    inherited: null,
    checked: true,
    policySince: ago(30),
    reportAddress: ADDRESS,
    totals: HEALTHY,
    now: NOW,
    ...overrides,
  };
}

const NONE = `v=DMARC1; p=none; rua=mailto:${ADDRESS}`;
const QUARANTINE = `v=DMARC1; p=quarantine; rua=mailto:${ADDRESS}`;

describe("dmarcGuidance", () => {
  test("no record: publish monitoring with COSS's address", () => {
    expect(dmarcGuidance(input(null))).toMatchObject({
      stage: "no_record",
      policy: null,
      ready: true,
      next: { kind: "publish", policy: "none", record: `v=DMARC1; p=none; rua=mailto:${ADDRESS};` },
    });
    expect(dmarcGuidance(input(null, { checked: false })).stage).toBe("not_checked");
  });

  test("a record without COSS's address: add reporting first, keeping the policy", () => {
    const guidance = dmarcGuidance(input("v=DMARC1; p=quarantine; rua=mailto:ops@acme.test"));
    expect(guidance).toMatchObject({
      stage: "quarantine",
      reporting: false,
      ready: true,
      next: {
        kind: "add_reporting",
        policy: "quarantine",
        record: `v=DMARC1; p=quarantine; rua=mailto:ops@acme.test,mailto:${ADDRESS};`,
      },
    });
  });

  test("adding reporting to a partly enforced record keeps pct and t", () => {
    const guidance = dmarcGuidance(input("v=DMARC1; p=reject; pct=1; t=y"));
    expect(guidance).toMatchObject({
      stage: "reject",
      partial: true,
      ready: true,
      next: {
        kind: "add_reporting",
        policy: "reject",
        record: `v=DMARC1; p=reject; pct=1; t=y; rua=mailto:${ADDRESS};`,
      },
    });
  });

  test("a subdomain without a record: its organizational domain's applies, kept as its own", () => {
    const parent = parseDmarcRecord(
      "v=DMARC1; p=reject; sp=quarantine; pct=50; rua=mailto:o@x.test",
    );
    const guidance = dmarcGuidance(
      input(null, { inherited: parent ? { domain: "acme.test", record: parent } : null }),
    );
    expect(guidance).toMatchObject({
      stage: "quarantine",
      policy: "quarantine",
      inheritedFrom: "acme.test",
      partial: true,
      reporting: false,
      ready: true,
      next: {
        kind: "publish",
        policy: "quarantine",
        record: `v=DMARC1; p=quarantine; pct=50; rua=mailto:${ADDRESS};`,
      },
    });
    // Its own record (even one of none) wins.
    expect(
      dmarcGuidance(
        input(NONE, { inherited: parent ? { domain: "acme.test", record: parent } : null }),
      ),
    ).toMatchObject({ stage: "monitoring", inheritedFrom: null });
  });

  test("an invalid record of its own counts as no policy, inherited or not", () => {
    const parent = parseDmarcRecord("v=DMARC1; p=reject");
    const guidance = dmarcGuidance(
      input(null, {
        invalid: true,
        inherited: parent ? { domain: "acme.test", record: parent } : null,
      }),
    );
    expect(guidance).toMatchObject({
      stage: "no_record",
      policy: null,
      inheritedFrom: null,
      next: { kind: "publish", policy: "none" },
    });
    expect(guidance.warnings[0]).toContain("isn't valid");
  });

  test("a truncated report in the window blocks the next step", () => {
    const guidance = dmarcGuidance(input(NONE, { totals: { ...HEALTHY, truncatedReports: 1 } }));
    expect(guidance.ready).toBe(false);
    expect(guidance.checks.find((check) => check.id === "complete")?.ok).toBe(false);
  });

  test("monitoring with healthy reports: ready for quarantine", () => {
    const guidance = dmarcGuidance(input(NONE));
    expect(guidance.stage).toBe("monitoring");
    expect(guidance.next).toEqual({
      kind: "tighten",
      policy: "quarantine",
      record: `v=DMARC1; p=quarantine; rua=mailto:${ADDRESS};`,
    });
    expect(guidance.checks.map((check) => [check.id, check.ok])).toEqual([
      ["coverage", true],
      ["recent", true],
      ["coss_pass_rate", true],
      ["pass_rate", true],
      ["sources", true],
    ]);
    expect(guidance.ready).toBe(true);
  });

  test("each readiness check can hold the step back", () => {
    const failing = (totals: Partial<DmarcReportTotals>) =>
      dmarcGuidance(input(NONE, { totals: { ...HEALTHY, ...totals } }))
        .checks.filter((check) => !check.ok)
        .map((check) => check.id);
    expect(failing({ firstReportAt: ago(DMARC_READINESS.coverageDays - 1) })).toEqual(["coverage"]);
    expect(failing({ lastReportAt: ago(DMARC_READINESS.recentDays + 1) })).toEqual(["recent"]);
    expect(failing({ cossPassing: 9_700 })).toEqual(["coss_pass_rate"]);
    expect(failing({ cossMessages: 0, cossPassing: 0 })).toEqual(["coss_pass_rate"]);
    expect(failing({ passing: 9_700 })).toEqual(["pass_rate"]);
    expect(
      failing({
        sources: [
          ...HEALTHY.sources,
          {
            sourceIp: "203.0.113.9",
            headerFrom: "acme.test",
            messages: 150,
            passing: 0,
            viaCoss: false,
          },
        ],
      }),
    ).toEqual(["sources"]);
    expect(
      dmarcGuidance(
        input(NONE, { totals: { ...HEALTHY, firstReportAt: null, lastReportAt: null } }),
      ).ready,
    ).toBe(false);
  });

  test("quarantine: reject needs 14 days at quarantine and a stricter pass rate", () => {
    const recent = dmarcGuidance(input(QUARANTINE, { policySince: ago(5) }));
    expect(recent.next).toMatchObject({ kind: "tighten", policy: "reject" });
    expect(recent.checks.find((check) => check.id === "time_at_policy")).toMatchObject({
      ok: false,
      message: "Quarantine has applied in full for 5 of 14 days.",
    });
    expect(recent.ready).toBe(false);
    expect(dmarcGuidance(input(QUARANTINE)).ready).toBe(true);
    const below = dmarcGuidance(
      input(QUARANTINE, { totals: { ...HEALTHY, passing: 9_850 } }),
    ).checks.find((check) => check.id === "pass_rate");
    // 98.5% passes for quarantine but not for reject.
    expect(below?.ok).toBe(false);
  });

  test("partial enforcement completes the current policy first", () => {
    const guidance = dmarcGuidance(input(`${QUARANTINE}; pct=25`));
    expect(guidance).toMatchObject({
      stage: "quarantine",
      partial: true,
      next: {
        kind: "complete_rollout",
        policy: "quarantine",
        record: `v=DMARC1; p=quarantine; rua=mailto:${ADDRESS};`,
      },
      ready: true,
    });
    expect(guidance.checks.map((check) => check.id)).not.toContain("time_at_policy");
  });

  test("reject is the end; warns when COSS mail fails or subdomains are weaker", () => {
    const done = dmarcGuidance(input(`v=DMARC1; p=reject; sp=none; rua=mailto:${ADDRESS}`));
    expect(done).toMatchObject({ stage: "reject", next: null, ready: false });
    expect(done.warnings).toEqual([expect.stringContaining("sp=none")]);
    const failing = dmarcGuidance(
      input(`v=DMARC1; p=reject; rua=mailto:${ADDRESS}`, {
        totals: { ...HEALTHY, cossPassing: 9_000 },
      }),
    );
    expect(failing.warnings).toEqual([expect.stringContaining("receivers reject the rest")]);
  });

  test("without a report address nothing asks to add reporting", () => {
    const guidance = dmarcGuidance(input("v=DMARC1; p=none", { reportAddress: null }));
    expect(guidance.next).toEqual({
      kind: "tighten",
      policy: "quarantine",
      record: "v=DMARC1; p=quarantine;",
    });
  });
});

describe("unauthenticatedSources", () => {
  test("lists non-COSS sources failing with at least 1% of the volume", () => {
    expect(unauthenticatedSources(HEALTHY)).toEqual([]);
    const totals = {
      ...HEALTHY,
      sources: [
        { sourceIp: "a", headerFrom: "acme.test", messages: 200, passing: 0, viaCoss: false },
        { sourceIp: "b", headerFrom: "acme.test", messages: 300, passing: 0, viaCoss: true },
        { sourceIp: "c", headerFrom: "acme.test", messages: 500, passing: 0, viaCoss: false },
      ],
    };
    expect(unauthenticatedSources(totals).map((source) => source.sourceIp)).toEqual(["c", "a"]);
  });
});
