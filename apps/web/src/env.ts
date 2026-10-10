import { emailEnvShape } from "@coss/email/env";
import { rateLimitEnvShape } from "@coss/ratelimit/env";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    ...emailEnvShape,
    ...rateLimitEnvShape,
    // Encrypts webhook signing secrets at rest: 32 bytes, base64 (`openssl rand -base64 32`).
    WEBHOOK_SECRETS_KEY: z
      .string()
      .refine((value) => Buffer.from(value, "base64").length === 32, "Must be 32 bytes, base64."),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.url(),
  },
  // Server variables are read from process.env; client ones must be referenced literally so
  // Next can inline them into the browser bundle.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
