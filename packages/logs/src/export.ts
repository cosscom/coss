import type { LogFilters } from "./query.ts";
import { exportLogPages, type LogRange, type LogScope } from "./read.ts";
import type { LogEntryOutput, OrgAuditEventOutput } from "./schemas.ts";

export const LOG_CSV_COLUMNS = [
  "occurred_at",
  "level",
  "source",
  "type",
  "method",
  "status_code",
  "path",
  "route",
  "duration_ms",
  "message",
  "request_id",
  "resource_type",
  "resource_id",
  "recipient",
  "api_key_id",
  "error_code",
  "client_ip",
  "user_agent",
  "id",
] as const satisfies readonly (keyof LogEntryOutput)[];

/** Guard formula starts (spreadsheets execute them) and quote when needed. */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const safe = /^['=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function logCsvRow(entry: LogEntryOutput): string {
  return `${LOG_CSV_COLUMNS.map((column) => csvField(entry[column])).join(",")}\r\n`;
}

export type LogExportFormat = "csv" | "ndjson";

/** The matching lines as CSV (header first) or NDJSON, read page by page. */
export function logExportStream(
  input: LogScope & LogRange & { filters?: LogFilters },
  format: LogExportFormat,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const pages = exportLogPages(input);
  let headerSent = format !== "csv";
  return new ReadableStream({
    async pull(controller) {
      if (!headerSent) {
        headerSent = true;
        controller.enqueue(encoder.encode(`${LOG_CSV_COLUMNS.join(",")}\r\n`));
        return;
      }
      const next = await pages.next();
      if (next.done) {
        controller.close();
        return;
      }
      const chunk =
        format === "csv"
          ? next.value.map(logCsvRow).join("")
          : next.value.map((entry) => `${JSON.stringify(entry)}\n`).join("");
      controller.enqueue(encoder.encode(chunk));
    },
    async cancel() {
      await pages.return(undefined);
    },
  });
}

export const ORG_AUDIT_CSV_COLUMNS = [
  "created_at",
  "actor_type",
  "actor_label",
  "actor_id",
  "action",
  "target_type",
  "target_label",
  "target_id",
  "project_id",
  "environment_id",
  "client_ip",
  "user_agent",
  "metadata",
  "id",
] as const satisfies readonly (keyof OrgAuditEventOutput)[];

export function orgAuditCsvHeader(): string {
  return `${ORG_AUDIT_CSV_COLUMNS.join(",")}\r\n`;
}

export function orgAuditCsvRow(event: OrgAuditEventOutput): string {
  return `${ORG_AUDIT_CSV_COLUMNS.map((column) =>
    csvField(column === "metadata" ? JSON.stringify(event.metadata) : event[column]),
  ).join(",")}\r\n`;
}
