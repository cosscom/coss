/**
 * SMTP AUTH: username `coss`, an API key as the password. The same throttling as the API's
 * `requireApiKey` (apps/api/src/middleware/api-key.ts), in the same order: the key's and the
 * client's authentication buckets before any database work, then the client's failure budget,
 * then the key lookup, and a failure charged only for keys that don't exist.
 */
import { createHash } from "node:crypto";
import type { SmtpReply } from "@coss/email/smtp";
import type { RateLimiter } from "@coss/ratelimit";
import {
  type ApiKeyContext,
  type AuthenticateResult,
  authenticateApiKey,
  type KeyPermissions,
  type RefusedKeyContext,
} from "@coss/tenancy";

export type Authenticate = (
  rawKey: string,
  required: KeyPermissions,
) => Promise<AuthenticateResult>;

/** The one username the relay accepts (case-insensitive); the API key is the password. */
export const SMTP_USERNAME = "coss";

const SEND_PERMISSION: KeyPermissions = { email: ["send"] };

export type SmtpAuthResult =
  | { ok: true; context: ApiKeyContext }
  /** `attempted`: a real key refused for its organization or permissions (logged like the API). */
  | { ok: false; reply: SmtpReply; errorCode: string; attempted?: RefusedKeyContext };

const tooManyAuthentications: SmtpReply = {
  code: 454,
  status: "4.7.0",
  message: "Too many authentication attempts. Retry later.",
};

export async function authenticateSmtp(input: {
  username: string;
  password: string;
  clientIp: string | null;
  rateLimiter: RateLimiter;
  authenticate?: Authenticate;
}): Promise<SmtpAuthResult> {
  const { rateLimiter, clientIp } = input;
  const key = input.password.trim();
  // Hash the raw secret before it can reach Valkey.
  for (const request of [
    {
      buckets: ["api.authentication.key"] as const,
      subject: createHash("sha256").update(key).digest("hex").slice(0, 32),
    },
    { buckets: ["api.authentication.ip"] as const, subject: clientIp ?? "unattributed" },
  ]) {
    const decision = await rateLimiter.consume(request);
    if (!decision.allowed) {
      return { ok: false, reply: tooManyAuthentications, errorCode: "too_many_authentications" };
    }
  }
  const failures = clientIp ? { buckets: ["api.auth_failure"] as const, subject: clientIp } : null;
  if (failures) {
    const decision = await rateLimiter.consume({ ...failures, peek: true });
    if (!decision.allowed) {
      return {
        ok: false,
        reply: {
          code: 454,
          status: "4.7.0",
          message: "Too many failed authentications from this address. Retry later.",
        },
        errorCode: "too_many_failed_authentications",
      };
    }
  }

  if (input.username.trim().toLowerCase() !== SMTP_USERNAME) {
    if (failures) await rateLimiter.consume(failures);
    return {
      ok: false,
      reply: {
        code: 535,
        status: "5.7.8",
        message: `Use the username "${SMTP_USERNAME}" and an API key as the password.`,
      },
      errorCode: "invalid_username",
    };
  }

  let result: AuthenticateResult;
  try {
    result = await (input.authenticate ?? authenticateApiKey)(key, SEND_PERMISSION);
  } catch (error) {
    // A database outage is not the client's fault: a temporary failure, never a 535.
    console.error("[smtp] API key verification failed:", error);
    return {
      ok: false,
      reply: {
        code: 454,
        status: "4.7.0",
        message: "The API key could not be verified right now. Retry shortly.",
      },
      errorCode: "service_unavailable",
    };
  }
  if (result.ok) return result;
  if (result.reason === "suspended") {
    return {
      ok: false,
      reply: {
        code: 535,
        status: "5.7.1",
        message: "This organization is suspended, so its API keys can't be used. Contact support.",
      },
      errorCode: "organization_suspended",
      attempted: result.context,
    };
  }
  if (result.reason === "forbidden") {
    return {
      ok: false,
      reply: {
        code: 535,
        status: "5.7.1",
        message: "This API key does not have the email:send permission.",
      },
      errorCode: "insufficient_permissions",
      attempted: result.context,
    };
  }
  if (failures) await rateLimiter.consume(failures);
  return {
    ok: false,
    reply: {
      code: 535,
      status: "5.7.8",
      message: `The API key is invalid, revoked or expired. Use the username "${SMTP_USERNAME}" and an API key as the password.`,
    },
    errorCode: "invalid_api_key",
  };
}
