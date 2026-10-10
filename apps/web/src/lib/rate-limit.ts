import "server-only";
import { createRateLimitRuntime, type RateLimitRuntime } from "@coss/ratelimit";
import { env } from "@/env";

// One limiter (and Valkey connection) per server process, kept across dev HMR re-evaluations.
const globalForRateLimit = globalThis as unknown as { __cossRateLimit?: RateLimitRuntime };

/** The rate limiter configured by `VALKEY_URL` (in-memory without it, outside production). */
export function rateLimitRuntime(): RateLimitRuntime {
  globalForRateLimit.__cossRateLimit ??= createRateLimitRuntime(env);
  return globalForRateLimit.__cossRateLimit;
}
