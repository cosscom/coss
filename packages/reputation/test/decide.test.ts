import { describe, expect, test } from "bun:test";
import { type CheckResult, rateResult } from "../src/checks.ts";
import { decide, worstResult } from "../src/decide.ts";
import { DEFAULT_REPUTATION_POLICY, effectivePolicy } from "../src/schemas.ts";

function result(trigger: string, severity: CheckResult["severity"]): CheckResult {
  return {
    trigger,
    severity,
    message: "",
    rate: null,
    count: 0,
    volume: 0,
    warningThreshold: null,
    suspendThreshold: null,
    minimumVolume: null,
  };
}

describe("decide", () => {
  const good = { status: "good" as const, reason: null };
  const warning = { status: "warning" as const, reason: "bounce_rate" };
  const suspended = { status: "suspended" as const, reason: "complaint_rate" };

  test("the worst result wins, naming its trigger", () => {
    expect(
      decide(good, [result("bounce_rate", "warning"), result("complaint_rate", "suspend")]),
    ).toEqual({ to: "suspended", type: "suspended", trigger: "complaint_rate" });
    expect(
      decide(good, [result("bounce_rate", "warning"), result("complaint_rate", "ok")]),
    ).toEqual({ to: "warning", type: "warning_raised", trigger: "bounce_rate" });
  });

  test("warned organizations get suspended, and recover once every check is ok", () => {
    expect(decide(warning, [result("bounce_rate", "suspend")])?.to).toBe("suspended");
    expect(decide(warning, [result("bounce_rate", "warning")])).toBeNull();
    expect(decide(warning, [result("bounce_rate", "ok")])).toEqual({
      to: "good",
      type: "warning_cleared",
      trigger: "bounce_rate",
    });
  });

  test("a suspension is never lifted automatically", () => {
    expect(decide(suspended, [result("bounce_rate", "ok")])).toBeNull();
    expect(decide(suspended, [result("bounce_rate", "suspend")])).toBeNull();
  });

  test("an organization that can't be suspended is warned instead", () => {
    const opts = { canSuspend: false };
    expect(decide(good, [result("complaint_rate", "suspend")], opts)).toEqual({
      to: "warning",
      type: "warning_raised",
      trigger: "complaint_rate",
    });
    expect(decide(warning, [result("bounce_rate", "suspend")], opts)).toBeNull();
    expect(decide(warning, [result("bounce_rate", "ok")], opts)?.to).toBe("good");
  });

  test("nothing happens to a good organization with ok results (or none)", () => {
    expect(decide(good, [result("bounce_rate", "ok")])).toBeNull();
    expect(decide(good, [])).toBeNull();
    expect(worstResult([])).toBeNull();
  });
});

describe("rateResult", () => {
  const threshold = { warning: 0.04, suspend: 0.08, minimumRecipients: 200 };

  test("grades the rate against the thresholds (inclusive)", () => {
    const at = (count: number) =>
      rateResult({ trigger: "bounce_rate", label: "Bounce rate", count, volume: 1000, threshold })
        .severity;
    expect(at(39)).toBe("ok");
    expect(at(40)).toBe("warning");
    expect(at(80)).toBe("suspend");
  });

  test("never acts below the minimum volume, but still reports the rate", () => {
    const below = rateResult({
      trigger: "bounce_rate",
      label: "Bounce rate",
      count: 199,
      volume: 199,
      threshold,
    });
    expect(below).toMatchObject({ severity: "ok", rate: 1, count: 199, volume: 199 });
    expect(
      rateResult({ trigger: "x", label: "X", count: 0, volume: 0, threshold }).rate,
    ).toBeNull();
  });
});

describe("effectivePolicy", () => {
  test("merges overrides over the defaults", () => {
    expect(effectivePolicy(null)).toEqual(DEFAULT_REPUTATION_POLICY);
    const policy = effectivePolicy({
      bounceRate: { suspend: 0.2 },
      countSimulatorRecipients: true,
    });
    expect(policy.bounceRate).toEqual({ warning: 0.04, suspend: 0.2, minimumRecipients: 200 });
    expect(policy.complaintRate).toEqual(DEFAULT_REPUTATION_POLICY.complaintRate);
    expect(policy.countSimulatorRecipients).toBe(true);
  });

  test("rejects unknown keys and a warning above the suspension threshold", () => {
    expect(() => effectivePolicy({ nope: 1 })).toThrow();
    expect(() => effectivePolicy({ bounceRate: { warning: 0.5, suspend: 0.1 } })).toThrow();
  });

  test("merges content screening overrides and keeps flag at or below block", () => {
    const policy = effectivePolicy({ contentScreening: { enforce: false, sampleRate: 0.5 } });
    expect(policy.contentScreening).toEqual({
      ...DEFAULT_REPUTATION_POLICY.contentScreening,
      enforce: false,
      sampleRate: 0.5,
    });
    expect(() => effectivePolicy({ contentScreening: { flagThreshold: 0.99 } })).toThrow();
    expect(() => effectivePolicy({ contentScreening: { sampleRate: 2 } })).toThrow();
  });
});
