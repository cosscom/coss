/**
 * Money. Unit prices are `bigint` nanos (1e-9 USD) so per-unit rates like $0.00022 stay exact;
 * every persisted amount (fees, credits, invoice lines) is `bigint` cents. A line is computed in
 * nanos and rounded to cents once (`nanosToCents`); an invoice's total is the sum of its rounded
 * lines. Names carry the unit (`unitNanos`, `amountCents`). Client-safe: no dependencies.
 */

export const NANOS_PER_DOLLAR = 1_000_000_000n;
export const NANOS_PER_CENT = 10_000_000n;
export const CURRENCY = "usd";

/** Rounds half away from zero, so a credit and the charge it offsets round to the same cents. */
export function nanosToCents(nanos: bigint): bigint {
  const negative = nanos < 0n;
  const magnitude = negative ? -nanos : nanos;
  const rounded = (magnitude + NANOS_PER_CENT / 2n) / NANOS_PER_CENT;
  return negative ? -rounded : rounded;
}

export function centsToNanos(cents: bigint): bigint {
  return cents * NANOS_PER_CENT;
}

/** `amount × numerator / denominator`, rounded half away from zero (proration). */
export function prorate(amount: bigint, numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError("prorate: denominator must be positive.");
  const negative = amount < 0n !== numerator < 0n;
  const product = (amount < 0n ? -amount : amount) * (numerator < 0n ? -numerator : numerator);
  const rounded = (product * 2n + denominator) / (denominator * 2n);
  return negative ? -rounded : rounded;
}

/** `amount × percent / 100` for a percentage with up to two decimals (e.g. 12.5), rounded. */
export function percentOf(amount: bigint, percent: number): bigint {
  const basisPoints = BigInt(Math.round(percent * 100));
  return prorate(amount, basisPoints, 10_000n);
}

/** "$1,234.56", "-$0.40". */
export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const magnitude = negative ? -cents : cents;
  const dollars = (magnitude / 100n).toLocaleString("en-US");
  const rest = (magnitude % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}$${dollars}.${rest}`;
}

/**
 * A unit price for `per` units, with as many decimals as it needs (at least two): 400,000 nanos
 * per 1,000 units → "$0.40"; 13,500,000 nanos per unit → "$0.0135".
 */
export function formatUnitPrice(unitNanos: bigint, per = 1): string {
  const total = unitNanos * BigInt(per);
  const whole = total / NANOS_PER_DOLLAR;
  let fraction = (total % NANOS_PER_DOLLAR).toString().padStart(9, "0").replace(/0+$/, "");
  if (fraction.length < 2) fraction = fraction.padEnd(2, "0");
  return `$${whole.toLocaleString("en-US")}.${fraction}`;
}

const DECIMAL = /^\$?\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d+))?$/;

/** Parses "$1,000", "25.5", "0.0004" into nanos per unit (or `null` when malformed or too precise). */
export function parseDollarsToNanos(text: string): bigint | null {
  const match = DECIMAL.exec(text.trim());
  if (!match) return null;
  const whole = (match[1] ?? "0").replaceAll(",", "");
  const fraction = match[2] ?? "";
  if (fraction.length > 9) return null;
  return BigInt(whole) * NANOS_PER_DOLLAR + BigInt(fraction.padEnd(9, "0"));
}

/** Parses a dollar amount into cents (or `null` when malformed or finer than a cent). */
export function parseDollarsToCents(text: string): bigint | null {
  const nanos = parseDollarsToNanos(text);
  if (nanos === null || nanos % NANOS_PER_CENT !== 0n) return null;
  return nanos / NANOS_PER_CENT;
}

/** `JSON.stringify` that writes bigints as decimal strings (the form stored in jsonb). */
export function stringifyWithBigInt(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => (typeof v === "bigint" ? v.toString() : v));
}

export function maxBigInt(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
