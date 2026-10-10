import { emailEnvShape } from "@coss/email/env";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Validated at server start (src/index.ts). Tests never import this; they use `createApp()`. */
export const env = createEnv({
  server: {
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32, "Generate one with `openssl rand -base64 32`."),
    BETTER_AUTH_URL: z.url(),
    // Public origin of this API (OpenAPI `servers`). Falls back to the request origin when unset.
    API_PUBLIC_URL: z.url().optional(),
    ...emailEnvShape,
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
