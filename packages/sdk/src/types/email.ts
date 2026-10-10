/**
 * Email wire types. Hand-written to mirror the API's snake_case JSON 1:1 (the API's contract test
 * asserts they stay assignable to and from its zod schemas).
 */

/** A `name`/`value` pair attached to an email for your own filtering and analytics. */
export interface EmailTag {
  name: string;
  value: string;
}

export type EmailStatus = "queued" | "sent" | "failed";

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
  /** `true` when sent with a sandbox (`coss_test_…`) key: nothing is actually delivered. */
  sandbox: boolean;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp, or `null` until the provider accepts the message. */
  sent_at: string | null;
}
