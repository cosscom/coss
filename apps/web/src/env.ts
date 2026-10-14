import { billingEnvShape } from "@coss/billing/env";
import { emailEnvShape } from "@coss/email/env";
import { hookEnvShape } from "@coss/hooks/env";
import { sentryEnvShape } from "@coss/observability/env";
import { rateLimitEnvShape } from "@coss/ratelimit/env";
import { riskEnvShape } from "@coss/risk/env";
import { webhookEnvShape } from "@coss/webhooks/env";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** A base64 key of one of `lengths` bytes (`openssl rand -base64 32`). */
function base64Key(...lengths: number[]) {
  return z
    .string()
    .refine(
      (value) => lengths.includes(Buffer.from(value, "base64").length),
      `Must be ${lengths.join(", ")} bytes, base64.`,
    );
}

/**
 * Validated when the server starts (src/instrumentation.ts) and when next.config loads. Builds set
 * SKIP_ENV_VALIDATION: images are built once and configured per stage at runtime, so nothing here
 * is inlined into the bundle (no NEXT_PUBLIC_ variables).
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    // Public origin of the API, shown in the quick-start snippets.
    API_PUBLIC_URL: z.url(),
    ...emailEnvShape,
    ...rateLimitEnvShape,
    ...webhookEnvShape,
    // Where the Hooks portal is served ("Open portal" links).
    ...hookEnvShape,
    // Keys risk's memory; the dashboard hashes identifiers when it records feedback. Required in
    // production (src/instrumentation.ts).
    ...riskEnvShape,
    // Payment provider of new billing accounts (`fake` or `stripe`), Checkout and the Customer
    // Portal; the Stripe webhook route verifies signatures with STRIPE_WEBHOOK_SECRET.
    ...billingEnvShape,
    // Server Actions encrypt closed-over variables with this key; every instance of a stage must
    // share it. Without it, each build embeds its own random key. Builds don't need it; production
    // servers refuse to start without it (src/instrumentation.ts).
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: base64Key(16, 24, 32).optional(),
    // Proxies in front of the app that append to X-Forwarded-For (CloudFront → ALB: 2). 0 trusts
    // no forwarded address (local development).
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    // Cloudflare Turnstile on sign-up, sign-in and password reset (both or neither; required in
    // production, see src/instrumentation.ts). The site key is public: pages pass it to the
    // widget. The secret key is read by @coss/auth (`captcha` plugin).
    TURNSTILE_SITE_KEY: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    // Sign-in with Google / GitHub (OAuth clients whose callback is
    // `${BETTER_AUTH_URL}/api/auth/callback/<provider>`). Read by @coss/auth; each provider is on
    // when both of its values are set (src/instrumentation.ts refuses half of a pair).
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    // Error and performance monitoring of the dashboard's server and, through /api/monitoring,
    // of browsers on both zones (dashboard and site).
    ...sentryEnvShape,
    // A live environment of COSS's own organization (the worker sends account emails from it):
    // admins can't suspend that organization.
    NOTIFICATIONS_ENVIRONMENT_ID: z.string().startsWith("env_").optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
