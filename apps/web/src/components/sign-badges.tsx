import type { SignRequestStatus, SignSignerStatus } from "@coss/sign/schemas";
import { StatusDot, type StatusTone } from "./status-dot";

const REQUEST_TONE = {
  draft: "neutral",
  sent: "info",
  completed: "success",
  declined: "error",
  canceled: "neutral",
  expired: "warning",
} as const satisfies Record<SignRequestStatus, StatusTone>;

const REQUEST_LABEL = {
  draft: "Draft",
  sent: "Waiting for signatures",
  completed: "Completed",
  declined: "Declined",
  canceled: "Canceled",
  expired: "Expired",
} as const satisfies Record<SignRequestStatus, string>;

export function SignRequestStatusDot({ status }: { status: SignRequestStatus }) {
  return (
    <StatusDot pulse={status === "sent"} tone={REQUEST_TONE[status]}>
      {REQUEST_LABEL[status]}
    </StatusDot>
  );
}

const SIGNER_TONE = {
  pending: "neutral",
  notified: "info",
  viewed: "info",
  signed: "success",
  declined: "error",
} as const satisfies Record<SignSignerStatus, StatusTone>;

const SIGNER_LABEL = {
  pending: "Not sent yet",
  notified: "Emailed",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
} as const satisfies Record<SignSignerStatus, string>;

export function SignSignerStatusDot({ status }: { status: SignSignerStatus }) {
  return <StatusDot tone={SIGNER_TONE[status]}>{SIGNER_LABEL[status]}</StatusDot>;
}
