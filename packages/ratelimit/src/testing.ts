/** Test helpers. Valkey-backed tests need TEST_VALKEY_URL and never flush: keys are prefixed. */
import { createRateLimiter, type RateLimiter } from "./limiter.ts";
import type { OverrideSource } from "./overrides.ts";
import { MemoryStore, ValkeyStore } from "./store.ts";

/** A limiter counting in memory (the default of `createApp` and other test setups). */
export function memoryLimiter(
  opts: { overrides?: OverrideSource; now?: () => number } = {},
): RateLimiter {
  return createRateLimiter({
    store: new MemoryStore({ now: opts.now }),
    overrides: opts.overrides,
  });
}

/** A unique key prefix, so tests sharing one Valkey never see each other's buckets. */
export function testPrefix(): string {
  return `test-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Connects to TEST_VALKEY_URL; throws when it is unset. Close it in `afterAll`. */
export async function testValkeyStore(): Promise<ValkeyStore> {
  const url = process.env.TEST_VALKEY_URL;
  if (!url) throw new Error("TEST_VALKEY_URL is not set (see .env.example).");
  const store = ValkeyStore.connect({ url, commandTimeoutMs: 1000 });
  await store.ready();
  return store;
}

/** A Valkey-backed limiter with its own key prefix. Close it in `afterAll`. */
export async function testValkeyLimiter(
  opts: { overrides?: OverrideSource } = {},
): Promise<RateLimiter> {
  return createRateLimiter({
    store: await testValkeyStore(),
    prefix: testPrefix(),
    overrides: opts.overrides,
  });
}
