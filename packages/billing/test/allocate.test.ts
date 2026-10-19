import { describe, expect, test } from "bun:test";
import {
  type AllocatedSpend,
  allocateUsageCharges,
  type DraftLine,
  splitByWeight,
  UNATTRIBUTED,
} from "../src/engine/index.ts";

const OCT = { start: new Date("2026-10-01T00:00:00Z"), end: new Date("2026-11-01T00:00:00Z") };

function line(kind: DraftLine["kind"], amountCents: bigint, meter?: "email.recipients"): DraftLine {
  return {
    kind,
    description: kind,
    amountCents,
    period: OCT,
    contractId: null,
    ...(meter ? { meter, dimension: "" } : {}),
  };
}

function centsByKey(allocated: AllocatedSpend[]): Record<string, bigint> {
  const out: Record<string, bigint> = {};
  for (const row of allocated) out[row.key] = (out[row.key] ?? 0n) + row.cents;
  return out;
}

describe("splitByWeight", () => {
  test("sums to the amount, largest remainder first, ties by key", () => {
    const split = splitByWeight(
      100n,
      new Map([
        ["a", 1],
        ["b", 1],
        ["c", 1],
      ]),
    );
    expect([...split.values()].reduce((s, v) => s + v, 0n)).toBe(100n);
    expect(split.get("a")).toBe(34n);
    expect(split.get("b")).toBe(33n);
    expect(split.get("c")).toBe(33n);
  });

  test("negative amounts split the same way", () => {
    const split = splitByWeight(
      -10n,
      new Map([
        ["a", 3],
        ["b", 1],
      ]),
    );
    expect(split.get("a")).toBe(-8n);
    expect(split.get("b")).toBe(-2n);
  });

  test("no weight: everything to the first key", () => {
    expect(
      splitByWeight(
        5n,
        new Map([
          ["b", 0],
          ["a", 0],
        ]),
      ).get("a"),
    ).toBe(5n);
  });
});

describe("allocateUsageCharges", () => {
  test("splits each meter's charge by quantity and sums to it", () => {
    const allocated = allocateUsageCharges({
      lines: [
        line("plan_fee", 2000n),
        line("usage", 1000n, "email.recipients"),
        line("usage", 333n, "email.recipients"),
        line("credit", -500n),
      ],
      totals: [{ meter: "email.recipients", dimension: "", quantity: 300 }],
      sources: [
        { key: "alice", meter: "email.recipients", dimension: "", quantity: 100 },
        { key: "bob", meter: "email.recipients", dimension: "", quantity: 200 },
      ],
    });
    const cents = centsByKey(allocated);
    // Credits and fees are not usage: only the 1,333 cents of usage lines are allocated.
    expect((cents.alice ?? 0n) + (cents.bob ?? 0n)).toBe(1333n);
    expect(cents.alice).toBe(444n);
    expect(cents.bob).toBe(889n);
    expect(cents[UNATTRIBUTED]).toBeUndefined();
  });

  test("usage without a recorded source is the organization's", () => {
    const allocated = allocateUsageCharges({
      lines: [line("usage", 900n, "email.recipients")],
      totals: [{ meter: "email.recipients", dimension: "", quantity: 300 }],
      sources: [{ key: "alice", meter: "email.recipients", dimension: "", quantity: 100 }],
    });
    expect(centsByKey(allocated)).toEqual({ alice: 300n, [UNATTRIBUTED]: 600n });
    expect(allocated.find((row) => row.key === UNATTRIBUTED)?.quantity).toBe(200);
  });

  test("discounts and caps come off the charge; a capped plan allocates nothing", () => {
    const discounted = allocateUsageCharges({
      lines: [
        line("usage", 1000n, "email.recipients"),
        line("discount", -200n, "email.recipients"),
      ],
      totals: [{ meter: "email.recipients", dimension: "", quantity: 4 }],
      sources: [{ key: "alice", meter: "email.recipients", dimension: "", quantity: 4 }],
    });
    expect(centsByKey(discounted)).toEqual({ alice: 800n });

    const capped = allocateUsageCharges({
      lines: [
        line("usage", 300n, "email.recipients"),
        line("write_off", -300n, "email.recipients"),
      ],
      totals: [{ meter: "email.recipients", dimension: "", quantity: 3000 }],
      sources: [{ key: "alice", meter: "email.recipients", dimension: "", quantity: 3000 }],
    });
    expect(centsByKey(capped)).toEqual({ alice: 0n });
  });

  test("usage inside the included units still counts, at no cost", () => {
    const allocated = allocateUsageCharges({
      lines: [],
      totals: [{ meter: "email.recipients", dimension: "", quantity: 50 }],
      sources: [{ key: "alice", meter: "email.recipients", dimension: "", quantity: 50 }],
    });
    expect(allocated).toEqual([
      { key: "alice", meter: "email.recipients", dimension: "", quantity: 50, cents: 0n },
    ]);
  });

  test("sources with the same key are merged; more sources than totals is tolerated", () => {
    const allocated = allocateUsageCharges({
      lines: [line("usage", 10n, "email.recipients")],
      totals: [{ meter: "email.recipients", dimension: "", quantity: 2 }],
      sources: [
        { key: "alice", meter: "email.recipients", dimension: "", quantity: 1 },
        { key: "alice", meter: "email.recipients", dimension: "", quantity: 1 },
        { key: "bob", meter: "email.recipients", dimension: "", quantity: 2 },
      ],
    });
    expect(centsByKey(allocated)).toEqual({ alice: 5n, bob: 5n });
  });
});
