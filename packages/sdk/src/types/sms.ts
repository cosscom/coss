/**
 * SMS wire types. Hand-written to mirror the API's snake_case JSON 1:1 (the API's contract test
 * asserts they stay assignable to and from its zod schemas).
 */

/**
 * `queued` until handed to the provider, `sent` once it has it (and has handed it to the carrier
 * when `sms.sent` arrives), then `delivered` or `undelivered` as the carrier reports. `failed`:
 * never sent. `scheduled` and `canceled`: scheduled sends.
 */
export type SmsStatus =
  | "queued"
  | "scheduled"
  | "sent"
  | "delivered"
  | "undelivered"
  | "failed"
  | "canceled";

export type SmsEventType =
  | "sms.scheduled"
  | "sms.sent"
  | "sms.delivered"
  | "sms.undelivered"
  | "sms.failed"
  | "sms.suppressed"
  | "sms.canceled";

export type ReceivedSmsEventType = "sms.received" | "sms.opted_out" | "sms.opted_in";

/**
 * `gsm7`: 160 characters in one segment, 153 per segment; `ucs2` (any Unicode): 70 and 67 (152 and
 * 66 from a toll-free number).
 */
export type SmsEncoding = "gsm7" | "ucs2";

/**
 * `opt_out`: the number replied STOP (or the carrier says it opted out). `invalid_number`: it
 * can't receive SMS. `manual`: added by you.
 */
export type SmsSuppressionReason = "opt_out" | "manual" | "invalid_number";

/** `stop` (an opt-out), `start` (an opt-in again) or `help`, when a received message is one. */
export type SmsKeyword = "stop" | "start" | "help";

export interface SmsTag {
  name: string;
  value: string;
}

/** Body of `POST /v1/sms`. */
export interface SendSmsParams {
  /** One of your organization's numbers (E.164). Sandbox environments accept any. */
  from: string;
  /** The recipient's mobile number (E.164). */
  to: string;
  /** At most 10 segments (1,520 GSM-7 or 660 Unicode characters). */
  body: string;
  /** Up to 10 tags. */
  tags?: SmsTag[];
  /** Send at this time instead of now (ISO 8601 with an offset, at most 30 days ahead). */
  scheduled_at?: string;
}

/** Why a message failed or wasn't delivered. */
export interface SmsFailure {
  code: string;
  message: string;
}

export interface Sms {
  object: "sms";
  id: string;
  from: string;
  to: string;
  body: string;
  status: SmsStatus;
  /** Segments the body takes (what is billed). */
  segments: number;
  encoding: SmsEncoding;
  /** ISO 3166 country of `to`. */
  country: string;
  tags: SmsTag[];
  failure: SmsFailure | null;
  /** Sent from a sandbox environment: simulated. */
  sandbox: boolean;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

/** Query of `GET /v1/sms`. */
export interface ListSmsParams {
  to?: string;
  /** One status or several (sent comma-separated). */
  status?: SmsStatus | SmsStatus[];
  created_after?: string;
  created_before?: string;
  /** 1-100, default 20. */
  limit?: number;
  /** The `id` of the last message of the previous page. */
  after?: string;
}

export interface SmsEventData {
  failure?: SmsFailure;
  /** The provider's or carrier's own error code, e.g. `30007`. */
  provider_error_code?: string | null;
  /** `sms.suppressed`: the entry that made coss.com skip the number. */
  suppression?: { id: string; reason: SmsSuppressionReason };
}

export interface SmsEvent {
  object: "sms_event";
  id: string;
  sms_id: string;
  type: SmsEventType;
  occurred_at: string;
  data: SmsEventData;
}

/** A message received on one of your numbers. */
export interface ReceivedSms {
  object: "received_sms";
  id: string;
  /** Who sent it. */
  from: string;
  /** Your number that received it. */
  to: string;
  body: string;
  segments: number;
  keyword: SmsKeyword | null;
  sandbox: boolean;
  created_at: string;
}

/** Query of `GET /v1/sms/received`. */
export interface ListReceivedSmsParams {
  from?: string;
  to?: string;
  created_after?: string;
  created_before?: string;
  limit?: number;
  after?: string;
}

/** An entry of the API key's environment's SMS suppression list. */
export interface SmsSuppression {
  object: "sms_suppression";
  id: string;
  phone_number: string;
  reason: SmsSuppressionReason;
  /** The message whose failure added it, if any. */
  sms_id: string | null;
  created_at: string;
}

/** Query of `GET /v1/sms/suppressions`. */
export interface ListSmsSuppressionsParams {
  phone_number?: string;
  limit?: number;
  after?: string;
}

/** Whether a send to a number would be skipped. */
export interface SmsSuppressionCheck {
  object: "sms_suppression_check";
  phone_number: string;
  suppressed: boolean;
  suppression: SmsSuppression | null;
}

export interface DeletedSmsSuppression {
  object: "sms_suppression";
  id: string;
  deleted: true;
}

/** One of your organization's phone numbers (managed in the dashboard). */
export interface SmsNumber {
  object: "sms_number";
  id: string;
  phone_number: string;
  kind: "local" | "toll_free";
  country: string;
  status: "pending" | "active" | "releasing";
  /** Its carrier registration's status; live sends need `approved`. */
  registration_status:
    | "draft"
    | "submitted"
    | "in_review"
    | "approved"
    | "rejected"
    | "failed"
    | null;
  /** Whether live sends can go from it now. */
  can_send: boolean;
  /** Whether replies to it arrive in this key's environment. */
  receives_here: boolean;
  created_at: string;
}
