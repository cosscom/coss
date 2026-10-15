import type { EmailEventOutput } from "@coss/email";
import { formatDateTime } from "./format";

/** One-line summary of an event's details. */
export function eventDetail({ data }: EmailEventOutput): string {
  if (data.bounce) {
    const { type, sub_type, diagnostic_code } = data.bounce;
    return [`${type} / ${sub_type}`, diagnostic_code].filter(Boolean).join(": ");
  }
  if (data.complaint) return data.complaint.feedback_type ?? "complaint";
  if (data.delay) return [data.delay.type, data.delay.diagnostic_code].filter(Boolean).join(": ");
  if (data.delivery) return data.delivery.smtp_response ?? "";
  if (data.failure) return data.failure.message;
  if (data.suppression) {
    const scope = data.suppression.scope === "*" ? "all emails" : data.suppression.scope;
    return `on the suppression list (${scope}, ${data.suppression.reason})`;
  }
  if (data.click) return [data.click.url, data.click.user_agent].filter(Boolean).join(" · ");
  if (data.open) return data.open.user_agent ?? "";
  if (data.reschedule) {
    const { previous_scheduled_at, scheduled_at } = data.reschedule;
    return `${formatDateTime(previous_scheduled_at)} → ${formatDateTime(scheduled_at)}`;
  }
  return "";
}
