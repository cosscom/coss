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
    // Comma-separated browser origins allowed to call /v1 (the docs' API playground).
    API_CORS_ORIGINS: z
      .string()
      .default("https://coss.com")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(
        z.array(
          z.url().refine((origin) => new URL(origin).origin === origin, {
            message: "Use bare origins like https://coss.com (no path or trailing slash).",
          }),
        ),
      ),
    // Encrypts webhook endpoint signing secrets; must be the same value the worker uses.
    WEBHOOK_SECRETS_KEY: z.string().min(1, "Generate one with `openssl rand -base64 32`."),
    ...emailEnvShape,
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
