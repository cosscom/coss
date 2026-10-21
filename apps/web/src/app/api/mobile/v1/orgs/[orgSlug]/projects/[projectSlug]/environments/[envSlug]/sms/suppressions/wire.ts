import type { MobileSmsSuppression } from "@coss/companion";
import type { SmsSuppressionOutput } from "@coss/sms/schemas";

// The dashboard's SMS suppressions table (sms/suppressions/page.tsx): number, reason, added.
export function toMobileSmsSuppression(entry: SmsSuppressionOutput): MobileSmsSuppression {
  return {
    id: entry.id,
    phone_number: entry.phone_number,
    reason: entry.reason,
    created_at: entry.created_at,
  };
}
