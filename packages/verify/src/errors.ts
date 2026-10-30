export type VerifyErrorCode =
  | "idempotency_key_reused"
  | "request_in_progress"
  | "not_found"
  | "invalid_destination"
  | "country_not_allowed"
  | "verification_blocked"
  | "too_many_sends"
  | "recipient_suppressed"
  | "send_failed"
  | "shared_sender_unavailable"
  | "quota_exceeded"
  | "account_suspended"
  | "billing_hold"
  | "budget_exceeded"
  | "verification_not_cancelable"
  | "invalid_settings";

const STATUS_BY_CODE = {
  idempotency_key_reused: 422,
  request_in_progress: 409,
  not_found: 404,
  // An email address that can't receive mail, or a number that isn't one.
  invalid_destination: 422,
  // Not in the environment's allowed countries (or a high-risk one, for coss.com's numbers).
  country_not_allowed: 422,
  // The fraud guard stopped it (`reasons` on the stored verification).
  verification_blocked: 422,
  // The code was already sent `MAX_SENDS` times.
  too_many_sends: 422,
  // The number opted out (STOP) or the address is on the suppression list.
  recipient_suppressed: 422,
  send_failed: 422,
  // coss.com's shared numbers aren't configured (`VERIFY_SMS_*`).
  shared_sender_unavailable: 503,
  quota_exceeded: 429,
  // The organization's billing hold or a budget of the project, key or member: live sends stop.
  // Suspended for its sending reputation: no live codes, whichever sender would send them.
  account_suspended: 403,
  billing_hold: 402,
  budget_exceeded: 402,
  verification_not_cancelable: 422,
  invalid_settings: 422,
} as const satisfies Record<VerifyErrorCode, number>;

/** What a rate limit refusal tells (for `RateLimit-*` and `Retry-After` headers). */
export type VerifyQuotaDecision = {
  bucket: string;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterMs: number | null;
};

/** Expected failures of Verify; `status` is the HTTP status the API should use. */
export class VerifyError extends Error {
  readonly code: VerifyErrorCode;
  readonly param: string | undefined;
  /** `verification_blocked`, `too_many_sends`…: the verification it concerns. */
  readonly verificationId: string | undefined;
  /** `quota_exceeded`: the refusing bucket. */
  readonly decision: VerifyQuotaDecision | undefined;

  constructor(
    code: VerifyErrorCode,
    message: string,
    opts?: { param?: string; verificationId?: string; decision?: VerifyQuotaDecision },
  ) {
    super(message);
    this.name = "VerifyError";
    this.code = code;
    this.param = opts?.param;
    this.verificationId = opts?.verificationId;
    this.decision = opts?.decision;
  }

  get status(): (typeof STATUS_BY_CODE)[VerifyErrorCode] {
    return STATUS_BY_CODE[this.code];
  }
}
