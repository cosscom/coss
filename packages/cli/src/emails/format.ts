/** How emails, their events and received emails read in a terminal. */
import type { Email, EmailEvent, EmailSummary, ReceivedEmailSummary } from "coss";
import type { Output, Style } from "../output.ts";

/**
 * Text from elsewhere (subjects, addresses, bounce messages, received mail) without control
 * characters: an escape sequence in a received email must not reach the terminal. Newlines and
 * tabs stay where `multiline` says so.
 */
export function printable(text: string, multiline = false): string {
  // C0 controls (but tab and newline), DEL and C1 controls.
  const controls = multiline
    ? // biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point.
      /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g
    : // biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point.
      /[\u0000-\u001f\u007f-\u009f]/g;
  return text.replace(/\r\n/g, "\n").replace(controls, multiline ? "" : " ");
}

/** At most `max` characters, with an ellipsis when cut. */
export function shorten(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** `2026-10-15 11:59` (UTC, like the API's timestamps). */
export function minute(iso: string | null): string {
  return iso ? iso.slice(0, 16).replace("T", " ") : "";
}

/** `11:59:02` */
export function second(iso: string): string {
  return iso.slice(11, 19);
}

export function statusStyle(status: string): Style {
  if (status === "delivered" || status === "sent" || status === "received") return "green";
  if (
    status === "queued" ||
    status === "scheduled" ||
    status === "delivery_delayed" ||
    status === "in_progress"
  )
    return "yellow";
  if (status === "canceled") return "dim";
  return "red";
}

/**
 * Where an email stands, in a word or two: its own status until it was handed to the provider,
 * then its recipients' (`delivered`, `2 delivered, 1 bounced`).
 */
export function deliveryStatus(email: Email | EmailSummary): string {
  if (email.status !== "sent" || email.recipients.length === 0) return email.status;
  const counts = new Map<string, number>();
  for (const recipient of email.recipients) {
    counts.set(recipient.status, (counts.get(recipient.status) ?? 0) + 1);
  }
  if (counts.size === 1) return email.recipients[0]?.status ?? email.status;
  return [...counts].map(([status, count]) => `${count} ${status}`).join(", ");
}

/** Lines aligned in columns (the last one isn't padded). */
export function table(
  out: Output,
  header: string[],
  rows: string[][],
  styles?: (Style | null)[],
): void {
  const widths = header.map((title, column) =>
    Math.max(title.length, ...rows.map((row) => row[column]?.length ?? 0)),
  );
  const line = (cells: string[], style: (column: number) => Style | null) =>
    cells
      .map((cell, column) => {
        const padded = column === cells.length - 1 ? cell : cell.padEnd(widths[column] ?? 0);
        const chosen = style(column);
        return chosen ? out.style(chosen, padded) : padded;
      })
      .join("  ")
      .trimEnd();
  out.line(line(header, () => "dim"));
  for (const row of rows) out.line(line(row, (column) => styles?.[column] ?? null));
}

function eventStyle(type: EmailEvent["type"]): Style {
  switch (type) {
    case "email.sent":
    case "email.delivered":
      return "green";
    case "email.delivery_delayed":
    case "email.scheduled":
    case "email.rescheduled":
      return "yellow";
    case "email.opened":
    case "email.clicked":
    case "email.unsubscribed":
      return "cyan";
    case "email.canceled":
      return "dim";
    default:
      return "red";
  }
}

/** One event: time, type, recipient and what the provider said. */
export function formatEvent(out: Output, event: EmailEvent): string {
  const data = event.data;
  const detail =
    data.bounce?.diagnostic_code ??
    data.delivery?.smtp_response ??
    data.click?.url ??
    (data.suppression
      ? `suppressed (${data.suppression.reason}, ${data.suppression.scope})`
      : null) ??
    data.delay?.diagnostic_code ??
    (data.failure ? `${data.failure.code}: ${data.failure.message}` : null) ??
    (data.reschedule ? `→ ${data.reschedule.scheduled_at}` : null);
  return [
    out.style("dim", event.occurred_at),
    out.style(eventStyle(event.type), event.type),
    event.recipient ? printable(event.recipient) : "",
    detail ? out.style("dim", printable(detail)) : "",
  ]
    .filter(Boolean)
    .join("  ");
}

/** A received email in a list: when, who from, to whom, the subject. */
export function formatReceived(out: Output, email: ReceivedEmailSummary): string {
  const flags = [
    email.status === "blocked" ? out.style("red", "blocked") : "",
    email.spam ? out.style("yellow", "spam") : "",
  ].filter(Boolean);
  return [
    out.style("dim", minute(email.received_at)),
    printable(email.from ?? (email.mail_from || "(no sender)")),
    "→",
    printable(email.recipients.join(", ")),
    ...flags,
    shorten(printable(email.subject ?? "(no subject)"), 80),
    out.style("dim", email.id),
  ].join("  ");
}
