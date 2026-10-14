import {
  formatDimension,
  METERS,
  type MeterKey,
  type MeterRates,
  type Rate,
} from "@coss/billing/catalog";
import { formatCents, formatUnitPrice } from "@coss/billing/money";

export { formatCents };

/** "1.2M", "45k", "800". */
export function formatQuantity(value: number): string {
  if (value >= 1_000_000)
    return `${Number((value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1))}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}k`;
  return value.toLocaleString("en-US");
}

/** "$0.40 per 1,000 recipients" or a tier list: "$0.40 per 1,000 · from 1M: $0.30 · from 10M: $0.22". */
export function formatRate(meter: MeterKey, rate: Rate): string {
  const definition = METERS[meter];
  const per =
    definition.displayPer === 1
      ? ` per ${definition.unit}`
      : ` per ${definition.displayPer.toLocaleString("en-US")} ${definition.units}`;
  const [first, ...rest] = rate.tiers;
  if (!first) return "";
  const head = `${formatUnitPrice(first.unitNanos, definition.displayPer)}${per}`;
  let lower = first.upTo ?? 0;
  const tail = rest.map((tier) => {
    const label = `from ${formatQuantity(lower)}: ${formatUnitPrice(tier.unitNanos, definition.displayPer)}`;
    lower = tier.upTo ?? lower;
    return label;
  });
  const mode = rate.mode === "volume" && rest.length ? " (volume)" : "";
  const window = rate.tierWindow === "term" ? " (tiers over the term)" : "";
  return [head, ...tail].join(" · ") + mode + window;
}

/** Every rate of a meter, one line per dimension value. */
export function formatMeterRates(meter: MeterKey, rates: MeterRates | undefined): string[] {
  if (!rates) return [];
  const lines: string[] = [];
  if (rates.default) lines.push(formatRate(meter, rates.default));
  for (const [dimension, rate] of Object.entries(rates.byDimension ?? {})) {
    lines.push(`${formatDimension(dimension)}: ${formatRate(meter, rate)}`);
  }
  return lines;
}

const DATE = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

export function formatDate(value: Date | string | null | undefined): string {
  return value ? DATE.format(new Date(value)) : "—";
}

/** A billing interval, end shown inclusive: "Oct 1 – Oct 31, 2026". */
export function formatPeriodRange(start: Date, end: Date): string {
  const last = new Date(end.getTime() - 1);
  return `${DATE.format(start)} – ${DATE.format(last)}`;
}

/** Cents as a plain decimal for form inputs ("1250.50"; "" for none). */
export function centsInput(value: bigint | null | undefined): string {
  if (value === null || value === undefined) return "";
  const whole = value / 100n;
  const rest = value % 100n;
  return rest === 0n ? whole.toString() : `${whole}.${rest.toString().padStart(2, "0")}`;
}
