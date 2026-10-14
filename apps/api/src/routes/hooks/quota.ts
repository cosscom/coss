import type { RateLimitDecision, RateLimitRequest } from "@coss/ratelimit";
import type { Context } from "hono";
import { rateLimitError } from "../../middleware/rate-limit.ts";
import type { AppEnv } from "../../types.ts";

/**
 * The send quota of a message making `deliveries` deliveries (its fan-out; at least one, so a
 * message nobody receives still counts). Live: messages per second and deliveries per day per
 * organization; sandbox: deliveries per day per environment.
 */
function quotaRequests(auth: AppEnv["Variables"]["auth"], deliveries: number): RateLimitRequest[] {
  const cost = Math.max(1, deliveries);
  return auth.mode === "sandbox"
    ? [
        {
          buckets: ["hooks.sandbox_deliveries.day"],
          subject: auth.environmentId,
          organizationId: auth.organizationId,
          cost,
        },
      ]
    : [
        {
          buckets: ["hooks.messages.second"],
          subject: auth.organizationId,
          organizationId: auth.organizationId,
        },
        {
          buckets: ["hooks.deliveries.day"],
          subject: auth.organizationId,
          organizationId: auth.organizationId,
          cost,
        },
      ];
}

export type ChargedQuota = { charged: RateLimitRequest[]; denied: RateLimitDecision | null };

/** Charges the quota, all or nothing (what was charged is refunded when a later bucket denies). */
export async function tryChargeSendQuota(
  c: Context<AppEnv>,
  deliveries: number,
): Promise<ChargedQuota> {
  const charged: RateLimitRequest[] = [];
  for (const request of quotaRequests(c.var.auth, deliveries)) {
    const decision = await c.var.rateLimiter.consume(request);
    if (!decision.allowed) {
      await refundSendQuota(c, { charged, denied: null });
      return { charged: [], denied: decision };
    }
    charged.push(request);
  }
  return { charged, denied: null };
}

export function quotaExceeded(decision: RateLimitDecision) {
  return rateLimitError(decision, {
    code: "quota_exceeded",
    message:
      decision.retryAfterMs === null
        ? "This message goes to more endpoints than the send quota allows at once."
        : `The send quota (${decision.bucket}) is used up. Retry after \`Retry-After\` seconds.`,
  });
}

/** Charges the quota or throws the 429. */
export async function chargeSendQuota(
  c: Context<AppEnv>,
  deliveries: number,
): Promise<ChargedQuota> {
  const quota = await tryChargeSendQuota(c, deliveries);
  if (quota.denied) throw quotaExceeded(quota.denied);
  return quota;
}

export async function refundSendQuota(c: Context<AppEnv>, quota: ChargedQuota): Promise<void> {
  for (const request of quota.charged) await c.var.rateLimiter.refund(request);
}
