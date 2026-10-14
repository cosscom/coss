/**
 * Webhook wire types (hand-written mirrors of the API's `EmailWebhookEvent`,
 * `ReceivedEmailWebhookEvent` and `AccountWebhookEvent`).
 */
import type { EmailEventData, EmailEventType, EmailTag } from "./email.ts";
import type { ReceivedEmailVerdicts } from "./received-email.ts";
import type { ReputationCheck, ReputationStatus } from "./reputation.ts";

/** What a webhook says about the email; never its content, cc or bcc. */
export interface EmailWebhookEventData extends EmailEventData {
  email_id: string;
  from: string;
  to: string[];
  subject: string;
  tags: EmailTag[];
  category: string | null;
  /** `true` for emails sent with a sandbox (`coss_test_…`) key. */
  sandbox: boolean;
  /** The recipient this event is about; `null` for the whole email. */
  recipient: string | null;
  /** ISO 8601 timestamp of the event itself (deliveries can arrive later, and out of order). */
  occurred_at: string;
}

/** An email event. `id` equals the `webhook-id` header and `EmailEvent.id`. */
export interface EmailWebhookEvent {
  id: string;
  object: "event";
  type: EmailEventType;
  /** The API version this event is rendered in: the receiving endpoint's `api_version`. */
  api_version: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  data: EmailWebhookEventData;
}

/** Events about received (inbound) emails. */
export type ReceivedEmailEventType = "email.received";

/** What a webhook says about a received email; never its content, headers or cc. */
export interface ReceivedEmailWebhookEventData {
  /** Retrieve the email (bodies, headers, attachments) with `coss.email.received.get`. */
  received_email_id: string;
  /** The `From` header. */
  from: string | null;
  /** The `To` header's addresses. */
  to: string[];
  /** The envelope recipients this environment received it for. */
  recipients: string[];
  subject: string | null;
  message_id: string | null;
  attachment_count: number;
  size: number;
  /** Whether the spam verdict is `fail`. */
  spam: boolean;
  verdicts: ReceivedEmailVerdicts;
  sandbox: boolean;
  /** ISO 8601 timestamp. */
  received_at: string;
}

/** An email arrived. `id` equals the `webhook-id` header. */
export interface ReceivedEmailWebhookEvent {
  id: string;
  object: "event";
  type: ReceivedEmailEventType;
  /** The API version this event is rendered in: the receiving endpoint's `api_version`. */
  api_version: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  data: ReceivedEmailWebhookEventData;
}

/** Changes of the organization's reputation standing (sent to live environments only). */
export type AccountEventType =
  | "account.reputation_warning"
  | "account.reputation_recovered"
  | "account.suspended"
  | "account.reinstated";

export interface AccountWebhookEventData {
  organization_id: string;
  status: ReputationStatus;
  previous_status: ReputationStatus;
  /** The trigger behind a `warning` or `suspended` status, e.g. `complaint_rate`. */
  reason: string | null;
  /** ISO 8601 timestamp. */
  occurred_at: string;
  /** The measurements behind the change (see `coss.reputation.get()`). */
  checks: ReputationCheck[];
}

/** A reputation change. `id` equals the `webhook-id` header. */
export interface AccountWebhookEvent {
  id: string;
  object: "event";
  type: AccountEventType;
  /** The API version this event is rendered in: the receiving endpoint's `api_version`. */
  api_version: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  data: AccountWebhookEventData;
}

/** The JSON body of a webhook request; narrow on `type`. */
export type WebhookEvent = EmailWebhookEvent | ReceivedEmailWebhookEvent | AccountWebhookEvent;
