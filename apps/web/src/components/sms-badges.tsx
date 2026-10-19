import type { SmsEventType, SmsStatus, SmsSuppressionReason } from "@coss/sms/schemas";
import { Badge } from "@coss/ui/components/badge";
import { StatusDot, type StatusTone } from "./status-dot";

const STATUS_TONE = {
  queued: "neutral",
  scheduled: "info",
  sent: "info",
  delivered: "success",
  undelivered: "error",
  failed: "error",
  canceled: "neutral",
} as const satisfies Record<SmsStatus, StatusTone>;

const STATUS_LABEL = {
  queued: "Queued",
  scheduled: "Scheduled",
  sent: "Sent",
  delivered: "Delivered",
  undelivered: "Undelivered",
  failed: "Failed",
  canceled: "Canceled",
} as const satisfies Record<SmsStatus, string>;

/** A message's status as a dot and label, for dense lists. */
export function SmsStatusDot({ status }: { status: SmsStatus }) {
  return (
    <StatusDot pulse={status === "queued" || status === "sent"} tone={STATUS_TONE[status]}>
      {STATUS_LABEL[status]}
    </StatusDot>
  );
}

const EVENT_VARIANT = {
  "sms.scheduled": "info",
  "sms.sent": "info",
  "sms.delivered": "success",
  "sms.undelivered": "error",
  "sms.failed": "error",
  "sms.suppressed": "warning",
  "sms.canceled": "outline",
} as const satisfies Record<SmsEventType, string>;

export function SmsEventBadge({ type }: { type: SmsEventType }) {
  return <Badge variant={EVENT_VARIANT[type]}>{type.replace(/^sms\./, "")}</Badge>;
}

const REASON_LABEL = {
  opt_out: "Opted out",
  invalid_number: "Invalid number",
  manual: "Added by you",
} as const satisfies Record<SmsSuppressionReason, string>;

export function SmsSuppressionReasonBadge({ reason }: { reason: SmsSuppressionReason }) {
  return (
    <Badge variant={reason === "manual" ? "outline" : "secondary"}>{REASON_LABEL[reason]}</Badge>
  );
}

type RegistrationStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected" | "failed";

const REGISTRATION_TONE = {
  draft: "neutral",
  submitted: "info",
  in_review: "info",
  approved: "success",
  rejected: "error",
  failed: "error",
} as const satisfies Record<RegistrationStatus, StatusTone>;

const REGISTRATION_LABEL = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
} as const satisfies Record<RegistrationStatus, string>;

export function RegistrationStatusDot({ status }: { status: RegistrationStatus | null }) {
  if (!status) return <StatusDot tone="warning">Not registered</StatusDot>;
  return (
    <StatusDot
      pulse={status === "submitted" || status === "in_review"}
      tone={REGISTRATION_TONE[status]}
    >
      {REGISTRATION_LABEL[status]}
    </StatusDot>
  );
}
