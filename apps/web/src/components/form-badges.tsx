import type { FormSpamReason, FormSubmissionStatus } from "@coss/forms/schemas";
import { StatusDot, type StatusTone } from "./status-dot";

const SUBMISSION_TONE = {
  accepted: "success",
  held: "warning",
  spam: "error",
  pending_confirmation: "info",
} as const satisfies Record<FormSubmissionStatus, StatusTone>;

const SUBMISSION_LABEL = {
  accepted: "Received",
  held: "Held for review",
  spam: "Spam",
  pending_confirmation: "Waiting for confirmation",
} as const satisfies Record<FormSubmissionStatus, string>;

export function FormSubmissionStatusDot({ status }: { status: FormSubmissionStatus }) {
  return <StatusDot tone={SUBMISSION_TONE[status]}>{SUBMISSION_LABEL[status]}</StatusDot>;
}

export const SPAM_REASON_LABEL = {
  honeypot: "Filled the honeypot field",
  risk_block: "Blocked by Risk",
  risk_review: "Risk asked for a review",
  content: "The text looked like spam",
} as const satisfies Record<FormSpamReason, string>;
