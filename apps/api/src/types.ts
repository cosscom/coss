import type { ApiKeyContext } from "@coss/tenancy";

/** Hono environment shared by every router and middleware of the public API. */
export type AppEnv = {
  Variables: {
    /** Server-generated `req_…` id, echoed in `X-Request-Id` and every error envelope. */
    requestId: string;
    /** The authenticated key's environment. Only set behind `requireApiKey`. */
    auth: ApiKeyContext;
  };
};
