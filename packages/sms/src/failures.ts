/**
 * What provider (Twilio) and carrier error codes mean for a message: the failure customers see
 * (`code` and `message`; never the provider's own text, which can name internals) and whether the
 * number goes on the environment's suppression list.
 */
import type { SmsSuppressionReason } from "./schemas.ts";

export type SmsFailure = { code: string; message: string; suppress?: SmsSuppressionReason };

const INVALID_NUMBER: SmsFailure = {
  code: "invalid_number",
  message: "The number can't receive SMS (it doesn't exist, or isn't a mobile number).",
  suppress: "invalid_number",
};

const OPTED_OUT: SmsFailure = {
  code: "opted_out",
  message: "The recipient opted out of messages from this number (they replied STOP).",
  suppress: "opt_out",
};

/** By Twilio error code (https://www.twilio.com/docs/api/errors). */
export const PROVIDER_FAILURES: Readonly<Record<string, SmsFailure>> = {
  "21211": INVALID_NUMBER,
  "21614": INVALID_NUMBER,
  "30005": INVALID_NUMBER,
  "30006": INVALID_NUMBER,
  "21610": OPTED_OUT,
  "21408": {
    code: "country_not_permitted",
    message: "SMS to this country isn't enabled for your organization's sender.",
  },
  "21612": {
    code: "unroutable",
    message: "The message can't be routed from this number to the recipient's carrier.",
  },
  "30003": {
    code: "unreachable",
    message: "The recipient's phone is unreachable (switched off or out of coverage).",
  },
  "30004": {
    code: "blocked",
    message: "The recipient's carrier or the recipient blocked the message.",
  },
  "30007": {
    code: "carrier_filtered",
    message: "The carrier filtered the message as spam or unregistered traffic.",
  },
  "30034": {
    code: "sender_unregistered",
    message: "The sending number isn't registered for US A2P messaging yet.",
  },
  "30032": {
    code: "sender_unregistered",
    message: "The toll-free number isn't verified yet.",
  },
};

export const UNKNOWN_FAILURE: SmsFailure = {
  code: "provider_error",
  message: "The SMS provider couldn't send the message.",
};

export const UNDELIVERED_FAILURE: SmsFailure = {
  code: "undelivered",
  message: "The carrier couldn't deliver the message.",
};

export function failureFor(
  providerErrorCode: string | null | undefined,
  fallback = UNKNOWN_FAILURE,
) {
  return (providerErrorCode && PROVIDER_FAILURES[providerErrorCode]) || fallback;
}
