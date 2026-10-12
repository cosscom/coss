import { describe, expect, test } from "bun:test";
import {
  formatCents,
  formatUnitPrice,
  nanosToCents,
  parseDollarsToCents,
  parseDollarsToNanos,
  percentOf,
  prorate,
  stringifyWithBigInt,
} from "../src/money.ts";
import { parseContractTerms } from "../src/schemas.ts";

describe("money", () => {
  test("rounds half away from zero", () => {
    expect(nanosToCents(4_999_999n)).toBe(0n);
    expect(nanosToCents(5_000_000n)).toBe(1n);
    expect(nanosToCents(-5_000_000n)).toBe(-1n);
    expect(prorate(2_500n, 480n, 744n)).toBe(1_613n);
    expect(percentOf(999n, 12.5)).toBe(125n);
  });

  test("formats prices with the decimals they need", () => {
    expect(formatUnitPrice(400_000n, 1000)).toBe("$0.40");
    expect(formatUnitPrice(220_000n, 1000)).toBe("$0.22");
    expect(formatUnitPrice(13_500_000n)).toBe("$0.0135");
    expect(formatUnitPrice(1_500_000n, 1000)).toBe("$1.50");
    expect(formatCents(123_456n)).toBe("$1,234.56");
    expect(formatCents(-40n)).toBe("-$0.40");
  });

  test("parses dollars", () => {
    expect(parseDollarsToNanos("0.0004")).toBe(400_000n);
    expect(parseDollarsToNanos("$1,000")).toBe(1_000_000_000_000n);
    expect(parseDollarsToNanos("0.0000000001")).toBeNull();
    expect(parseDollarsToCents("25.50")).toBe(2_550n);
    expect(parseDollarsToCents("0.001")).toBeNull();
    expect(parseDollarsToCents("abc")).toBeNull();
  });
});

describe("contract terms", () => {
  test("amounts round-trip through jsonb as strings", () => {
    const terms = parseContractTerms({
      version: 1,
      plan: "enterprise",
      fee: { amountCents: 200_000n, interval: "year", timing: "advance" },
    });
    const stored = JSON.parse(stringifyWithBigInt(terms));
    expect(stored.fee.amountCents).toBe("200000");
    expect(parseContractTerms(stored)).toEqual(terms);
  });

  test("rejects malformed tiers and duplicate commitments", () => {
    const tiers = (list: unknown[]) => ({
      version: 1,
      plan: "pro",
      rates: { "email.recipients": { default: { mode: "graduated", tiers: list } } },
    });
    expect(() => parseContractTerms(tiers([{ upTo: 10, unitNanos: "1" }]))).toThrow("no limit");
    expect(() =>
      parseContractTerms(
        tiers([
          { upTo: 10, unitNanos: "1" },
          { upTo: 5, unitNanos: "1" },
          { upTo: null, unitNanos: "1" },
        ]),
      ),
    ).toThrow("increase");
    const commitment = {
      id: "a",
      kind: "minimum_spend",
      amountCents: "1",
      period: "month",
      counts: "usage",
    };
    expect(() =>
      parseContractTerms({ version: 1, plan: "enterprise", commitments: [commitment, commitment] }),
    ).toThrow("unique");
    expect(() => parseContractTerms({ version: 1, plan: "gold" })).toThrow();
  });

  test("a per-second rate limit must fit one maximal send", () => {
    expect(() =>
      parseContractTerms({
        version: 1,
        plan: "enterprise",
        entitlements: { rateLimits: { "email.recipients.second": { limit: 10, periodMs: 1000 } } },
      }),
    ).toThrow("burst");
  });
});
