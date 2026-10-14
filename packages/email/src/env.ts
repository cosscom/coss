/**
 * Environment variables of the email runtime, for each app's t3-env schema. Imports only zod:
 * app env modules (and `next.config.ts`) load it before anything touches the database.
 */
import { z } from "zod";

/** Values of `EMAIL_PROVIDER`: the provider used by live (production) environments. */
export const EMAIL_PROVIDERS = ["fake", "ses"] as const;

export type EmailProviderName = (typeof EMAIL_PROVIDERS)[number];

/** Values of `TRACKING_DOMAIN_PROVIDER`: what serves custom tracking hostnames over HTTPS. */
export const TRACKING_DOMAIN_PROVIDERS = ["fake", "cloudflare"] as const;

export type TrackingDomainProviderName = (typeof TRACKING_DOMAIN_PROVIDERS)[number];

/** The host customers CNAME their tracking domain to, unless `TRACKING_CNAME_TARGET` says otherwise. */
export const DEFAULT_TRACKING_CNAME_TARGET = "track.cosslinks.com";

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
  // Custom tracking domains: Cloudflare for SaaS custom hostnames on COSS's zone in production
  // (the token and zone id are required with `cloudflare`), an in-memory fake otherwise.
  TRACKING_DOMAIN_PROVIDER: z.enum(TRACKING_DOMAIN_PROVIDERS).default("fake"),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_ZONE_ID: z.string().optional(),
  // The zone's fallback origin, which customers point their tracking CNAME at.
  TRACKING_CNAME_TARGET: z.string().optional(),
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
  TRACKING_DOMAIN_PROVIDER?: TrackingDomainProviderName | undefined;
  CLOUDFLARE_API_TOKEN?: string | undefined;
  CLOUDFLARE_ZONE_ID?: string | undefined;
  TRACKING_CNAME_TARGET?: string | undefined;
};
