/** Error types returned by the API, plus the client-side `connection_error` and `timeout_error`. */
export type CossErrorType =
  | "invalid_request_error"
  | "authentication_error"
  | "permission_error"
  | "not_found_error"
  | "idempotency_error"
  | "rate_limit_error"
  | "api_error"
  | "connection_error"
  | "timeout_error";

/** One field-level validation problem (`invalid_request_error` / `validation_error`). */
export interface CossErrorIssue {
  path: string;
  message: string;
}

/**
 * A failed request. API errors mirror the API's `{ "error": { … } }` envelope; failures that never
 * produced a response (network, timeout, abort) have `status: null`.
 */
export interface CossError {
  type: CossErrorType;
  /** Machine-readable reason, e.g. `invalid_api_key`, `validation_error`, `aborted`. */
  code: string;
  message: string;
  /** HTTP status, or `null` when no response was received. */
  status: number | null;
  /** The API's `X-Request-Id`. Include it when contacting support. */
  request_id: string | null;
  /** The request parameter the error relates to, when there is one. */
  param?: string;
  issues?: CossErrorIssue[];
}

export type CossResult<T> = { data: T; error: null } | { data: null; error: CossError };

// Client-side types are never accepted from a response body: they describe local failures.
const API_ERROR_TYPES: ReadonlySet<string> = new Set<CossErrorType>([
  "invalid_request_error",
  "authentication_error",
  "permission_error",
  "not_found_error",
  "idempotency_error",
  "rate_limit_error",
  "api_error",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseIssues(value: unknown): CossErrorIssue[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const issues: CossErrorIssue[] = [];
  for (const item of value) {
    if (isRecord(item) && typeof item.path === "string" && typeof item.message === "string") {
      issues.push({ path: item.path, message: item.message });
    }
  }
  return issues;
}

/**
 * Maps a non-2xx response to a `CossError`. Bodies that are not the API's error envelope (a proxy's
 * HTML 502, an empty 503) become `api_error` / `unexpected_response`.
 */
export function errorFromResponse(
  status: number,
  statusText: string,
  body: string,
  headerRequestId: string | null,
): CossError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = undefined;
  }
  const envelope = isRecord(parsed) ? parsed.error : undefined;

  if (!isRecord(envelope) || typeof envelope.message !== "string") {
    const reason = statusText ? ` (${statusText})` : "";
    return {
      type: "api_error",
      code: "unexpected_response",
      message: `The COSS API returned an unexpected HTTP ${status}${reason} response.`,
      status,
      request_id: headerRequestId,
    };
  }

  const error: CossError = {
    // Unknown (newer) server types degrade to `api_error` so exhaustive switches stay sound.
    type:
      typeof envelope.type === "string" && API_ERROR_TYPES.has(envelope.type)
        ? (envelope.type as CossErrorType)
        : "api_error",
    code: typeof envelope.code === "string" ? envelope.code : "unknown_error",
    message: envelope.message,
    status,
    request_id: typeof envelope.request_id === "string" ? envelope.request_id : headerRequestId,
  };
  if (typeof envelope.param === "string") error.param = envelope.param;
  const issues = parseIssues(envelope.issues);
  if (issues) error.issues = issues;
  return error;
}

/** Builds an error for a failure that happened on the client (no HTTP response to read). */
export function clientError(
  type: "connection_error" | "timeout_error" | "invalid_request_error",
  code: string,
  message: string,
): CossError {
  return { type, code, message, status: null, request_id: null };
}
