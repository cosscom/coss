export type EmailErrorCode = "idempotency_key_reused" | "request_in_progress" | "not_found";

const STATUS_BY_CODE = {
  idempotency_key_reused: 422,
  request_in_progress: 409,
  not_found: 404,
} as const satisfies Record<EmailErrorCode, number>;

/** Expected failures of the email service; `status` is the HTTP status the API should use. */
export class EmailError extends Error {
  readonly code: EmailErrorCode;

  constructor(code: EmailErrorCode, message: string) {
    super(message);
    this.name = "EmailError";
    this.code = code;
  }

  get status(): 409 | 422 | 404 {
    return STATUS_BY_CODE[this.code];
  }
}
