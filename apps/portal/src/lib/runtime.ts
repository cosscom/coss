import "server-only";
import { createRateLimitRuntime, type RateLimitRuntime } from "@coss/ratelimit";
import { parseSecretsKeys } from "@coss/webhooks";
import { env } from "@/env";
import type { PortalApiDeps } from "./portal-api";

let rateLimits: RateLimitRuntime | undefined;

/**
 * The process's limiter and its Valkey connection. `register()` creates it at startup: the client
 * never queues commands while connecting, so the first request would otherwise get the buckets'
 * outage policy (the portal's deny).
 */
export function rateLimitRuntime(): RateLimitRuntime {
  rateLimits ??= createRateLimitRuntime(env);
  return rateLimits;
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
