import { createHash } from "node:crypto";
import type { RateLimitDecision, RateLimiter, RateLimitRequest } from "./limiter.ts";

/**
 * The recipient quota a send is charged against: the organization's for live keys, the
 * environment's own (smaller, daily) quota for sandbox keys. Shared by the API and the SMTP relay,
 * so both protocols spend one budget.
 */
export function emailSendQuota(
  auth: { organizationId: string; environmentId: string; mode: string },
  recipients: number,
): RateLimitRequest {
  return auth.mode === "sandbox"
    ? {
        buckets: ["email.sandbox_recipients.day"],
        subject: auth.environmentId,
        organizationId: auth.organizationId,
        cost: recipients,
      }
    : {
        buckets: ["email.recipients.second", "email.recipients.day"],
        subject: auth.organizationId,
        organizationId: auth.organizationId,
        cost: recipients,
      };
}

/** The quotas a customer set on an email sub-account (`null`: none). */
export type SubaccountQuotaRules = {
  id: string;
  dailyRecipientLimit: number | null;
  perSecondRecipientLimit: number | null;
  perSecondBurst: number | null;
};

/**
 * The sub-account's own recipient quotas a send is charged against too (live and sandbox alike:
 * the customer set them), one request per quota since each carries its own rule. Charge them after
 * `emailSendQuota`, all or nothing (`consumeAll`).
 */
export function subaccountSendQuotas(
  subaccount: SubaccountQuotaRules,
  organizationId: string,
  recipients: number,
): RateLimitRequest[] {
  const requests: RateLimitRequest[] = [];
  if (subaccount.perSecondRecipientLimit !== null) {
    requests.push({
      buckets: ["email.subaccount_recipients.second"],
      subject: subaccount.id,
      organizationId,
      cost: recipients,
      rule: {
        limit: subaccount.perSecondRecipientLimit,
        periodMs: 1000,
        burst: subaccount.perSecondBurst ?? subaccount.perSecondRecipientLimit,
      },
    });
  }
  if (subaccount.dailyRecipientLimit !== null) {
    requests.push({
      buckets: ["email.subaccount_recipients.day"],
      subject: subaccount.id,
      organizationId,
      cost: recipients,
      rule: { limit: subaccount.dailyRecipientLimit, periodMs: 24 * 60 * 60 * 1000 },
    });
  }
  return requests;
}

/**
 * Everything a send (or a batch) is charged: the organization's recipient quota (the
 * environment's for sandbox keys), then the quotas set on each sub-account the emails name
 * (`lookup` finds one by its id or uid; a missing one adds nothing: the send refuses it). Shared
 * by the API and the SMTP relay. Charge the result with `consumeAll`.
 */
export async function emailSendQuotas(
  auth: { organizationId: string; environmentId: string; mode: string },
  sends: readonly { recipients: number; subaccount?: string | undefined }[],
  lookup: (ref: string) => Promise<SubaccountQuotaRules | null>,
): Promise<RateLimitRequest[]> {
  let total = 0;
  const bySubaccount = new Map<string, number>();
  for (const send of sends) {
    total += send.recipients;
    if (send.subaccount !== undefined) {
      bySubaccount.set(send.subaccount, (bySubaccount.get(send.subaccount) ?? 0) + send.recipients);
    }
  }
  const requests = [emailSendQuota(auth, total)];
  for (const [ref, recipients] of bySubaccount) {
    const subaccount = await lookup(ref);
    if (subaccount) {
      requests.push(...subaccountSendQuotas(subaccount, auth.organizationId, recipients));
    }
  }
  return requests;
}

/**
 * Charges `requests` in order, all or nothing: when one denies, those already charged are given
 * back. Returns the denying decision (`null` when everything was charged).
 */
export async function consumeAll(
  limiter: RateLimiter,
  requests: readonly RateLimitRequest[],
): Promise<RateLimitDecision | null> {
  const charged: RateLimitRequest[] = [];
  for (const request of requests) {
    const decision = await limiter.consume(request);
    if (!decision.allowed) {
      await refundAll(limiter, charged);
      return decision;
    }
    charged.push(request);
  }
  return null;
}

/** Gives back every request `consumeAll` charged. */
export async function refundAll(
  limiter: RateLimiter,
  requests: readonly RateLimitRequest[],
): Promise<void> {
  for (const request of requests) await limiter.refund(request);
}

/**
 * The segment quota an SMS is charged against: the organization's for live keys (per second and
 * per day), the environment's own daily quota for sandbox keys.
 */
export function smsSendQuota(
  auth: { organizationId: string; environmentId: string; mode: string },
  segments: number,
): RateLimitRequest {
  return auth.mode === "sandbox"
    ? {
        buckets: ["sms.sandbox_segments.day"],
        subject: auth.environmentId,
        organizationId: auth.organizationId,
        cost: segments,
      }
    : {
        buckets: ["sms.segments.second", "sms.segments.day"],
        subject: auth.organizationId,
        organizationId: auth.organizationId,
        cost: segments,
      };
}

/**
 * Messages per organization to one number (live only): a form looping one-time codes to a
 * number, or pumping traffic through it, stops here. The number is hashed into the subject.
 */
export function smsRecipientQuota(
  auth: { organizationId: string },
  phoneNumber: string,
): RateLimitRequest {
  const hashed = createHash("sha256").update(phoneNumber).digest("hex").slice(0, 32);
  return {
    buckets: ["sms.recipient.hour"],
    subject: `${auth.organizationId}:${hashed}`,
    organizationId: auth.organizationId,
  };
}

/** Hashes a destination (phone number or email address) into an environment-scoped subject. */
function destinationSubject(environmentId: string, destination: string): string {
  const hashed = createHash("sha256").update(destination).digest("hex").slice(0, 32);
  return `${environmentId}:${hashed}`;
}

/** Verify: codes sent to one destination of an environment (each send, resends included). */
export function verifyDestinationQuota(
  auth: { organizationId: string; environmentId: string },
  destination: string,
): RateLimitRequest {
  return {
    buckets: ["verify.destination.window"],
    subject: destinationSubject(auth.environmentId, destination),
    organizationId: auth.organizationId,
  };
}

/** Verify: checks of one destination's codes. */
export function verifyCheckQuota(
  auth: { organizationId: string; environmentId: string },
  destination: string,
): RateLimitRequest {
  return {
    buckets: ["verify.check.destination.hour"],
    subject: destinationSubject(auth.environmentId, destination),
    organizationId: auth.organizationId,
  };
}

/** Verify: an organization's codes from coss.com's shared numbers. */
export function verifySharedSmsQuota(auth: { organizationId: string }): RateLimitRequest {
  return {
    buckets: ["verify.shared_sms.day"],
    subject: auth.organizationId,
    organizationId: auth.organizationId,
  };
}
