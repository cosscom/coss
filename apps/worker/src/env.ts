import { emailWorkerEnvShape } from "@coss/email/env";
import { sentryEnvShape } from "@coss/observability/env";
import { rateLimitEnvShape } from "@coss/ratelimit/env";
import { screeningEnvShape } from "@coss/screening/env";
import { webhookEnvShape } from "@coss/webhooks/env";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Validated at start (src/index.ts). Tests never import this; they call the jobs directly. */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    // The public API serves the tracking URLs embedded by the dispatch worker.
    API_PUBLIC_URL: process.env.NODE_ENV === "production" ? z.url() : z.url().optional(),
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    ...emailWorkerEnvShape,
    // The daily inbound limit per organization (`email.inbound.day`) is counted in Valkey.
    VALKEY_URL: rateLimitEnvShape.VALKEY_URL,
    VALKEY_CLUSTER: rateLimitEnvShape.VALKEY_CLUSTER,
    RATE_LIMIT_KEY_PREFIX: rateLimitEnvShape.RATE_LIMIT_KEY_PREFIX,
    // AI content screening of sampled live emails before they are sent (@coss/screening).
    ...screeningEnvShape,
    // Days of environment logs kept (@coss/logs); expired days are dropped hourly.
    LOG_RETENTION_DAYS: z.coerce.number().int().min(1).max(31).default(30),
    // Reputation notification emails (warnings, suspensions) to organization owners and admins,
    // sent from a live environment of COSS's own organization with an address on one of its
    // verified domains. Unset: printed in development, held (not sent) in production.
    NOTIFICATIONS_ENVIRONMENT_ID: z.string().startsWith("env_").optional(),
    NOTIFICATIONS_FROM: z.string().optional(),
    // The dashboard's origin, for links in notification emails.
    BETTER_AUTH_URL: process.env.NODE_ENV === "production" ? z.url() : z.url().optional(),
    // Decrypts webhook signing secrets (same value as the dashboard's and the API's).
    ...webhookEnvShape,
    // Error monitoring; read by src/instrument.ts before this schema runs.
    ...sentryEnvShape,
    // The image's commit (Dockerfile build argument), Sentry's release.
    SENTRY_RELEASE: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
