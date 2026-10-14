/**
 * Webhook wire types (hand-written mirrors of the API's `EmailWebhookEvent`,
 * `AccountWebhookEvent`, `BillingWebhookEvent` and `RiskWebhookEvent`).
 */
import type { BillingHoldReason, Credit, InvoiceSummary, Meter, PlanKey } from "./billing.ts";
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

/** Billing events (organization-wide; sent to live environments only). */
export type BillingEventType =
  | "billing.invoice_finalized"
  | "billing.invoice_paid"
  | "billing.invoice_payment_failed"
  | "billing.invoice_voided"
  | "billing.plan_changed"
  | "billing.usage_threshold_reached"
  | "billing.hold_placed"
  | "billing.hold_lifted"
  | "billing.credit_granted";

interface BillingEventFields {
  /** Equals the `webhook-id` header. */
  id: string;
  object: "event";
  /** The API version this event is rendered in: the receiving endpoint's `api_version`. */
  api_version: string;
  /** ISO 8601 timestamp. */
  created_at: string;
}

/** Every billing event's `data` has these. */
interface BillingEventData {
  organization_id: string;
  /** When it happened (ISO 8601): sort events by it. */
  occurred_at: string;
}

/** A billing event; narrow on `type` for its `data`. */
export type BillingWebhookEvent =
  | (BillingEventFields & {
      type: "billing.invoice_finalized" | "billing.invoice_paid" | "billing.invoice_voided";
      data: BillingEventData & { invoice: InvoiceSummary };
    })
  | (BillingEventFields & {
      type: "billing.invoice_payment_failed";
      data: BillingEventData & { invoice: InvoiceSummary; failure: { message: string } };
    })
  | (BillingEventFields & {
      type: "billing.plan_changed";
      data: BillingEventData & {
        /**
         * `upgrade` (in effect now), `downgrade`/`cancellation` (scheduled), `reverted` (a
         * scheduled change was undone), `contract` (a contract changed).
         */
        change: "upgrade" | "downgrade" | "cancellation" | "reverted" | "contract";
        /** The plan from `effective_at`. */
        plan: PlanKey;
        previous_plan: PlanKey;
        effective_at: string;
      };
    })
  | (BillingEventFields & {
      type: "billing.usage_threshold_reached";
      data: BillingEventData & {
        /** The threshold crossed, e.g. 80. */
        percent: number;
        /** `credit`: the month's usage credit; `allowance`: a capped plan's included units. */
        of: "credit" | "allowance";
        meter: Meter | null;
        period: { start: string; end: string };
      };
    })
  | (BillingEventFields & {
      type: "billing.hold_placed" | "billing.hold_lifted";
      data: BillingEventData & { reason: BillingHoldReason };
    })
  | (BillingEventFields & {
      type: "billing.credit_granted";
      data: BillingEventData & { credit: Credit };
    });

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
export type WebhookEvent =
  | EmailWebhookEvent
  | AccountWebhookEvent
  | BillingWebhookEvent
  | RiskWebhookEvent;
