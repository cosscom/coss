import { emailEnvShape } from "@coss/email/env";
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
    // Encrypts webhook signing secrets at rest: 32 bytes, base64 (`openssl rand -base64 32`).
    WEBHOOK_SECRETS_KEY: base64Key(32),
    // Server Actions encrypt closed-over variables with this key; every instance of a stage must
    // share it. Without it, each build embeds its own random key. Builds don't need it; production
    // servers refuse to start without it (src/instrumentation.ts).
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: base64Key(16, 24, 32).optional(),
    // Proxies in front of the app that append to X-Forwarded-For (CloudFront → ALB: 2). 0 trusts
    // no forwarded address (local development).
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
