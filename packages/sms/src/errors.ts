export type SmsErrorCode =
  | "idempotency_key_reused"
  | "request_in_progress"
  | "not_found"
  | "invalid_phone_number"
  | "sender_not_found"
  | "sender_not_ready"
  | "country_not_allowed"
  | "account_suspended"
  | "billing_hold"
  | "budget_exceeded"
  | "sms_not_cancelable"
  | "number_unavailable"
  | "registration_invalid"
  | "registration_locked"
  | "plan_required"
  | "provider_unavailable";

const STATUS_BY_CODE = {
  idempotency_key_reused: 422,
  request_in_progress: 409,
  not_found: 404,
  invalid_phone_number: 422,
  // `from` isn't one of the organization's numbers.
  sender_not_found: 422,
  // The number exists but can't send yet (its registration isn't approved).
  sender_not_ready: 422,
  country_not_allowed: 422,
  account_suspended: 403,
  // Payment required: an overdue invoice or the spend limit (`@coss/billing`).
  billing_hold: 402,
  // A member's, project's or API key's monthly budget is used up (`@coss/billing` budgets).
  budget_exceeded: 402,
  // Not 409: the SDK retries those.
  sms_not_cancelable: 422,
  number_unavailable: 422,
  registration_invalid: 422,
  registration_locked: 422,
  // Payment required: a paid plan (senders cost money at the provider).
  plan_required: 402,
  provider_unavailable: 503,
} as const satisfies Record<SmsErrorCode, number>;

/** Expected failures of the SMS product; `status` is the HTTP status the API should use. */
export class SmsError extends Error {
  readonly code: SmsErrorCode;
  /** The request field at fault, e.g. `to`. */
  readonly param: string | undefined;

  constructor(code: SmsErrorCode, message: string, opts?: { param?: string }) {
    super(message);
    this.name = "SmsError";
    this.code = code;
    this.param = opts?.param;
  }

  get status(): (typeof STATUS_BY_CODE)[SmsErrorCode] {
    return STATUS_BY_CODE[this.code];
  }
}
