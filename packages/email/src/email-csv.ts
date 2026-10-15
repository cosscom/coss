/** CSV export of the dashboard's email list: one row per email, never content or headers. */
import { csvField } from "@coss/logs";
import { type EmailExportItem, type EmailListFilters, exportEmailPages } from "./read.ts";

export const EMAIL_CSV_COLUMNS = [
  "created_at",
  "status",
  "from",
  "to",
  "cc",
  "bcc",
  "reply_to",
  "subject",
  "category",
  "tags",
  "recipients",
  "open_count",
  "click_count",
  "scheduled_at",
  "sent_at",
  "batch_id",
  "id",
] as const;

type EmailCsvColumn = (typeof EMAIL_CSV_COLUMNS)[number];

/** Lists are joined with `; `: display names may hold commas. */
function cell(email: EmailExportItem, column: EmailCsvColumn): string | null {
  switch (column) {
    case "to":
    case "cc":
    case "bcc":
    case "reply_to":
      return email[column].join("; ");
    case "tags":
      return email.tags.map((tag) => `${tag.name}:${tag.value}`).join("; ");
    case "recipients":
      return email.recipients
        .map((recipient) => `${recipient.address} (${recipient.status})`)
        .join("; ");
    case "open_count":
      return email.tracking.opens ? String(email.tracking.open_count) : null;
    case "click_count":
      return email.tracking.clicks ? String(email.tracking.click_count) : null;
    default:
      return email[column];
  }
}

export function emailCsvRow(email: EmailExportItem): string {
  return `${EMAIL_CSV_COLUMNS.map((column) => csvField(cell(email, column))).join(",")}\r\n`;
}

/** The emails the list matches (its cursor ignored) as CSV, header first, read page by page. */
export function emailsCsvStream(
  input: { organizationId: string; environmentId: string } & EmailListFilters,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const pages = exportEmailPages({ ...input, before: undefined });
  let headerSent = false;
  return new ReadableStream({
    async pull(controller) {
      if (!headerSent) {
        headerSent = true;
        controller.enqueue(encoder.encode(`${EMAIL_CSV_COLUMNS.join(",")}\r\n`));
        return;
      }
      const next = await pages.next();
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(next.value.map(emailCsvRow).join("")));
    },
    async cancel() {
      await pages.return(undefined);
    },
  });
}
