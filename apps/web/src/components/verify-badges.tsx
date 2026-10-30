import type { VerificationStatus } from "@coss/verify/schemas";
import { StatusDot, type StatusTone } from "./status-dot";

const STATUS_TONE = {
  pending: "info",
  approved: "success",
  expired: "neutral",
  canceled: "neutral",
  failed: "error",
  blocked: "warning",
} as const satisfies Record<VerificationStatus, StatusTone>;

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  expired: "Expired",
  canceled: "Canceled",
  failed: "Failed",
  blocked: "Blocked",
} as const satisfies Record<VerificationStatus, string>;

/** A verification's status as a dot and label, for dense lists. */
export function VerificationStatusDot({ status }: { status: VerificationStatus }) {
  return (
    <StatusDot pulse={status === "pending"} tone={STATUS_TONE[status]}>
      {STATUS_LABEL[status]}
    </StatusDot>
  );
}

export const SEND_ROUTE_LABEL = {
  own_number: "Your number",
  shared_number: "coss.com's shared number",
  email: "Your sender",
  coss_email: "coss.com's sender",
} as const;
