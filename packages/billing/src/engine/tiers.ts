/** Prices a range of unit positions through a rate's tiers. */
import type { Rate } from "../catalog/rates.ts";

export type TierCharge = {
  /** Positions `[from, to)` in the rate's tier window. */
  from: number;
  to: number;
  unitNanos: bigint;
  amountNanos: bigint;
};

export type RangeCharge = { amountNanos: bigint; tiers: TierCharge[] };

/**
 * The charge for the units at positions `[from, to)` of the tier window. `windowTotal` (the
 * window's whole quantity) only matters for volume pricing, where it picks the one tier every
 * unit is priced at.
 */
export function chargeRange(
  rate: Rate,
  from: number,
  to: number,
  windowTotal: number,
): RangeCharge {
  if (to <= from) return { amountNanos: 0n, tiers: [] };
  if (rate.mode === "volume") {
    const tier =
      rate.tiers.find((t) => t.upTo === null || windowTotal <= t.upTo) ?? rate.tiers.at(-1);
    if (!tier) return { amountNanos: 0n, tiers: [] };
    const amountNanos = BigInt(to - from) * tier.unitNanos;
    return { amountNanos, tiers: [{ from, to, unitNanos: tier.unitNanos, amountNanos }] };
  }

  const tiers: TierCharge[] = [];
  let amountNanos = 0n;
  let lower = 0;
  for (const tier of rate.tiers) {
    const upper = tier.upTo ?? Number.POSITIVE_INFINITY;
    const start = Math.max(from, lower);
    const end = Math.min(to, upper);
    if (end > start) {
      const charge = BigInt(end - start) * tier.unitNanos;
      tiers.push({ from: start, to: end, unitNanos: tier.unitNanos, amountNanos: charge });
      amountNanos += charge;
    }
    if (upper >= to) break;
    lower = upper;
  }
  return { amountNanos, tiers };
}

/** The unit price when a rate has a single tier (`null` when the price depends on volume). */
export function singleUnitPrice(rate: Rate): bigint | null {
  return rate.tiers.length === 1 ? (rate.tiers[0]?.unitNanos ?? null) : null;
}
