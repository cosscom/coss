/**
 * The fake provider: every sandbox environment's, and live environments' outside production
 * (`SMS_PROVIDER=fake`). It sends nothing and answers the simulator numbers (`SMS_SIMULATOR`) as
 * a carrier would; every other number is delivered.
 */
import { randomUUID } from "node:crypto";
import { failureFor } from "../failures.ts";
import {
  type OutboundSms,
  type SmsProvider,
  type SmsProviderEvent,
  SmsRejectedError,
  type SmsSendResult,
} from "../provider.ts";
import { SMS_SIMULATOR } from "../schemas.ts";

export const FAKE_SMS_PROVIDER = "fake";

/** The answer of the simulator's reply number (`SMS_SIMULATOR.reply`). */
export const SIMULATED_REPLY = "Thanks! This is a simulated reply.";

export class FakeSmsProvider implements SmsProvider {
  readonly name = FAKE_SMS_PROVIDER;
  /** The last 100 messages handed over, for tests and local development. */
  readonly sent: OutboundSms[] = [];
  readonly #log: boolean;
  readonly #fail: ((message: OutboundSms) => Error | null) | undefined;

  constructor(opts: { log?: boolean; fail?: (message: OutboundSms) => Error | null } = {}) {
    this.#log = opts.log ?? true;
    this.#fail = opts.fail;
  }

  async send(message: OutboundSms): Promise<SmsSendResult> {
    const failure = this.#fail?.(message);
    if (failure) throw failure;
    if (message.to === SMS_SIMULATOR.invalidNumber) {
      throw new SmsRejectedError(failureFor("21211"), "21211");
    }
    if (message.to === SMS_SIMULATOR.optedOut) {
      throw new SmsRejectedError(failureFor("21610"), "21610");
    }
    this.sent.push(message);
    if (this.sent.length > 100) this.sent.shift();
    if (this.#log) {
      console.info(`[sms:fake] ${message.from} → ${message.to}: ${message.body}`);
    }
    const providerMessageId = `fake-${randomUUID()}`;
    const event = (
      type: SmsProviderEvent["type"],
      providerStatus: string,
      data: SmsProviderEvent["data"] = {},
    ): SmsProviderEvent => ({
      provider: FAKE_SMS_PROVIDER,
      providerStatus,
      smsId: message.smsId,
      providerMessageId,
      type,
      occurredAt: new Date(),
      sourceId: providerStatus,
      data,
    });
    const filtered = message.to === SMS_SIMULATOR.carrierFiltered;
    return {
      providerMessageId,
      events: [
        event("sms.sent", "sent"),
        filtered
          ? event("sms.undelivered", "undelivered", {
              failure: { code: failureFor("30007").code, message: failureFor("30007").message },
              provider_error_code: "30007",
            })
          : event("sms.delivered", "delivered"),
      ],
    };
  }
}
