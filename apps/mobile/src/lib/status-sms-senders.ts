import type {
  DedicatedIpPoolStatus,
  SmsNumberSending,
  SmsRegistrationKind,
  SmsSuppressionReason,
} from "@coss/companion";
import type { Tone } from "./theme";

// apps/web/src/components/sms-badges.tsx (RegistrationStatusDot) and the numbers table's
// "Sending" column (apps/web/src/app/[orgSlug]/sms/page.tsx).
export const SMS_NUMBER_SENDING: Record<SmsNumberSending, [Tone, string]> = {
  can_send: ["success", "Can send"],
  setting_up: ["warning", "Setting up"],
  not_registered: ["warning", "Not registered"],
  draft: ["neutral", "Draft"],
  submitted: ["info", "Submitted"],
  in_review: ["info", "In review"],
  approved: ["success", "Approved"],
  rejected: ["error", "Rejected"],
  failed: ["error", "Failed"],
};

// apps/web/src/app/[orgSlug]/sms/page.tsx (KIND_LABEL).
export const SMS_REGISTRATION_KIND: Record<SmsRegistrationKind, string> = {
  us_10dlc: "US A2P 10DLC",
  toll_free: "Toll-free verification",
};

// apps/web/src/components/sms-badges.tsx (SmsSuppressionReasonBadge).
export const SMS_SUPPRESSION_REASON: Record<
  SmsSuppressionReason,
  { label: string; variant: "outline" | "secondary" }
> = {
  opt_out: { label: "Opted out", variant: "secondary" },
  invalid_number: { label: "Invalid number", variant: "secondary" },
  manual: { label: "Added by you", variant: "outline" },
};

// apps/web/src/app/[orgSlug]/dedicated-ips/page.tsx (STATUS).
export const DEDICATED_IP_STATUS: Partial<
  Record<DedicatedIpPoolStatus, { tone: Tone; label: string; detail: string }>
> = {
  waiting: {
    tone: "warning",
    label: "Waiting",
    detail: "Every dedicated IP pool is taken right now. COSS support has been told.",
  },
  provisioning: {
    tone: "info",
    label: "Setting up",
    detail: "Your pool is being created. Live emails keep going out from shared IPs meanwhile.",
  },
  warming: {
    tone: "info",
    label: "Warming up",
    detail:
      "Live emails go through your pool. Its IPs are warmed up per mailbox provider: what they can't take yet leaves from shared IPs, so nothing is held back.",
  },
  ready: {
    tone: "success",
    label: "Ready",
    detail: "Your live emails leave from your dedicated IPs.",
  },
  releasing: {
    tone: "neutral",
    label: "Ending",
    detail:
      "The add-on ended: live emails are back on shared IPs, and the pool is released a day later.",
  },
};
