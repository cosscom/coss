import { createHash } from "node:crypto";
import type { RateLimitRequest } from "./limiter.ts";

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
