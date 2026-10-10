import { type AuthenticateResult, authenticateApiKey, type KeyPermissions } from "@coss/tenancy";
import { createMiddleware } from "hono/factory";
import { ApiError } from "../errors.ts";
import type { AppEnv } from "../types.ts";

export type Authenticate = (
  rawKey: string,
  required: KeyPermissions,
) => Promise<AuthenticateResult>;

const BEARER = /^bearer\s+(.+)$/i;

// RFC 6750: 401 responses name the scheme the client should use.
const WWW_AUTHENTICATE = { "WWW-Authenticate": "Bearer" };

function describePermissions(required: KeyPermissions): string {
  return Object.entries(required)
    .flatMap(([resource, actions]) => actions.map((action) => `${resource}:${action}`))
    .join(", ");
}

/**
 * Route-level middleware (`createRoute({ middleware })`) so it runs before request validation:
 * an unauthenticated caller gets a 401, never a 422 describing the endpoint's schema.
 * `authenticate` is injectable for tests only.
 */
export function requireApiKey(
  required: KeyPermissions,
  options: { authenticate?: Authenticate } = {},
) {
  const authenticate = options.authenticate ?? authenticateApiKey;

  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header("Authorization");
    const key = header ? BEARER.exec(header.trim())?.[1]?.trim() : undefined;
    if (!key) {
      throw new ApiError(
        401,
        {
          type: "authentication_error",
          code: "missing_api_key",
          message: header
            ? "The Authorization header must use the Bearer scheme: `Authorization: Bearer coss_…`."
            : "No API key provided. Send it as `Authorization: Bearer coss_…`.",
        },
        WWW_AUTHENTICATE,
      );
    }

    let result: AuthenticateResult;
    try {
      result = await authenticate(key, required);
    } catch (error) {
      // A database outage is not the caller's fault: 503 (retryable), never a 401.
      console.error(`[api] API key verification failed (request_id=${c.var.requestId}):`, error);
      throw new ApiError(503, {
        type: "api_error",
        code: "service_unavailable",
        message: "The API key could not be verified right now. Retry the request shortly.",
      });
    }

    if (!result.ok) {
      if (result.reason === "suspended") {
        throw new ApiError(403, {
          type: "permission_error",
          code: "organization_suspended",
          message:
            "This organization is suspended, so its API keys can't be used. Contact support.",
        });
      }
      if (result.reason === "forbidden") {
        throw new ApiError(403, {
          type: "permission_error",
          code: "insufficient_permissions",
          message: `This API key does not have the required permission: ${describePermissions(required)}.`,
        });
      }
      throw new ApiError(
        401,
        {
          type: "authentication_error",
          code: "invalid_api_key",
          message: "The API key is invalid, revoked or expired.",
        },
        WWW_AUTHENTICATE,
      );
    }

    c.set("auth", result.context);
    await next();
  });
}
