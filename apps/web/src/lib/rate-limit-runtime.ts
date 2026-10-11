import { createRateLimitRuntime, type RateLimitRuntime } from "@coss/ratelimit";
import type { RateLimitEnv } from "@coss/ratelimit/env";
import { env } from "@/env";

// One limiter (and Valkey connection) per server process, kept across dev HMR re-evaluations.
const globalForRateLimit = globalThis as unknown as { __cossRateLimit?: RateLimitRuntime };

type WebRateLimitEnv = RateLimitEnv & { TRUSTED_PROXY_HOPS: number };

/** Accounts for `proxy.ts` replacing X-Forwarded-For with the one trusted client address. */
export function rateLimitEnvAfterProxy(input: WebRateLimitEnv): RateLimitEnv {
  if (input.TRUSTED_PROXY_HOPS === 0 || input.CLIENT_IP_HEADER !== "x-forwarded-for") return input;
  return { ...input, TRUSTED_PROXY_COUNT: 1 };
}

/** The rate limiter configured by `VALKEY_URL` (in-memory without it, outside production). */
export function rateLimitRuntime(): RateLimitRuntime {
  globalForRateLimit.__cossRateLimit ??= createRateLimitRuntime(rateLimitEnvAfterProxy(env));
  return globalForRateLimit.__cossRateLimit;
}
