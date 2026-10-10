/** Webhook wire types (hand-written mirrors of the API's `EmailWebhookEvent`). */
import type { EmailEventData, EmailEventType, EmailTag } from "./email.ts";

/** What a webhook says about the email; never its content, cc or bcc. */
export interface EmailWebhookEventData extends EmailEventData {
  email_id: string;
  from: string;
  to: string[];
  subject: string;
  tags: EmailTag[];
  /** `true` for emails sent with a sandbox (`coss_test_…`) key. */
  sandbox: boolean;
  /** The recipient this event is about; `null` for the whole email. */
  recipient: string | null;
  /** ISO 8601 timestamp of the event itself (deliveries can arrive later, and out of order). */
  occurred_at: string;
}

/** The JSON body of a webhook request. `id` equals the `webhook-id` header and `EmailEvent.id`. */
export interface WebhookEvent {
  id: string;
  object: "event";
  type: EmailEventType;
  /** ISO 8601 timestamp. */
  created_at: string;
  data: EmailWebhookEventData;
}
