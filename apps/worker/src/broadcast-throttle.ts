/**
 * The pace of broadcasts: each batch of recipients is charged to its organization's marketing
 * rate (`email.marketing.recipients.second`, the plan's rule) and its daily recipients
 * (`email.recipients.day`, shared with API sends). A denial puts the batch off, never fails it.
 */
import { planRateLimits } from "@coss/billing";
import type { BroadcastWorkerDeps } from "@coss/email";
import { BUCKETS, type RateLimiter } from "@coss/ratelimit";

export function broadcastThrottle(
  limiter: RateLimiter,
): NonNullable<BroadcastWorkerDeps["throttle"]> {
  return async ({ organizationId, count }) => {
    const decision = await limiter.consume({
      buckets: ["email.marketing.recipients.second", "email.recipients.day"],
      subject: organizationId,
      organizationId,
      cost: count,
    });
    // `retryAfterMs: null`: the batch is larger than the bucket, so the broadcast tries a smaller one.
    return { allowed: decision.allowed, retryAfterMs: decision.retryAfterMs };
  };
}

/** The plan's marketing rate, in recipients per second (sizes each batch). */
export function broadcastPlanRate(opts: {
  systemOrganizationId: () => string | null;
}): NonNullable<BroadcastWorkerDeps["planRate"]> {
  return async (organizationId) => {
    const rules = await planRateLimits(organizationId, {
      systemOrganizationId: opts.systemOrganizationId(),
    });
    const rule =
      rules["email.marketing.recipients.second"] ?? BUCKETS["email.marketing.recipients.second"];
    return Math.max(1, Math.floor((rule.limit * 1000) / rule.periodMs));
  };
}
