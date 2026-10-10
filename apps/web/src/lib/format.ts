const dateTime = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** Server-rendered timestamps use UTC so they don't depend on the server's time zone. */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return `${dateTime.format(new Date(value))} UTC`;
}
