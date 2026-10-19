/**
 * Spend attribution: splitting a period's usage charges over whoever caused the usage (projects,
 * API keys, members) by their share of each meter's quantity. Charges are rated over the whole
 * organization (tiers, included units), so a source's spend is its share of what the organization
 * pays for that meter, and every source's spend adds up to the invoice's usage lines exactly.
 */
import type { MeterKey } from "../catalog/meters.ts";
import type { DraftLine, UsageTotal } from "./types.ts";

/** The lines a usage charge is made of: the charge, and what discounts or caps take off it. */
const ALLOCATED_KINDS: ReadonlySet<DraftLine["kind"]> = new Set(["usage", "discount", "write_off"]);

/** One source's usage of a meter (and dimension value); `key` identifies the source. */
export type SourceUsage = { key: string; meter: MeterKey; dimension: string; quantity: number };

export type AllocatedSpend = SourceUsage & { cents: bigint };

/** The source that usage without a recorded source goes to (`""`). */
export const UNATTRIBUTED = "";

function meterKey(meter: string, dimension: string): string {
  return `${meter}\u0000${dimension}`;
}

/**
 * Splits each meter's net usage charge (usage lines, minus meter discounts and write-offs; credits
 * are not taken off: they pay for spend, they don't reduce it) over `sources` by quantity. Usage
 * in `totals` beyond what `sources` account for goes to `UNATTRIBUTED`. Rounding uses the largest
 * remainder (ties by key), so each meter's allocations sum to its charge to the cent. Sources with
 * the same key and meter are merged.
 */
export function allocateUsageCharges(input: {
  lines: readonly DraftLine[];
  totals: readonly UsageTotal[];
  sources: readonly SourceUsage[];
}): AllocatedSpend[] {
  const charges = new Map<string, bigint>();
  for (const line of input.lines) {
    if (!ALLOCATED_KINDS.has(line.kind) || !line.meter) continue;
    const key = meterKey(line.meter, line.dimension ?? "");
    charges.set(key, (charges.get(key) ?? 0n) + line.amountCents);
  }

  const groups = new Map<
    string,
    { meter: MeterKey; dimension: string; byKey: Map<string, number> }
  >();
  const group = (meter: MeterKey, dimension: string) => {
    const key = meterKey(meter, dimension);
    let found = groups.get(key);
    if (!found) {
      found = { meter, dimension, byKey: new Map() };
      groups.set(key, found);
    }
    return found;
  };
  for (const source of input.sources) {
    if (!(source.quantity > 0)) continue;
    const { byKey } = group(source.meter, source.dimension);
    byKey.set(source.key, (byKey.get(source.key) ?? 0) + source.quantity);
  }
  for (const total of input.totals) {
    const { byKey } = group(total.meter, total.dimension);
    let attributed = 0;
    for (const quantity of byKey.values()) attributed += quantity;
    const rest = total.quantity - attributed;
    if (rest > 0) byKey.set(UNATTRIBUTED, (byKey.get(UNATTRIBUTED) ?? 0) + rest);
  }
  // A charge without any usage behind it (not expected) stays with the organization.
  for (const key of charges.keys()) {
    const [meter = "", dimension = ""] = key.split("\u0000");
    const found = group(meter as MeterKey, dimension);
    if (found.byKey.size === 0) found.byKey.set(UNATTRIBUTED, 0);
  }

  const allocated: AllocatedSpend[] = [];
  for (const [key, { meter, dimension, byKey }] of groups) {
    const shares = splitByWeight(charges.get(key) ?? 0n, byKey);
    for (const [sourceKey, quantity] of byKey) {
      allocated.push({
        key: sourceKey,
        meter,
        dimension,
        quantity,
        cents: shares.get(sourceKey) ?? 0n,
      });
    }
  }
  return allocated;
}

/**
 * `amount` split in proportion to `weights` (largest remainder, ties by key). Without any weight
 * it all goes to the first key.
 */
export function splitByWeight(
  amount: bigint,
  weights: ReadonlyMap<string, number>,
): Map<string, bigint> {
  const keys = [...weights.keys()].sort();
  const result = new Map<string, bigint>(keys.map((key) => [key, 0n]));
  if (keys.length === 0 || amount === 0n) return result;
  const sign = amount < 0n ? -1n : 1n;
  const magnitude = amount * sign;
  const total = keys.reduce((sum, key) => sum + BigInt(Math.max(0, weights.get(key) ?? 0)), 0n);
  if (total === 0n) {
    result.set(keys[0] as string, amount);
    return result;
  }
  let given = 0n;
  const remainders: { key: string; remainder: bigint }[] = [];
  for (const key of keys) {
    const weight = BigInt(Math.max(0, weights.get(key) ?? 0));
    const share = (magnitude * weight) / total;
    result.set(key, share);
    given += share;
    remainders.push({ key, remainder: (magnitude * weight) % total });
  }
  remainders.sort((a, b) =>
    a.remainder === b.remainder ? a.key.localeCompare(b.key) : a.remainder > b.remainder ? -1 : 1,
  );
  for (let i = 0; given < magnitude; i++, given++) {
    const { key } = remainders[i % remainders.length] as { key: string };
    result.set(key, (result.get(key) ?? 0n) + 1n);
  }
  for (const key of keys) result.set(key, (result.get(key) ?? 0n) * sign);
  return result;
}
