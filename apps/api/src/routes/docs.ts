/** OpenAPI response fragments shared by every route: the request id header and error envelopes. */
import { ErrorEnvelope } from "../errors.ts";

export type HeaderDoc = {
  description: string;
  schema: { type: "string" | "integer"; enum?: string[]; examples?: string[] };
};

export const requestIdHeader: HeaderDoc = {
  description: "Unique id of this request. Include it when contacting support.",
  schema: { type: "string", examples: ["req_01k7c8m4q2f3e9v6t5r1n0p8yz"] },
};

export function errorDoc(description: string, headers: Record<string, HeaderDoc> = {}) {
  return {
    description,
    headers: { "X-Request-Id": requestIdHeader, ...headers },
    content: { "application/json": { schema: ErrorEnvelope } },
  };
}

export const retryAfterHeader: HeaderDoc = {
  description: "Seconds to wait before retrying.",
  schema: { type: "integer" },
};

/** A plan or billing refusal (`billing_error`, 402): the reason is in `code`. */
export function billingErrorDoc(reasons: string) {
  return errorDoc(
    `${reasons} (\`billing_error\`). Never retried: it needs a plan change or a payment.`,
  );
}

/** The errors every authenticated endpoint can return. */
export const commonErrors = {
  401: errorDoc("The API key is missing, invalid, revoked or expired (`authentication_error`)."),
  403: errorDoc(
    "The API key lacks the permission this endpoint needs (`permission_error`), or its " +
      "organization is suspended (`organization_suspended`).",
  ),
  429: errorDoc(
    "Too many requests with this API key (`rate_limited`), or too many requests with invalid " +
      "keys from this address (`too_many_failed_authentications`). Retry after `Retry-After` " +
      "seconds. Successful responses carry `RateLimit-Limit`, `RateLimit-Remaining` and " +
      "`RateLimit-Reset` (seconds until the limit is fully restored).",
    { "Retry-After": retryAfterHeader },
  ),
  500: errorDoc("Unexpected server error (`api_error` / `internal_error`)."),
  503: errorDoc("The API key could not be verified right now; retry (`service_unavailable`)."),
};

/** A successful JSON response: the schema plus the request id header. */
export function jsonDoc<Schema>(description: string, schema: Schema) {
  return {
    description,
    headers: { "X-Request-Id": requestIdHeader },
    content: { "application/json": { schema } },
  };
}
