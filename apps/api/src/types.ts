import type { RateLimiter } from "@coss/ratelimit";
import type { ApiKeyContext } from "@coss/tenancy";

/** Hono environment shared by every router and middleware of the public API. */
export type AppEnv = {
  Variables: {
    /** Server-generated `req_…` id, echoed in `X-Request-Id` and every error envelope. */
    requestId: string;
    /** The authenticated key's environment. Only set behind `requireApiKey`. */
    auth: ApiKeyContext;
    /** A valid key `requireApiKey` refused (permissions, suspension): lets the refusal be logged. */
    attemptedAuth: ApiKeyContext;
    rateLimiter: RateLimiter;
    /** The caller's address per `CLIENT_IP_HEADER`; `null` disables per-IP limits. */
    clientIp: string | null;
  };
};
