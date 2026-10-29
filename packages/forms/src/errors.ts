export type FormErrorCode =
  | "not_found"
  | "form_conflict"
  | "form_limit_reached"
  | "invalid_fields"
  | "invalid_origin"
  | "invalid_redirect"
  | "invalid_sender"
  | "invalid_recipient"
  | "invalid_contacts"
  | "invalid_files"
  | "captcha_not_configured"
  | "hosted_needs_fields"
  | "hosted_content_refused"
  | "submission_not_releasable"
  | "account_suspended"
  | "forms_unavailable";

const STATUS_BY_CODE = {
  not_found: 404,
  // Another update kept changing the form (`updateForm` retried): safe to retry.
  form_conflict: 409,
  // `MAX_FORMS_PER_ENVIRONMENT`.
  form_limit_reached: 422,
  // Duplicate names, options on a field that takes none, a `file` field without uploads on…
  invalid_fields: 422,
  // An allowed origin that isn't `https://host[:port]`.
  invalid_origin: 422,
  invalid_redirect: 422,
  // A sender that isn't on a verified domain of the organization (live environments).
  invalid_sender: 422,
  // A notification recipient who is neither a member nor on a verified domain (live).
  invalid_recipient: 422,
  // An audience, topic or contact property the environment doesn't have.
  invalid_contacts: 422,
  invalid_files: 422,
  // `spam.captcha: required` without a captcha in the environment's risk settings.
  captcha_not_configured: 422,
  // A hosted page renders the form's fields: it needs some.
  hosted_needs_fields: 422,
  // Screening refused the hosted page's text (phishing), or a field asks for a credential.
  hosted_content_refused: 422,
  // Not 409: the SDK retries those.
  submission_not_releasable: 422,
  account_suspended: 403,
  // Uploads need the file store (production without `FORMS_FILES_BUCKET`).
  forms_unavailable: 503,
} as const satisfies Record<FormErrorCode, number>;

/** Expected failures of the Forms product; `status` is the HTTP status the API should use. */
export class FormError extends Error {
  readonly code: FormErrorCode;
  /** The request field at fault, e.g. `fields[2].options`. */
  readonly param: string | undefined;

  constructor(code: FormErrorCode, message: string, opts?: { param?: string }) {
    super(message);
    this.name = "FormError";
    this.code = code;
    this.param = opts?.param;
  }

  get status(): (typeof STATUS_BY_CODE)[FormErrorCode] {
    return STATUS_BY_CODE[this.code];
  }
}
