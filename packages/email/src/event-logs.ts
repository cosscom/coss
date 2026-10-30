import type { EmailEventDetails } from "@coss/db/schema";
import type { LogEntryInput } from "@coss/logs";
import type { LogLevel } from "@coss/logs/schemas";
import type { EmailEventType } from "./schemas.ts";

const LEVEL: Record<EmailEventType, LogLevel> = {
  "email.sent": "info",
  "email.delivered": "info",
  "email.delivery_delayed": "warning",
  "email.bounced": "error",
  "email.complained": "error",
  "email.failed": "error",
  "email.suppressed": "warning",
  "email.scheduled": "info",
  "email.rescheduled": "info",
  "email.canceled": "info",
  "email.opened": "info",
  "email.clicked": "info",
  "email.unsubscribed": "info",
};

function describe(type: EmailEventType, recipient: string | null, details: EmailEventDetails) {
  const to = recipient ? ` ${recipient}` : "";
  switch (type) {
    case "email.sent":
      return "Sent to the provider";
    case "email.delivered":
      return `Delivered to${to || " every recipient"}`;
    case "email.delivery_delayed":
      return `Delivery delayed${to ? ` for${to}` : ""}${details.delay ? ` (${details.delay.type})` : ""}`;
    case "email.bounced": {
      const bounce = details.bounce ? ` (${details.bounce.type}, ${details.bounce.sub_type})` : "";
      return `Bounced${to ? `:${to}` : ""}${bounce}`;
    }
    case "email.complained":
      return `Complaint${to ? ` from${to}` : ""}`;
    case "email.failed":
      return `Failed${details.failure ? `: ${details.failure.message}` : ""}`;
    case "email.suppressed":
      return `Suppressed${to}${details.suppression ? ` (${details.suppression.reason})` : ""}`;
    case "email.scheduled":
      return "Scheduled";
    case "email.rescheduled":
      return "Rescheduled";
    case "email.canceled":
      return "Canceled";
    case "email.opened":
      return `Opened${to ? ` by${to}` : ""}`;
    case "email.clicked":
      return `Clicked ${details.click?.url ?? "a link"}${to ? ` (${recipient})` : ""}`;
    case "email.unsubscribed":
      return `Unsubscribed${to ? `:${to}` : ""}`;
  }
}

/** The log lines (`source: email`) for events `recordProviderEvent` just inserted. */
export function emailEventLogEntries(
  target: {
    id: string;
    organizationId: string;
    projectId: string;
    environmentId: string;
    from: string;
    subject: string;
    category: string | null;
    subaccountId?: string | null;
    traceparent?: string | null;
  },
  provider: { provider: string; providerEventType: string },
  rows: readonly {
    id: string;
    type: EmailEventType;
    recipient: string | null;
    occurredAt: Date;
    details: EmailEventDetails;
  }[],
): LogEntryInput[] {
  return rows.map((row) => ({
    organizationId: target.organizationId,
    projectId: target.projectId,
    environmentId: target.environmentId,
    occurredAt: row.occurredAt,
    source: "email",
    level: LEVEL[row.type],
    type: row.type,
    message: describe(row.type, row.recipient, row.details),
    errorCode: row.details.failure?.code ?? null,
    resourceType: "email",
    resourceId: target.id,
    recipient: row.recipient,
    userAgent: row.details.open?.user_agent ?? row.details.click?.user_agent ?? null,
    attributes: {
      event_id: row.id,
      provider: provider.provider,
      provider_event_type: provider.providerEventType,
      from: target.from,
      subject: target.subject,
      ...(target.category ? { category: target.category } : {}),
      ...(target.subaccountId ? { subaccount_id: target.subaccountId } : {}),
      ...(target.traceparent ? { traceparent: target.traceparent } : {}),
      ...row.details,
    },
  }));
}
