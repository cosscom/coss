/**
 * Builds the rate limiter from validated env. One per process: the Valkey connection is shared.
 */
import { type ClientIpResolver, clientIpResolver } from "./client-ip.ts";
import type { RateLimitEnv } from "./env.ts";
import { createRateLimiter, type RateLimiter } from "./limiter.ts";
import { cachedOverrides, type PlanRuleSource, withPlanRules } from "./overrides.ts";
import { MemoryStore, type RateLimitStore, ValkeyStore } from "./store.ts";

export { type RateLimitEnv, rateLimitEnvShape } from "./env.ts";

export type RateLimitRuntime = {
  limiter: RateLimiter;
  clientIp: ClientIpResolver;
  /** Waits (up to 5 s) for Valkey, so the first requests are counted. Never throws. */
  ready(): Promise<void>;
};

export function createRateLimitRuntime(
  env: RateLimitEnv,
  opts: {
    production?: boolean;
    /** The organizations' plan rules (the apps pass `@coss/billing`'s `planRateLimits`). */
    planRules?: PlanRuleSource;
  } = {},
): RateLimitRuntime {
  const production = opts.production ?? process.env.NODE_ENV === "production";
  let store: RateLimitStore;
  let ready = async () => {};
  if (env.VALKEY_URL) {
    const valkey = ValkeyStore.connect({ url: env.VALKEY_URL, cluster: env.VALKEY_CLUSTER });
    store = valkey;
    ready = () =>
      valkey.ready().catch((error: unknown) => {
        console.warn(
          "[ratelimit] Valkey is not reachable yet; bucket failure policies apply until it is:",
          error,
        );
      });
  } else if (production) {
    // Per-process counters would multiply every limit by the number of instances.
    throw new Error("VALKEY_URL is required in production (see `bun run valkey:bootstrap`).");
  } else {
    store = new MemoryStore();
  }
  return {
    limiter: createRateLimiter({
      store,
      prefix: env.RATE_LIMIT_KEY_PREFIX,
      overrides: cachedOverrides(opts.planRules ? { load: withPlanRules(opts.planRules) } : {}),
    }),
    clientIp: clientIpResolver({
      header: env.CLIENT_IP_HEADER,
      trustedProxyCount: env.TRUSTED_PROXY_COUNT,
    }),
    ready,
  };
}
