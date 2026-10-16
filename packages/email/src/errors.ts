export type EmailErrorCode =
  | "idempotency_key_reused"
  | "request_in_progress"
  | "not_found"
  | "domain_not_verified"
  | "sending_paused"
  | "account_suspended"
  | "marketing_paused"
  | "billing_hold"
  | "email_not_cancelable"
  | "email_not_reschedulable"
  | "template_not_found"
  | "template_not_published"
  | "template_version_not_found"
  | "invalid_template_variables"
  | "template_render_failed"
  | "template_invalid"
  | "template_alias_taken"
  | "template_limit_reached"
  | "template_revision_mismatch";

const STATUS_BY_CODE = {
  idempotency_key_reused: 422,
  request_in_progress: 409,
  not_found: 404,
  domain_not_verified: 422,
  sending_paused: 403,
  account_suspended: 403,
  marketing_paused: 403,
  // Payment required: an overdue invoice or the spend limit (`@coss/billing`).
  billing_hold: 402,
  // Not 409: the SDK retries those.
  email_not_cancelable: 422,
  email_not_reschedulable: 422,
  // A template referenced from a send body is a bad request, not a missing resource.
  template_not_found: 422,
  template_not_published: 422,
  template_version_not_found: 422,
  invalid_template_variables: 422,
  template_render_failed: 422,
  template_invalid: 422,
  template_alias_taken: 422,
  template_limit_reached: 422,
  // Not 409: the SDK would retry it, and another save won't happen by waiting.
  template_revision_mismatch: 422,
} as const satisfies Record<EmailErrorCode, number>;

/** Expected failures of the email service; `status` is the HTTP status the API should use. */
export class EmailError extends Error {
  readonly code: EmailErrorCode;
  /** The request field at fault, when it differs from the code's usual one (e.g. `emails.3.from`). */
  readonly param: string | undefined;
  /** Every problem, for errors about several fields (`invalid_template_variables`). */
  readonly issues: { path: string; message: string }[] | undefined;

  constructor(
    code: EmailErrorCode,
    message: string,
    opts?: { param?: string; issues?: { path: string; message: string }[] },
  ) {
    super(message);
    this.name = "EmailError";
    this.code = code;
    this.param = opts?.param;
    this.issues = opts?.issues;
  }

  get status(): (typeof STATUS_BY_CODE)[EmailErrorCode] {
    return STATUS_BY_CODE[this.code];
  }
}

export type DomainErrorCode =
  | "invalid_domain"
  | "domain_taken"
  | "too_many_pending_domains"
  | "invalid_tracking_hostname"
  | "tracking_domain_exists"
  | "tracking_domain_taken"
  | "invalid_receiving_hostname"
  | "receiving_domain_exists"
  | "receiving_domain_taken"
  | "receiving_unavailable"
  | "not_found"
  | "domain_in_use_by_sso"
  | "provider_error";

/** Expected failures of domain management; messages are safe to show to the user. */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
