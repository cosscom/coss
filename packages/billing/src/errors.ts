/** Billing failures with user-facing messages (the API maps them to `billing_error`, 402). */

export type BillingErrorCode =
  | "plan_feature_unavailable"
  | "plan_limit_reached"
  | "usage_limit_exceeded"
  | "billing_hold"
  | "payment_required"
  | "payment_failed"
  | "self_serve_unavailable"
  | "downgrade_blocked"
  | "invalid_change"
  | "invalid_contract"
  | "invoice_state"
  | "not_found"
  | "provider_unavailable";

const STATUS: Record<BillingErrorCode, number> = {
  plan_feature_unavailable: 402,
  plan_limit_reached: 402,
  usage_limit_exceeded: 402,
  billing_hold: 402,
  payment_required: 402,
  payment_failed: 402,
  self_serve_unavailable: 403,
  downgrade_blocked: 409,
  invalid_change: 422,
  invalid_contract: 422,
  invoice_state: 409,
  not_found: 404,
  provider_unavailable: 503,
};

export class BillingError extends Error {
  readonly code: BillingErrorCode;
  readonly status: number;

  constructor(code: BillingErrorCode, message: string) {
    super(message);
    this.name = "BillingError";
    this.code = code;
    this.status = STATUS[code];
  }
}

/** The codes the public API reports as `billing_error` (402) rather than another type. */
export function isPaymentRequired(error: BillingError): boolean {
  return error.status === 402;
}
