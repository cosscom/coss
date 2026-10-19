/** Environment shape of the SMS product (zod only, client-safe). */
import { z } from "zod";

export const SMS_PROVIDERS = ["fake", "twilio"] as const;
export type SmsProviderName = (typeof SMS_PROVIDERS)[number];

/**
 * `SMS_PROVIDER` decides live environments' provider (sandbox ones always use the fake). Twilio
 * needs the parent account's credentials, the ISV primary customer profile its customers' brands
 * are registered under, and the prefix of the subaccounts it creates (one per organization).
 */
export const smsEnvShape = {
  SMS_PROVIDER: z.enum(SMS_PROVIDERS).default("fake"),
  TWILIO_ACCOUNT_SID: z.string().startsWith("AC").optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_PRIMARY_CUSTOMER_PROFILE_SID: z.string().startsWith("BU").optional(),
  SMS_SUBACCOUNT_PREFIX: z.string().min(1).max(40).optional(),
};

export type SmsEnv = {
  SMS_PROVIDER?: SmsProviderName;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PRIMARY_CUSTOMER_PROFILE_SID?: string;
  SMS_SUBACCOUNT_PREFIX?: string;
};
