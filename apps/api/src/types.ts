import type { PlanGate } from "@coss/billing/gate";
import type { RateLimiter } from "@coss/ratelimit";
import type { ApiKeyContext, RefusedKeyContext } from "@coss/tenancy";
import type { Versioning } from "@coss/versioning";

/** Hono environment shared by every router and middleware of the public API. */
export type AppEnv = {
  Variables: {
    /** Server-generated `req_…` id, echoed in `X-Request-Id` and every error envelope. */
    requestId: string;
    /** The authenticated key's environment. Only set behind `requireApiKey`. */
    auth: ApiKeyContext;
    /** A valid key `requireApiKey` refused (permissions, suspension): lets the refusal be logged. */
    attemptedAuth: RefusedKeyContext;
    rateLimiter: RateLimiter;
    /** The organizations' plans (`@coss/billing`); `null`: nothing is limited (tests). */
    plans: PlanGate | null;
    /** The caller's address per `CLIENT_IP_HEADER`; `null` disables per-IP limits. */
    clientIp: string | null;
    /** The API's versions and the changes between them. */
    versioning: Versioning;
    /**
     * The W3C `traceparent` header, validated and normalized (`/v1/*` only); `null` when absent or
     * invalid. Stored on the emails and text messages the request sends.
     */
    traceparent: string | null;
    /** The `Coss-Version` header, validated (`/v1/*` only); `null` when absent. */
    requestedApiVersion: string | null;
    /**
     * The version this request is answered in: the header, else the organization's pin. Only set behind
     * `requireApiKey`.
     */
    apiVersion: string;
    /**
     * Set by the email routes when they answer with an email sent without content storage: the
     * request log then redacts the request's and response's content (`markEmailContent`).
     */
    discardsEmailContent: boolean;
  };
};
