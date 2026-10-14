export type EmailErrorCode =
  | "idempotency_key_reused"
  | "request_in_progress"
  | "not_found"
  | "domain_not_verified"
  | "sending_paused"
  | "account_suspended"
  | "email_not_cancelable"
  | "email_not_reschedulable";

const STATUS_BY_CODE = {
  idempotency_key_reused: 422,
  request_in_progress: 409,
  not_found: 404,
  domain_not_verified: 422,
  sending_paused: 403,
  account_suspended: 403,
  // Not 409: the SDK retries those.
  email_not_cancelable: 422,
  email_not_reschedulable: 422,
} as const satisfies Record<EmailErrorCode, number>;

/** Expected failures of the email service; `status` is the HTTP status the API should use. */
export class EmailError extends Error {
  readonly code: EmailErrorCode;
  /** The request field at fault, when it differs from the code's usual one (e.g. `emails.3.from`). */
  readonly param: string | undefined;

  constructor(code: EmailErrorCode, message: string, opts?: { param?: string }) {
    super(message);
    this.name = "EmailError";
    this.code = code;
    this.param = opts?.param;
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
