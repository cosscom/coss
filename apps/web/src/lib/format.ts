const dateTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const BYTE_UNITS = ["B", "KB", "MB", "GB"];

/** `1536` → `"1.5 KB"` (binary multiples, as attachment limits are stated). */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const rounded = unit === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${BYTE_UNITS[unit]}`;
}

/** Server-rendered timestamps use UTC so they don't depend on the server's time zone. */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return `${dateTime.format(new Date(value))} UTC`;
}

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "5 min. ago", "in 2 days", "now": for lists, with `formatDateTime` as its title. */
export function formatRelative(value: Date | string, now: Date = new Date()): string {
  const diff = new Date(value).getTime() - now.getTime();
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return relativeTime.format(Math.round(diff / ms), unit);
  }
  return "now";
}

/** `252_000` → `"4m 12s"`, `45_000` → `"45s"`, `3_780_000` → `"1h 3m"`. */
export function formatElapsed(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** `12345` → `"12.3K"`: for stat tiles. */
export function formatCompact(value: number): string {
  return compactNumber.format(value);
}

/** `0.0123` → `"1.2%"`; `null` (nothing to divide) → `"—"`. */
export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const percent = value * 100;
  return `${percent >= 10 || percent === 0 ? Math.round(percent) : percent.toFixed(1)}%`;
}
