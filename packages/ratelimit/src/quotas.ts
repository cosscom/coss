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
