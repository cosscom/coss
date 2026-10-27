import "server-only";
import { createRateLimitRuntime, type RateLimitRuntime } from "@coss/ratelimit";
import { FakeDocumentStore } from "@coss/sign";
import { env } from "@/env";
import type { SignApiDeps } from "./sign-api";

// On globalThis: instrumentation and the route handlers are separate bundles, each with its own
// copy of this module, and they must share one limiter (and Valkey connection) per process.
const globalForRateLimit = globalThis as unknown as { __cossSignRateLimit?: RateLimitRuntime };

/**
 * The process's limiter and its Valkey connection. `register()` creates it at startup: the client
 * never queues commands while connecting, so the first requests would otherwise get the buckets'
 * outage policy (deny).
 */
export function rateLimitRuntime(): RateLimitRuntime {
  globalForRateLimit.__cossSignRateLimit ??= createRateLimitRuntime(env);
  return globalForRateLimit.__cossSignRateLimit;
}

// Documents' bytes: `sign_fake_object` outside production. Production has no store until the S3
// store lands, and the API doesn't create requests there either.
const store = process.env.NODE_ENV === "production" ? null : new FakeDocumentStore();

/** The signing API's dependencies for one request. */
export function signDeps(headers: Headers): SignApiDeps {
  const rateLimits = rateLimitRuntime();
  return {
    store,
    limiter: rateLimits.limiter,
    clientIp: rateLimits.clientIp(headers),
  };
}
