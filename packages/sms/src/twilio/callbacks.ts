/** Twilio's status and inbound callbacks, normalized. */
import { failureFor, UNDELIVERED_FAILURE } from "../failures.ts";
import type { SmsProviderEvent } from "../provider.ts";
import type { InboundSms } from "../received.ts";

export const TWILIO_PROVIDER = "twilio";

/** The statuses coss.com records (Twilio's `queued`, `sending`, `accepted`… are progress only). */
const TYPES: Readonly<Record<string, SmsProviderEvent["type"]>> = {
  sent: "sms.sent",
  delivered: "sms.delivered",
  undelivered: "sms.undelivered",
  failed: "sms.failed",
};

/**
 * A status callback (`MessageStatus`, `MessageSid`, `ErrorCode`) as an event, `null` for statuses
 * coss.com doesn't record. `smsId` comes from the callback URL coss.com gave Twilio.
 */
export function statusCallbackEvent(
  smsId: string,
  params: Readonly<Record<string, string>>,
  receivedAt: Date = new Date(),
): SmsProviderEvent | null {
  const status = params.MessageStatus ?? params.SmsStatus ?? "";
  const type = TYPES[status];
  if (!type) return null;
  const errorCode = params.ErrorCode || null;
  const failing = type === "sms.undelivered" || type === "sms.failed";
  const failure = failing
    ? failureFor(errorCode, type === "sms.undelivered" ? UNDELIVERED_FAILURE : undefined)
    : null;
  return {
    provider: TWILIO_PROVIDER,
    providerStatus: status,
    smsId,
    providerMessageId: params.MessageSid ?? null,
    type,
    occurredAt: receivedAt,
    sourceId: `${status}:${errorCode ?? ""}`,
    data: failure
      ? {
          failure: { code: failure.code, message: failure.message },
          provider_error_code: errorCode,
        }
      : {},
    ...(failure?.suppress ? { suppress: failure.suppress } : {}),
  };
}

/** An inbound message callback, `null` when it lacks what coss.com needs. */
export function inboundMessage(
  params: Readonly<Record<string, string>>,
  receivedAt: Date = new Date(),
): InboundSms | null {
  const { MessageSid: sid, From: from, To: to } = params;
  if (!sid || !from || !to) return null;
  return {
    provider: TWILIO_PROVIDER,
    providerMessageId: sid,
    from,
    to,
    body: params.Body ?? "",
    occurredAt: receivedAt,
  };
}
