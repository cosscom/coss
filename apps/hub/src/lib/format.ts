/** `49.1k`, `1.2M`: GitHub's compact counts. */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function number(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

const UNITS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.345, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
];

/** `3 minutes ago`, `last month`: how GitHub dates a row. */
export function relative(date: Date, now = new Date()): string {
  let value = (date.getTime() - now.getTime()) / 1000;
  if (Math.abs(value) < 45) return "just now";
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [size, unit] of UNITS) {
    if (Math.abs(value) < size) return format.format(Math.round(value), unit);
    value /= size;
  }
  return format.format(Math.round(value), "year");
}

export function long(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `4.8B`, `1.9M`, `420k` tokens. */
export function tokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return compact(n);
}

export function usd(n: number, fraction = n < 100 ? 2 : 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(n);
}
