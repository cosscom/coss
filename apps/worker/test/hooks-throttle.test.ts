import { expect, test } from "bun:test";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { hookThrottle } from "../src/hooks-throttle.ts";

const attempt = (host: string, rateLimitPerSecond: number | null = 2) => ({
  organizationId: "org_throttle",
  endpointId: "hep_throttle",
  host,
  rateLimitPerSecond,
});

test("an endpoint's own rate applies, and a denial gives back what was charged before it", async () => {
  const throttle = hookThrottle(
    memoryLimiter({
      overrides: async () => ({ "hooks.destination.attempts": { limit: 1, periodMs: 60_000 } }),
    }),
  );
  expect(await throttle(attempt("a.example.com"))).toEqual({ allowed: true });
  // The destination bucket (1 per minute for this organization) denies; the endpoint's is refunded.
  const denied = await throttle(attempt("a.example.com"));
  expect(denied).toMatchObject({ allowed: false });
  expect(denied.allowed ? 0 : denied.retryAfterMs).toBeGreaterThan(0);
  expect(await throttle(attempt("b.example.com"))).toEqual({ allowed: true });
  // Two per second for the endpoint: the third attempt within the second is denied.
  expect(await throttle(attempt("c.example.com"))).toMatchObject({ allowed: false });
});
