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
