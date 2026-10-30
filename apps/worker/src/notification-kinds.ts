import type { NotificationKinds } from "@coss/notifications";
import { SMS_NOTIFICATION_KINDS } from "@coss/sms";

/** Every product's notification kinds (`@coss/notifications`): what the `notifications` loop sends. */
export const NOTIFICATION_KINDS: NotificationKinds = {
  ...SMS_NOTIFICATION_KINDS,
};
