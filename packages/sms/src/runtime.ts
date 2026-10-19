/** Builds the SMS providers and the Twilio API from the environment (`@coss/sms/env`'s shape). */
import type { SmsEnv } from "./env.ts";
import type { SmsProvider } from "./provider.ts";
import { FakeSmsProvider } from "./providers/fake.ts";
import { createTwilioApi, type TwilioApi } from "./twilio/api.ts";
import { createTwilioClient } from "./twilio/client.ts";
import { FakeTwilioApi } from "./twilio/fake.ts";
import { TwilioSmsProvider } from "./twilio/provider.ts";

export type SmsRuntime = {
  /** `fake` or `twilio`: the provider of live environments and of new numbers. */
  provider: "fake" | "twilio";
  liveProvider: SmsProvider;
  /** Sandbox environments always simulate. */
  sandboxProvider: SmsProvider;
  /** Accounts, numbers and registrations (the fake answers like Twilio, statelessly). */
  twilio: TwilioApi;
  /** Names the subaccounts coss.com creates (`<prefix>-<organization id>`). */
  subaccountPrefix: string;
};

export function createSmsRuntime(env: SmsEnv, opts: { fetch?: typeof fetch } = {}): SmsRuntime {
  const sandboxProvider = new FakeSmsProvider();
  const subaccountPrefix = env.SMS_SUBACCOUNT_PREFIX ?? "coss";
  if (env.SMS_PROVIDER !== "twilio") {
    return {
      provider: "fake",
      liveProvider: sandboxProvider,
      sandboxProvider,
      twilio: new FakeTwilioApi(),
      subaccountPrefix,
    };
  }
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("SMS_PROVIDER=twilio needs TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }
  const twilio = createTwilioApi(
    createTwilioClient({
      credentials: { accountSid: env.TWILIO_ACCOUNT_SID, authToken: env.TWILIO_AUTH_TOKEN },
      fetch: opts.fetch,
    }),
    { primaryCustomerProfileSid: env.TWILIO_PRIMARY_CUSTOMER_PROFILE_SID ?? null },
  );
  return {
    provider: "twilio",
    liveProvider: new TwilioSmsProvider(twilio),
    sandboxProvider,
    twilio,
    subaccountPrefix,
  };
}
