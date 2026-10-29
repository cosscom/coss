/** Verify wire types (hand-written mirrors of the API's schemas). */
import type { EmailTag as Tag } from "./email.ts";

export type VerifyChannel = "sms" | "email";

/**
 * `pending` until the right code is checked (`approved`) or it ends: `expired`, `canceled`,
 * `failed` (too many wrong codes, or the code couldn't be sent) or `blocked` (the fraud guard
 * stopped it before anything was sent).
 */
export type VerificationStatus =
  | "pending"
  | "approved"
  | "expired"
  | "canceled"
  | "failed"
  | "blocked";

/**
 * `own_number`: one of your numbers; `shared_number`: coss.com's; `email`: your sender;
 * `coss_email`: coss.com's sender.
 */
export type VerifySendRoute = "own_number" | "shared_number" | "email" | "coss_email";

export interface StartVerificationParams {
  /**
   * Where the code goes: a mobile number in E.164 form, or an email address. A pending
   * verification to the same destination and channel is reused: a new code is sent.
   */
  to: string;
  /** Default: `sms` for a phone number, `email` for an address. */
  channel?: VerifyChannel;
  /** The end user's IP address, for the fraud guard (recommended). */
  ip?: string;
  /** Your id for the end user, for the fraud guard and your Risk lists. */
  user_id?: string;
  tags?: Tag[];
}

export type CheckVerificationParams =
  | { verification_id: string; to?: never; code: string }
  | { to: string; verification_id?: never; code: string };

export interface VerificationSend {
  channel: VerifyChannel;
  route: VerifySendRoute;
  /** The SMS in your environment: `own_number`, or any in a sandbox (`null` for coss.com's). */
  sms_id: string | null;
  /** The email (`email` route only). */
  email_id: string | null;
  created_at: string;
}

/** A fraud guard reason (`value`: the count or percentage that tripped it). */
export interface VerificationReason {
  code: string;
  value?: number;
}

export interface Verification {
  object: "verification";
  id: string;
  channel: VerifyChannel;
  to: string;
  /** ISO 3166 country of a phone number. */
  country: string | null;
  status: VerificationStatus;
  /** Why it `failed`. */
  failure: { code: string; message: string } | null;
  /** Why it was `blocked` (empty otherwise). */
  reasons: VerificationReason[];
  /** Wrong codes checked so far. */
  attempts: number;
  max_attempts: number;
  sends: VerificationSend[];
  tags: Tag[];
  /** Made in a sandbox environment: simulated, and the code is always zeros. */
  sandbox: boolean;
  expires_at: string;
  approved_at: string | null;
  created_at: string;
}

export interface VerificationCheck {
  object: "verification_check";
  /** Whether the code is right: only `true` proves the end user has the phone or mailbox. */
  valid: boolean;
  verification: Verification;
}

export interface ListVerificationsParams {
  to?: string;
  status?: VerificationStatus;
  /** 1-100, default 20. */
  limit?: number;
  /** Cursor: the `id` of the last item of the previous page. */
  after?: string;
}

export type VerifyWebhookEventType =
  | "verification.approved"
  | "verification.failed"
  | "verification.blocked";

export interface VerificationWebhookEventData {
  verification_id: string;
  channel: VerifyChannel;
  to: string;
  status: VerificationStatus;
  failure: { code: string; message: string } | null;
  reasons: VerificationReason[];
  tags: Tag[];
  sandbox: boolean;
  occurred_at: string;
}

/** A `verification.*` webhook. */
export interface VerificationWebhookEvent {
  id: string;
  object: "event";
  type: VerifyWebhookEventType;
  api_version: string;
  created_at: string;
  data: VerificationWebhookEventData;
}
