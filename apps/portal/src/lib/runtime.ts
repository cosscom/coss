import "server-only";
import { createRateLimitRuntime, type RateLimitRuntime } from "@coss/ratelimit";
import { parseSecretsKeys } from "@coss/webhooks";
import { env } from "@/env";
import type { PortalApiDeps } from "./portal-api";

// On globalThis: instrumentation and the route handlers are separate bundles, each with its own
// copy of this module, and they must share one limiter (and Valkey connection) per process.
const globalForRateLimit = globalThis as unknown as { __cossPortalRateLimit?: RateLimitRuntime };

/**
 * The process's limiter and its Valkey connection. `register()` creates it at startup: the client
 * never queues commands while connecting, so the first requests would otherwise get the buckets'
 * outage policy (the portal's deny).
 */
export function rateLimitRuntime(): RateLimitRuntime {
  globalForRateLimit.__cossPortalRateLimit ??= createRateLimitRuntime(env);
  return globalForRateLimit.__cossPortalRateLimit;
}

/** The portal API's dependencies, built once per process. */
export function portalDeps(headers: Headers): PortalApiDeps {
  const rateLimits = rateLimitRuntime();
  return {
    hooks: {
      secretsKeys: parseSecretsKeys(env.WEBHOOK_SECRETS_KEY),
      // Users may point endpoints at local URLs outside production only.
      allowInsecureUrls: process.env.NODE_ENV !== "production",
    },
    limiter: rateLimits.limiter,
    clientIp: rateLimits.clientIp(headers),
  };
}
