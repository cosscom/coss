/**
 * Email wire types. Hand-written to mirror the API's snake_case JSON 1:1 (the API's contract test
 * asserts they stay assignable to and from its zod schemas).
 */

/** A `name`/`value` pair attached to an email for your own filtering and analytics. */
export interface EmailTag {
  name: string;
  value: string;
}

/** Whether the email was handed to the delivery provider. Delivery is tracked per recipient. */
export type EmailStatus = "queued" | "sent" | "failed";

/**
 * Delivery status of one recipient. It only moves forward: `queued` → `sent` →
 * `delivery_delayed` → `delivered`, then `bounced` / `suppressed` / `failed`, then `complained`.
 * `suppressed` means the address is on the suppression list after an earlier bounce or complaint.
 */
export type EmailRecipientStatus =
  | "queued"
  | "sent"
  | "delivery_delayed"
  | "delivered"
  | "bounced"
  | "suppressed"
  | "complained"
  | "failed";

/** One distinct recipient address of an email. */
export interface EmailRecipient {
  /** The bare, lower-cased address. */
  address: string;
  type: "to" | "cc" | "bcc";
  status: EmailRecipientStatus;
  /** ISO 8601 timestamp of the latest event for this recipient, or `null`. */
  last_event_at: string | null;
}

export type EmailEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.failed";

/** Details of an event; which member is present depends on the event type. */
export interface EmailEventData {
  bounce?: {
    type: "permanent" | "transient" | "undetermined";
    sub_type: string;
    diagnostic_code: string | null;
  };
  complaint?: { feedback_type: string | null; sub_type: string | null };
  delay?: { type: string; expires_at: string | null; diagnostic_code: string | null };
  delivery?: { smtp_response: string | null };
  failure?: { code: string; message: string };
}

/** A delivery event of an email. */
export interface EmailEvent {
  object: "email_event";
  id: string;
  email_id: string;
  type: EmailEventType;
  /** The recipient this event is about; `null` for the whole email (`email.sent`, `email.failed`). */
  recipient: string | null;
  /** ISO 8601 timestamp. */
  occurred_at: string;
  data: EmailEventData;
}

/** A list response. */
export interface List<T> {
  object: "list";
  data: T[];
  has_more: boolean;
}

/** Body of `POST /v1/emails`. */
export interface SendEmailParams {
  /** `"you@example.com"` or `"Your Name <you@example.com>"`. */
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  subject: string;
  /** At least one of `html` or `text` is required. */
  html?: string;
  text?: string;
  /** Custom headers. Names are case-insensitive; reserved names such as `subject` are rejected. */
  headers?: Record<string, string>;
  tags?: EmailTag[];
}

/** An email as returned by the API. Recipient fields are always arrays. */
export interface Email {
  object: "email";
  id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  reply_to: string[];
  subject: string;
  html: string | null;
  text: string | null;
  /** Header names are lower-cased. */
  headers: Record<string, string>;
  tags: EmailTag[];
  status: EmailStatus;
  /** Every distinct recipient across `to`, `cc` and `bcc`, with its delivery status. */
  recipients: EmailRecipient[];
  /** `true` when sent with a sandbox (`coss_test_…`) key: nothing is actually delivered. */
  sandbox: boolean;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp, or `null` until the provider accepts the message. */
  sent_at: string | null;
}
