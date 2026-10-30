import type { SmsEventDetails } from "@coss/db/schema";
import type { LogEntryInput } from "@coss/logs";
import type { LogLevel } from "@coss/logs/schemas";
import type { SmsEventType } from "./schemas.ts";

const LEVEL: Record<SmsEventType, LogLevel> = {
  "sms.scheduled": "info",
  "sms.sent": "info",
  "sms.delivered": "info",
  "sms.undelivered": "error",
  "sms.failed": "error",
  "sms.suppressed": "warning",
  "sms.canceled": "info",
};

function describe(type: SmsEventType, to: string, details: SmsEventDetails): string {
  const why = details.failure ? `: ${details.failure.message}` : "";
  switch (type) {
    case "sms.scheduled":
      return "Scheduled";
    case "sms.sent":
      return `Handed to the carrier for ${to}`;
    case "sms.delivered":
      return `Delivered to ${to}`;
    case "sms.undelivered":
      return `Not delivered to ${to}${why}`;
    case "sms.failed":
      return `Failed${why}`;
    case "sms.suppressed":
      return `Suppressed ${to}${details.suppression ? ` (${details.suppression.reason})` : ""}`;
    case "sms.canceled":
      return "Canceled";
  }
}

/** The log lines (`source: sms`) for events `recordSmsEvent` just inserted. */
export function smsEventLogEntries(
  target: {
    id: string;
    organizationId: string;
    projectId: string;
    environmentId: string;
    from: string;
    to: string;
    toCountry: string;
    segments: number;
    traceparent?: string | null;
  },
  provider: { provider: string; providerStatus: string },
  rows: readonly { id: string; type: SmsEventType; occurredAt: Date; details: SmsEventDetails }[],
): LogEntryInput[] {
  return rows.map((row) => ({
    organizationId: target.organizationId,
    projectId: target.projectId,
    environmentId: target.environmentId,
    occurredAt: row.occurredAt,
    source: "sms",
    level: LEVEL[row.type],
    type: row.type,
    message: describe(row.type, target.to, row.details),
    errorCode: row.details.failure?.code ?? null,
    resourceType: "sms",
    resourceId: target.id,
    recipient: target.to,
    attributes: {
      event_id: row.id,
      provider: provider.provider,
      provider_status: provider.providerStatus,
      from: target.from,
      country: target.toCountry,
      segments: target.segments,
      ...(target.traceparent ? { traceparent: target.traceparent } : {}),
      ...row.details,
    },
  }));
}
