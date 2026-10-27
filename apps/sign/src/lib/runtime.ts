import "server-only";
import { createRateLimitRuntime, type RateLimitRuntime } from "@coss/ratelimit";
import type { DocumentStore } from "@coss/sign";
import { signStoreFromEnv } from "@coss/sign/runtime";
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

// Documents' bytes: S3 (`SIGN_DOCUMENTS_BUCKET`), else `sign_fake_object` outside production.
let store: DocumentStore | null | undefined;

/** The signing API's dependencies for one request. */
export function signDeps(headers: Headers): SignApiDeps {
  const rateLimits = rateLimitRuntime();
  if (store === undefined) store = signStoreFromEnv(env);
  return {
    store,
    limiter: rateLimits.limiter,
    clientIp: rateLimits.clientIp(headers),
  };
}
