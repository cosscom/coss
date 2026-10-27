import { sentryEnvShape } from "@coss/observability/env";
import { rateLimitEnvShape } from "@coss/ratelimit/env";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validated when the server starts (src/instrumentation.ts). Images are built once and configured
 * per stage at runtime (SKIP_ENV_VALIDATION at build), so nothing here is inlined.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    // The signing page's own rate limits (per session and per client IP), counted in Valkey.
    ...rateLimitEnvShape,
    // Errors of the signing app's server.
    ...sentryEnvShape,
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
