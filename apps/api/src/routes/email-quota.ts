import { findSubaccount } from "@coss/email";
import { type SendEmailRequestOutput, uniqueRecipientCount } from "@coss/email/schemas";
import { emailSendQuotas, type RateLimitRequest } from "@coss/ratelimit";
import type { AppEnv } from "../types.ts";

/**
 * What a send (or a batch) is charged: the organization's recipient quota, then the quotas the
 * customer set on each sub-account it names (`emailSendQuotas`). Charge them with `consumeAll`.
 */
export function sendQuotaRequests(
  auth: AppEnv["Variables"]["auth"],
  emails: readonly SendEmailRequestOutput[],
): Promise<RateLimitRequest[]> {
  return emailSendQuotas(
    auth,
    emails.map((params) => ({
      recipients: uniqueRecipientCount(params),
      subaccount: params.subaccount,
    })),
    (ref) =>
      findSubaccount({
        organizationId: auth.organizationId,
        environmentId: auth.environmentId,
        ref,
      }),
  );
}
