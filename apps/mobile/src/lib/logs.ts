import type { LogEntry } from "@coss/companion";

/** What the dashboard's log explorer shows for a line, by source. */
export function logSummary(entry: LogEntry): { title: string; subtitle: string } {
  const duration = entry.duration_ms !== null ? `${entry.duration_ms} ms` : null;
  if (entry.source === "api") {
    return {
      title: `${entry.method ?? ""} ${entry.path ?? ""}`.trim() || entry.message,
      subtitle: [entry.status_code, duration, entry.error_code].filter(Boolean).join(" · "),
    };
  }
  if (entry.source === "email") {
    return {
      title: entry.type.replace(/^email\./, ""),
      subtitle: [entry.recipient ?? entry.resource_id, entry.error_code]
        .filter(Boolean)
        .join(" · "),
    };
  }
  if (entry.source === "smtp") {
    // The reply, e.g. "250 2.0.0 OK queued as email_…"
    return {
      title: entry.message,
      subtitle: [entry.resource_id, entry.error_code, duration].filter(Boolean).join(" · "),
    };
  }
  if (entry.source === "webhook") {
    // "{event type} → {url} {status}"
    const [event, target] = entry.message.split(" → ");
    return {
      title: event ?? entry.message,
      subtitle: [target && `→ ${target}`, duration].filter(Boolean).join(" · "),
    };
  }
  return { title: entry.message, subtitle: entry.type };
}
