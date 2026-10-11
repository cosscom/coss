export type EmailErrorCode =
  | "idempotency_key_reused"
  | "request_in_progress"
  | "not_found"
  | "domain_not_verified"
  | "sending_paused"
  | "account_suspended";

const STATUS_BY_CODE = {
  idempotency_key_reused: 422,
  request_in_progress: 409,
  not_found: 404,
  domain_not_verified: 422,
  sending_paused: 403,
  account_suspended: 403,
} as const satisfies Record<EmailErrorCode, number>;

/** Expected failures of the email service; `status` is the HTTP status the API should use. */
export class EmailError extends Error {
  readonly code: EmailErrorCode;

  constructor(code: EmailErrorCode, message: string) {
    super(message);
    this.name = "EmailError";
    this.code = code;
  }

  get status(): (typeof STATUS_BY_CODE)[EmailErrorCode] {
    return STATUS_BY_CODE[this.code];
  }
}

export type DomainErrorCode =
  | "invalid_domain"
  | "domain_taken"
  | "too_many_pending_domains"
  | "not_found"
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
