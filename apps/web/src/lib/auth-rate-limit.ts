/**
 * Rate limits for Better Auth's credential endpoints (`/api/auth/*`), per client IP and per email
 * address. Better Auth's own limiter is off: it counts per process and trusts any
 * `x-forwarded-for`. No `server-only` import, so tests can import it.
 */
import type { BucketName, ClientIpResolver, RateLimiter } from "@coss/ratelimit";

type AuthLimits = { ip: BucketName; email?: BucketName };

/** Better Auth paths (below `/api/auth`) that are limited, all POST. */
export const AUTH_RATE_LIMITS: Readonly<Record<string, AuthLimits>> = {
  "/sign-in/email": { ip: "auth.sign_in.ip", email: "auth.sign_in.email" },
  "/sign-up/email": { ip: "auth.sign_up.ip" },
  "/request-password-reset": {
    ip: "auth.password_reset.ip",
    email: "auth.password_reset.email",
  },
  "/send-verification-email": {
    ip: "auth.verification_email.ip",
    email: "auth.verification_email.email",
  },
  "/reset-password": { ip: "auth.reset_password.ip" },
  "/two-factor/verify-totp": { ip: "auth.two_factor.ip" },
  "/two-factor/verify-backup-code": { ip: "auth.two_factor.ip" },
  "/passkey/verify-authentication": { ip: "auth.passkey.ip" },
};

const AUTH_BASE_PATH = "/api/auth";

export type AuthRateLimitDeps = { limiter: RateLimiter; clientIp: ClientIpResolver };

function authPath(url: string): string {
  const { pathname } = new URL(url);
  const path = pathname.startsWith(AUTH_BASE_PATH) ? pathname.slice(AUTH_BASE_PATH.length) : "";
  return path.replace(/\/+$/, "");
}

/** The `email` field of a JSON body, without consuming the request. */
async function emailOf(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.clone().json();
    if (body && typeof body === "object" && "email" in body && typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      return email || null;
    }
  } catch {
    // Not JSON: Better Auth rejects it itself.
  }
  return null;
}

function tooManyRequests(retryAfterMs: number | null): Response {
  const seconds = retryAfterMs === null ? null : Math.max(1, Math.ceil(retryAfterMs / 1000));
  return Response.json(
    {
      code: "TOO_MANY_REQUESTS",
      message:
        seconds === null || seconds > 120
          ? "Too many attempts. Please try again later."
          : `Too many attempts. Please try again in ${seconds} seconds.`,
    },
    {
      status: 429,
      headers: seconds === null ? {} : { "Retry-After": String(seconds) },
    },
  );
}

/** Wraps Better Auth's POST handler. `deps` is called per request (lazily built runtime). */
export function withAuthRateLimit(
  handler: (request: Request) => Promise<Response>,
  deps: () => AuthRateLimitDeps,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const limits = AUTH_RATE_LIMITS[authPath(request.url)];
    if (!limits) return handler(request);
    const { limiter, clientIp } = deps();

    const ip = clientIp(request.headers);
    if (ip) {
      const decision = await limiter.consume({ buckets: [limits.ip], subject: ip });
      if (!decision.allowed) return tooManyRequests(decision.retryAfterMs);
    }
    const email = limits.email ? await emailOf(request) : null;
    if (limits.email && email) {
      const decision = await limiter.consume({ buckets: [limits.email], subject: email });
      if (!decision.allowed) return tooManyRequests(decision.retryAfterMs);
    }
    return handler(request);
  };
}
