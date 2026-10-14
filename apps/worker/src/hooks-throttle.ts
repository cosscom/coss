/**
 * Rate limits of Hooks delivery attempts: per endpoint (its own `rate_limit_per_second`, else the
 * bucket's rule), per organization and destination host, and a global ceiling per host. A denied
 * attempt is put off by the delivery worker, never failed.
 */
import type { HookThrottle } from "@coss/hooks";
import type { RateLimiter, RateLimitRequest } from "@coss/ratelimit";

export function hookThrottle(limiter: RateLimiter): HookThrottle {
  return async ({ organizationId, endpointId, host, rateLimitPerSecond }) => {
    // Different scopes live in different cluster slots, so each is its own consume; what was
    // charged before a denial is given back.
    const requests: RateLimitRequest[] = [
      {
        buckets: ["hooks.endpoint.attempts"],
        subject: endpointId,
        organizationId,
        ...(rateLimitPerSecond !== null && {
          rule: { limit: rateLimitPerSecond, periodMs: 1000 },
        }),
      },
      {
        buckets: ["hooks.destination.attempts"],
        subject: `${organizationId}:${host}`,
        organizationId,
      },
      { buckets: ["hooks.host.attempts"], subject: host },
    ];
    const charged: RateLimitRequest[] = [];
    for (const request of requests) {
      const decision = await limiter.consume(request);
      if (!decision.allowed) {
        await Promise.all(charged.map((done) => limiter.refund(done)));
        return { allowed: false, retryAfterMs: decision.retryAfterMs ?? 1000 };
      }
      charged.push(request);
    }
    return { allowed: true };
  };
}
