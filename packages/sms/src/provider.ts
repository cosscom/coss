import type { SmsEventDataOutput, SmsEventType, SmsSuppressionReason } from "./schemas.ts";

/** A message ready for a delivery provider (internal, camelCase). */
export type OutboundSms = {
  smsId: string;
  organizationId: string;
  from: string;
  to: string;
  body: string;
  /** Where the provider reports delivery (`null`: it reports synchronously, the fake). */
  statusCallbackUrl: string | null;
  /** The organization's provider account and the messaging service of the sending number. */
  route: { accountSid: string; messagingServiceSid: string | null } | null;
};

/** A delivery event normalized from a provider's own format. */
export type SmsProviderEvent = {
  provider: string;
  /** The provider's own status, e.g. Twilio `undelivered`. */
  providerStatus: string;
  smsId: string;
  providerMessageId: string | null;
  type: SmsEventType;
  occurredAt: Date;
  /** Distinguishes two events of the same type for the same message. */
  sourceId: string;
  data: SmsEventDataOutput;
  /** Add the recipient to the environment's suppression list (an invalid or opted-out number). */
  suppress?: SmsSuppressionReason;
};

export type SmsSendResult = {
  providerMessageId: string;
  /** Events the provider already knows about synchronously (the fake provider). */
  events?: SmsProviderEvent[];
};

/**
 * The provider can't tell whether it accepted the message (a timeout, a dropped connection, a
 * server error): never fail it and never send it again. It stays claimed for the provider's own
 * status callback or the stale-claim sweep.
 */
export class UncertainSendError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UncertainSendError";
  }
}

/** The provider refused the message: certainly not sent. */
export class SmsRejectedError extends Error {
  readonly failure: { code: string; message: string };
  readonly providerErrorCode: string | null;
  readonly suppress: SmsSuppressionReason | undefined;

  constructor(
    failure: { code: string; message: string; suppress?: SmsSuppressionReason },
    providerErrorCode: string | null,
  ) {
    super(failure.message);
    this.name = "SmsRejectedError";
    this.failure = { code: failure.code, message: failure.message };
    this.providerErrorCode = providerErrorCode;
    this.suppress = failure.suppress;
  }
}

/** Delivery seam (fake or Twilio). `send` resolves once the provider accepted the message. */
export interface SmsProvider {
  readonly name: string;
  send(message: OutboundSms): Promise<SmsSendResult>;
}
