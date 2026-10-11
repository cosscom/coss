import type { LimitRule } from "./buckets.ts";

const UNITS: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** `"5m"` → 300000. Accepts ms, s, m, h and d; throws a `RangeError` otherwise. */
export function parsePeriod(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) throw new RangeError(`Invalid period "${value}" (e.g. 1s, 5m, 1h, 1d).`);
  return Number(match[1]) * (UNITS[match[2] ?? "ms"] ?? 1);
}

/** 300000 → `"5m"`: the largest unit that divides the period exactly. */
export function formatPeriod(ms: number): string {
  for (const unit of ["d", "h", "m", "s"] as const) {
    const size = UNITS[unit] ?? 1;
    if (ms % size === 0) return `${ms / size}${unit}`;
  }
  return `${ms}ms`;
}

/** `"50 per 1s, burst 100"`. */
export function describeRule(rule: LimitRule): string {
  return `${rule.limit} per ${formatPeriod(rule.periodMs)}, burst ${rule.burst ?? rule.limit}`;
}
