const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const utcMonthDay = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const count = new Intl.NumberFormat();

export function formatDateTime(iso: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : "—";
}

export function formatDay(isoDay: string): string {
  return utcMonthDay.format(new Date(`${isoDay}T00:00:00Z`));
}

// Hermes has no Intl.RelativeTimeFormat.
export function formatAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d ago`;
  return monthDay.format(new Date(iso));
}

export function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${(rate * 100).toFixed(2)}%`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCount(value: number): string {
  return count.format(value);
}

export function formatPercent(ratio: number): string {
  const percent = ratio * 100;
  return `${percent >= 10 || percent === 0 ? Math.round(percent) : percent.toFixed(1)}%`;
}

export function formatCompact(value: number): string {
  if (value < 10_000) return formatCount(value);
  if (value < 1_000_000) return `${(value / 1_000).toFixed(value < 100_000 ? 1 : 0)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

/** "owner" → "Owner"; roles may be comma-joined. */
export function roleLabel(role: string): string {
  return role
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => name[0]?.toUpperCase() + name.slice(1))
    .join(", ");
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Integer cents (USD) → "$12.34". */
export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

const utcDay = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** A billing period (UTC, end exclusive) → "Oct 1, 2026 – Oct 31, 2026". */
export function formatPeriod(period: { start: string; end: string }): string {
  const last = new Date(new Date(period.end).getTime() - 1);
  return `${utcDay.format(new Date(period.start))} – ${utcDay.format(last)}`;
}
