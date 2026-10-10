import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { EMAIL_PROVIDERS } from "./email-service.ts";

/** Validated at server start (src/index.ts). Tests never import this; they use `createApp()`. */
export const env = createEnv({
  server: {
    API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32, "Generate one with `openssl rand -base64 32`."),
    BETTER_AUTH_URL: z.url(),
    // Public origin of this API (OpenAPI `servers`). Falls back to the request origin when unset.
    API_PUBLIC_URL: z.url().optional(),
    // Provider for live environments. Sandbox environments always use the fake provider.
    EMAIL_PROVIDER: z.enum(EMAIL_PROVIDERS).default("fake"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
