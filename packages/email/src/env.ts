/**
 * Environment variables of the email runtime, for each app's t3-env schema. Imports only zod:
 * app env modules (and `next.config.ts`) load it before anything touches the database.
 */
import { z } from "zod";

/** Values of `EMAIL_PROVIDER`: the provider used by live (production) environments. */
export const EMAIL_PROVIDERS = ["fake", "ses"] as const;

export type EmailProviderName = (typeof EMAIL_PROVIDERS)[number];

/** SES tenant names are `<prefix>-<organization id>` and at most 64 characters. */
export const SES_TENANT_PREFIX_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export const emailEnvShape = {
  // Provider for live environments. Sandbox environments always use the fake provider.
  EMAIL_PROVIDER: z.enum(EMAIL_PROVIDERS).default("fake"),
  // Required with EMAIL_PROVIDER=ses (printed by `bun run ses:bootstrap`). AWS credentials come
  // from the default provider chain (env vars, profile, or the instance/task role).
  AWS_REGION: z.string().optional(),
  SES_CONFIGURATION_SET: z.string().optional(),
  SES_TENANT_PREFIX: z.string().regex(SES_TENANT_PREFIX_PATTERN).optional(),
};

/** Only the worker consumes delivery events. */
export const emailWorkerEnvShape = {
  ...emailEnvShape,
  SES_EVENTS_QUEUE_URL: z.url().optional(),
};

export type EmailEnv = {
  EMAIL_PROVIDER: EmailProviderName;
  AWS_REGION?: string | undefined;
  SES_CONFIGURATION_SET?: string | undefined;
  SES_TENANT_PREFIX?: string | undefined;
};
