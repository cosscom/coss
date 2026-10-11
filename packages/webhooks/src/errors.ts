export type WebhookErrorCode =
  | "invalid_api_version"
  | "invalid_url"
  | "not_found"
  | "too_many_endpoints"
  | "too_many_log_drains";

/** Expected failures of webhook management; messages are safe to show to the user. */
export class WebhookError extends Error {
  readonly code: WebhookErrorCode;

  constructor(code: WebhookErrorCode, message: string) {
    super(message);
    this.name = "WebhookError";
    this.code = code;
  }
}
