import { emailWorkerEnvShape } from "@coss/email/env";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Validated at start (src/index.ts). Tests never import this; they call the jobs directly. */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    ...emailWorkerEnvShape,
    // Decrypts webhook signing secrets: 32 bytes, base64 (same value as the dashboard's).
    WEBHOOK_SECRETS_KEY: z
      .string()
      .refine((value) => Buffer.from(value, "base64").length === 32, "Must be 32 bytes, base64."),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
