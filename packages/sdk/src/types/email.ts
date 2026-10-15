/**
 * Email wire types. Hand-written to mirror the API's snake_case JSON 1:1 (the API's contract test
 * asserts they stay assignable to and from its zod schemas).
 */
import type { EmailTemplateReference } from "./email-template.ts";
import type { SuppressionReason } from "./suppression.ts";

/** A `name`/`value` pair attached to an email for your own filtering and analytics. */
export interface EmailTag {
  name: string;
  value: string;
}

/**
 * A file to attach (at most 20 per email, 25 MB combined). Executables and other file types the
 * delivery provider refuses (such as `.exe` or `.js`) are rejected.
 */
export interface EmailAttachmentParams {
  /** The name recipients see. Must include an extension, e.g. `"invoice.pdf"`. */
  filename: string;
  /** The file's bytes, base64-encoded (no line breaks or `data:` prefix). */
  content: string;
  /** Media type such as `"application/pdf"`. Defaults from the filename's extension. */
  content_type?: string;
  /**
   * Makes the attachment inline: reference it from `html` as `<img src="cid:logo@acme">`
   * (without angle brackets here).
   */
  content_id?: string;
}

/** Metadata of a sent attachment. The content itself is never returned. */
export interface EmailAttachment {
  id: string;
  filename: string;
  content_type: string;
  /** Set for inline attachments. */
  content_id: string | null;
  /** Size in bytes. */
  size: number;
}

/**
 * Whether the email was handed to the delivery provider. `scheduled` emails wait for their
 * `scheduled_at`; `canceled` ones were canceled before that. Delivery is tracked per recipient.
 */
export type EmailStatus = "queued" | "sent" | "failed" | "scheduled" | "canceled";

/**
 * Delivery status of one recipient. It only moves forward: `queued` → `sent` →
 * `delivery_delayed` → `delivered`, then `bounced` / `suppressed` / `failed`, then `complained`.
 * `suppressed` means the address is on the environment's suppression list (for every email or for
 * the email's `category`), so it was skipped. `canceled` means the scheduled email was canceled.
 */
export type EmailRecipientStatus =
  | "queued"
  | "sent"
  | "delivery_delayed"
  | "delivered"
  | "bounced"
  | "suppressed"
  | "complained"
  | "failed"
  | "canceled";

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
  | "email.failed"
  /** A recipient was skipped because of a suppression list entry. */
  | "email.suppressed"
  /** The email was scheduled for later (`scheduled_at`). */
  | "email.scheduled"
  /** The scheduled email was canceled before it was sent. */
  | "email.canceled"
  /** The tracking pixel was loaded (open tracking). Never changes a recipient's status. */
  | "email.opened"
  /** A tracked link was followed (click tracking). Never changes a recipient's status. */
  | "email.clicked"
  /** The scheduled email was moved to a new time. */
  | "email.rescheduled";

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
  /** Only for `email.suppressed`: the entry that matched the recipient. */
  suppression?: { id: string; scope: string; reason: SuppressionReason };
  /** Only for `email.opened`. */
  open?: { user_agent: string | null };
  /** Only for `email.clicked`: the original link and its index among the tracked links. */
  click?: { url: string; link_position: number; user_agent: string | null };
  /** Only for `email.rescheduled`: the new time and the one it replaced. */
  reschedule?: { scheduled_at: string; previous_scheduled_at: string };
}

