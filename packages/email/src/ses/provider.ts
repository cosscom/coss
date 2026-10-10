import type { Body } from "@aws-sdk/client-sesv2";
import type { EmailProvider, OutboundEmail, SendResult } from "../provider.ts";
import { parseEmailAddress } from "../schemas.ts";
import { isSesError, type SesApi, type SesConfig, tenantNameFor } from "./api.ts";
import { encodeAddress } from "./mime.ts";

/** Only tag set on SES messages: maps delivery events back to the email (never customer tags). */
export const EMAIL_ID_TAG = "coss_email_id";
const THROTTLE_RETRIES = 2;

/** Each address once across to → cc → bcc, as SES counts every listed address. */
function destination(message: OutboundEmail) {
  const seen = new Set<string>();
  const unique = (list: string[]) =>
    list.filter((value) => {
      const key = parseEmailAddress(value).address.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return {
    ToAddresses: unique(message.to).map(encodeAddress),
    CcAddresses: unique(message.cc).map(encodeAddress),
    BccAddresses: unique(message.bcc).map(encodeAddress),
  };
}

/** Sends through SES v2 with the organization's tenant and the shared configuration set. */
export class SesEmailProvider implements EmailProvider {
  readonly name = "ses";
  readonly #api: SesApi;
  readonly #config: SesConfig;
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(
    api: SesApi,
    config: SesConfig,
    opts: { sleep?: (ms: number) => Promise<void> } = {},
  ) {
    this.#api = api;
    this.#config = config;
    this.#sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async send(message: OutboundEmail): Promise<SendResult> {
    const body: Body = {};
    if (message.html !== null) body.Html = { Data: message.html, Charset: "UTF-8" };
    if (message.text !== null) body.Text = { Data: message.text, Charset: "UTF-8" };
    const input = {
      FromEmailAddress: encodeAddress(message.from),
      Destination: destination(message),
      ReplyToAddresses: message.replyTo.map(encodeAddress),
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: "UTF-8" },
          Body: body,
          Headers: Object.entries(message.headers).map(([Name, Value]) => ({ Name, Value })),
        },
      },
      ConfigurationSetName: this.#config.configurationSet,
      TenantName: tenantNameFor(this.#config.tenantPrefix, message.organizationId),
      EmailTags: [{ Name: EMAIL_ID_TAG, Value: message.emailId }],
    };
    for (let attempt = 0; ; attempt++) {
      try {
        const { MessageId } = await this.#api.sendEmail(input);
        if (!MessageId) throw new Error("SES accepted the email without a message id.");
        return { providerMessageId: MessageId };
      } catch (error) {
        // Throttled requests were rejected before sending, so they are safe to retry.
        if (!isSesError(error, "TooManyRequestsException") || attempt >= THROTTLE_RETRIES) {
          throw error;
        }
        await this.#sleep(200 * 2 ** attempt);
      }
    }
  }
}
