/**
 * Webhook wire types (hand-written mirrors of the API's `EmailWebhookEvent`,
 * `AccountWebhookEvent` and `RiskWebhookEvent`).
 */
import type { EmailEventData, EmailEventType, EmailTag } from "./email.ts";
import type { ReputationCheck, ReputationStatus } from "./reputation.ts";
import type { RiskDecision, RiskEvent, RiskReason } from "./risk.ts";

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

/** Risk events: `review` decisions, for a queue you work through. */
export type RiskEventType = "risk.assessment.review";

export interface RiskWebhookEventData {
  assessment_id: string;
  event: RiskEvent;
  event_name: string | null;
  decision: RiskDecision;
  score: number;
  reasons: RiskReason[];
  /** Your user id, if the assessment had one. Never the email or IP address. */
  user_id: string | null;
  /** ISO 8601 timestamp. */
  occurred_at: string;
}

/** A risk assessment that needs a review. `id` equals the `webhook-id` header. */
export interface RiskWebhookEvent {
  id: string;
  object: "event";
  type: RiskEventType;
  /** The API version this event is rendered in: the receiving endpoint's `api_version`. */
  api_version: string;
  /** ISO 8601 timestamp. */
  created_at: string;
  data: RiskWebhookEventData;
}

/** The JSON body of a webhook request; narrow on `type`. */
export type WebhookEvent = EmailWebhookEvent | AccountWebhookEvent | RiskWebhookEvent;
