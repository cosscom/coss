import { emailEnvShape } from "@coss/email/env";
import { sentryEnvShape } from "@coss/observability/env";
import { rateLimitEnvShape } from "@coss/ratelimit/env";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const production = process.env.NODE_ENV === "production";
const port = z.coerce.number().int().min(1).max(65_535);

/** Validated at server start (src/index.ts). Tests never import this; they use `createSmtpRelay()`. */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    // `@coss/tenancy` (API key authentication) loads Better Auth's options.
    BETTER_AUTH_SECRET: z.string().min(32, "Generate one with `openssl rand -base64 32`."),
    BETTER_AUTH_URL: z.url(),
    // The relay's public name: the greeting and the certificate's name (production smtp.coss.com).
    SMTP_HOSTNAME: production ? z.string().min(1) : z.string().min(1).default("localhost"),
    // Ports the process listens on (unprivileged; the load balancer maps 465 and 587 onto them).
    SMTP_IMPLICIT_TLS_PORT: port.default(2465),
    SMTP_STARTTLS_PORT: port.default(2587),
    // Production: an exportable ACM certificate, exported at start and every 12 hours with this
    // passphrase. Elsewhere: SMTP_TLS_CERT_FILE/SMTP_TLS_KEY_FILE, or a self-signed certificate.
    SMTP_TLS_CERTIFICATE_ARN: production ? z.string().startsWith("arn:") : z.string().optional(),
    SMTP_TLS_PASSPHRASE: production ? z.string().min(4) : z.string().optional(),
    SMTP_TLS_CERT_FILE: z.string().optional(),
    SMTP_TLS_KEY_FILE: z.string().optional(),
    // Origin of open/click tracking links: sends with tracking on are refused without it. The
    // API serves /t/*; locally that's the API on :3001 (production: https://track.cosslinks.com).
    TRACKING_PUBLIC_URL: production ? z.url() : z.url().default("http://localhost:3001"),
    // Which provider live environments use (the sender check needs its name).
    ...emailEnvShape,
    // Rate limits and quotas, counted in Valkey (shared with the API: one budget per key). Client
    // addresses come from the socket (the load balancer preserves them), never from a header.
    VALKEY_URL: production ? rateLimitEnvShape.VALKEY_URL.unwrap() : rateLimitEnvShape.VALKEY_URL,
    VALKEY_CLUSTER: rateLimitEnvShape.VALKEY_CLUSTER,
    RATE_LIMIT_KEY_PREFIX: rateLimitEnvShape.RATE_LIMIT_KEY_PREFIX,
    // Error and performance monitoring; read by src/instrument.ts before this schema runs.
    ...sentryEnvShape,
    // The image's commit (Dockerfile build argument), Sentry's release.
    SENTRY_RELEASE: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
