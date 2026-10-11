import { emailWorkerEnvShape } from "@coss/email/env";
import { screeningEnvShape } from "@coss/screening/env";
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
    // AI content screening of sampled live emails before they are sent (@coss/screening).
    ...screeningEnvShape,
    // Days of environment logs kept (@coss/logs); expired days are dropped hourly.
    LOG_RETENTION_DAYS: z.coerce.number().int().min(1).max(31).default(30),
    // Decrypts webhook signing secrets: 32 bytes, base64 (same value as the dashboard's).
    WEBHOOK_SECRETS_KEY: z
      .string()
      .refine((value) => Buffer.from(value, "base64").length === 32, "Must be 32 bytes, base64."),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