/** A delivery event of an email. */
export interface EmailEvent {
  object: "email_event";
  id: string;
  email_id: string;
  type: EmailEventType;
  /**
   * The recipient this event is about; `null` for the whole email (`email.sent`, `email.failed`),
   * and for opens and clicks of an email with several recipients.
   */
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

/**
 * Overrides the environment's tracking settings for one email. Omitted fields keep the configured
 * setting (the email's category rule, else the environment default, else off).
 */
export interface TrackingOptions {
  /** Add an invisible pixel to the HTML body and record `email.opened` events. */
  opens?: boolean;
  /**
   * Send HTML links through a COSS redirect and record `email.clicked` events. Links with a
   * `data-coss-no-track` attribute are left alone.
   */
  clicks?: boolean;
}

/** What every send has, with or without a template. */
export interface SendEmailBaseParams {
  /** `"you@example.com"` or `"Your Name <you@example.com>"`. */
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  /** Custom headers. Names are case-insensitive; reserved names such as `subject` are rejected. */
  headers?: Record<string, string>;
  tags?: EmailTag[];
  /**
   * What kind of email this is, e.g. `"marketing"`. Recipients suppressed for this category (or
   * for every email) are skipped.
   */
  category?: string;
  /**
   * Send at this time instead of now: an ISO 8601 date-time with an offset, e.g.
   * `"2026-10-11T09:00:00Z"`, at most 30 days ahead. A time that is not in the future sends
   * immediately. Until it is sent, move it with `coss.email.reschedule(id, …)` or cancel it with
   * `coss.email.cancel(id)`.
   */
  scheduled_at?: string;
  attachments?: EmailAttachmentParams[];
  tracking?: TrackingOptions;
}

/** A send with its own subject and body. */
export interface SendEmailContentParams extends SendEmailBaseParams {
  subject: string;
  /** At least one of `html` or `text` is required. */
  html?: string;
  text?: string;
  template_id?: never;
  template_version?: never;
  locale?: never;
  variables?: never;
}

/** A send of a published email template (`coss.email.templates`). */
export interface SendEmailTemplateParams extends SendEmailBaseParams {
  /** The template's id or alias. */
  template_id: string;
  /** A published version to send; defaults to the latest one. */
  template_version?: number;
  /**
   * The locale to send, e.g. `"pt-BR"`. Falls back to the language (`"pt"`), then to the
   * template's default locale.
   */
  locale?: string;
  /** Values for the template's variables, keyed by name. */
  variables?: Record<string, unknown>;
  subject?: never;
  html?: never;
  text?: never;
}

/** Body of `POST /v1/emails`: a subject and body, or a template. */
export type SendEmailParams = SendEmailContentParams | SendEmailTemplateParams;

/** Parameters of `coss.email.reschedule`. */
export interface RescheduleEmailParams {
  /**
   * The new time: an ISO 8601 date-time with an offset, at most 30 days ahead. A time that is not
   * in the future sends the email right away.
   */
  scheduled_at: string;
}

/**
 * Open and click tracking as resolved when the email was sent, with engagement so far. Opens can
 * be inflated by mail clients that prefetch images, clicks by link scanners.
 */
export interface EmailTracking {
  opens: boolean;
  clicks: boolean;
  open_count: number;
  /** ISO 8601 timestamps, or `null`. */
  first_opened_at: string | null;
  last_opened_at: string | null;
  click_count: number;
  first_clicked_at: string | null;
  last_clicked_at: string | null;
}

/** A link COSS rewrote for click tracking. */
export interface EmailLink {
  object: "email_link";
  id: string;
  email_id: string;
  /** Index of the link among the email's tracked links, in document order. */
  position: number;
  url: string;
  click_count: number;
  first_clicked_at: string | null;
  last_clicked_at: string | null;
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
  category: string | null;
  status: EmailStatus;
  /** Every distinct recipient across `to`, `cc` and `bcc`, with its delivery status. */
  recipients: EmailRecipient[];
  /** Attachment metadata; the content is discarded once the email is sent. */
  attachments: EmailAttachment[];
  /** `true` when sent with a sandbox (`coss_test_…`) key: nothing is actually delivered. */
  sandbox: boolean;
  tracking: EmailTracking;
  /** ISO 8601 timestamp. */
  created_at: string;
  /** ISO 8601 timestamp, or `null` until the provider accepts the message. */
  sent_at: string | null;
  /** ISO 8601 timestamp the email was scheduled for, or `null` if no schedule was provided. */
  scheduled_at: string | null;
  /** The batch that sent the email (`coss.email.sendBatch`), or `null` if it was sent alone. */
  batch_id: string | null;
  /** The template the email was rendered from, or `null` if it was sent without one. */
  template: EmailTemplateReference | null;
}

/** Emails sent together by `coss.email.sendBatch`. */
export interface EmailBatch {
  object: "email_batch";
  id: string;
  /** The batch's emails, in the order they were passed. */
  data: Email[];
  /** ISO 8601 timestamp. */
  created_at: string;
}
