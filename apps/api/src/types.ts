import type { RateLimiter } from "@coss/ratelimit";
import type { ApiKeyContext } from "@coss/tenancy";
import type { Versioning } from "@coss/versioning";

/** Hono environment shared by every router and middleware of the public API. */
export type AppEnv = {
  Variables: {
    /** Server-generated `req_…` id, echoed in `X-Request-Id` and every error envelope. */
    requestId: string;
    /** The authenticated key's environment. Only set behind `requireApiKey`. */
    auth: ApiKeyContext;
    rateLimiter: RateLimiter;
    /** The caller's address per `CLIENT_IP_HEADER`; `null` disables per-IP limits. */
    clientIp: string | null;
    /** The API's versions and the changes between them. */
    versioning: Versioning;
    /** The `Coss-Version` header, validated (`/v1/*` only); `null` when absent. */
    requestedApiVersion: string | null;
    /**
     * The version this request is answered in: the header, else the organization's pin. Only set behind
     * `requireApiKey`.
     */
    apiVersion: string;
  };
};
