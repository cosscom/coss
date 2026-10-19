/** Sends through Twilio, as the organization's subaccount (its messaging service and number). */
import { failureFor } from "../failures.ts";
import {
  type OutboundSms,
  type SmsProvider,
  SmsRejectedError,
  type SmsSendResult,
  UncertainSendError,
} from "../provider.ts";
import type { TwilioApi } from "./api.ts";
import { TWILIO_PROVIDER } from "./callbacks.ts";
import { TwilioApiError, TwilioNetworkError } from "./client.ts";

/** Twilio refuses with 429 before creating anything: retried this many times, then refused. */
const THROTTLE_RETRIES = 3;

export class TwilioSmsProvider implements SmsProvider {
  readonly name = TWILIO_PROVIDER;
  readonly #api: TwilioApi;
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(api: TwilioApi, opts: { sleep?: (ms: number) => Promise<void> } = {}) {
    this.#api = api;
    this.#sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async send(message: OutboundSms): Promise<SmsSendResult> {
    if (!message.route?.accountSid) {
      throw new SmsRejectedError(
        { code: "sender_unavailable", message: "The sending number has no SMS account." },
        null,
      );
    }
    for (let attempt = 0; ; attempt++) {
      try {
        const result = await this.#api.sendMessage({
          accountSid: message.route.accountSid,
          to: message.to,
          from: message.from,
          body: message.body,
          messagingServiceSid: message.route.messagingServiceSid,
          statusCallback: message.statusCallbackUrl,
        });
        return { providerMessageId: result.sid };
      } catch (error) {
        if (error instanceof TwilioNetworkError) {
          throw new UncertainSendError(error.message, { cause: error });
        }
        if (!(error instanceof TwilioApiError)) throw error;
        if (error.status === 429 && attempt < THROTTLE_RETRIES) {
          await this.#sleep(500 * 2 ** attempt);
          continue;
        }
        // Twilio may have created the message before failing: never send it again.
        if (error.status >= 500) throw new UncertainSendError(error.message, { cause: error });
        throw new SmsRejectedError(failureFor(error.code), error.code);
      }
    }
  }
}
