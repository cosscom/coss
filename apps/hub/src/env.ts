import { sentryEnvShape } from "@coss/observability/env";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validated when the server starts (src/instrumentation.ts). Images are built once and configured
 * per stage at runtime (SKIP_ENV_VALIDATION at build), so nothing here is inlined.
 */
export const env = createEnv({
  server: {
    // The hub's own accounts (Better Auth, `src/lib/auth-options.ts`) in its own database.
    HUB_DATABASE_URL: z.url(),
    HUB_AUTH_SECRET: z.string().min(32),
    HUB_PUBLIC_URL: z.url().default("http://localhost:3004"),
    // GitHub sign-in: both or neither.
    HUB_GITHUB_CLIENT_ID: z.string().min(1).optional(),
    HUB_GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    // The software factory approved Prompt Requests are sent to: Devin's API, or a fake that
    // plays a build through in half a minute.
    HUB_FACTORY: z.enum(["fake", "devin"]).default("fake"),
    DEVIN_API_KEY: z.string().min(1).optional(),
    DEVIN_API_URL: z.url().default("https://api.devin.ai/v1"),
    // Triage of new Prompt Requests (enough context to build, or ask the author): a decision
    // model on the Vercel AI Gateway (jev, the same as content screening's), or a word-count fake.
    HUB_TRIAGE: z.enum(["fake", "ai"]).default("fake"),
    SCREENING_MODEL: z.string().min(1).default("typesafe-ai/jev"),
    AI_GATEWAY_API_KEY: z.string().min(1).optional(),
    // Errors of the hub's server.
    ...sentryEnvShape,
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});

if (!process.env.SKIP_ENV_VALIDATION) {
  if (Boolean(env.HUB_GITHUB_CLIENT_ID) !== Boolean(env.HUB_GITHUB_CLIENT_SECRET)) {
    throw new Error("HUB_GITHUB_CLIENT_ID and HUB_GITHUB_CLIENT_SECRET go together.");
  }
  if (env.HUB_FACTORY === "devin" && !env.DEVIN_API_KEY) {
    throw new Error("HUB_FACTORY=devin requires DEVIN_API_KEY.");
  }
  if (env.HUB_TRIAGE === "ai" && !env.AI_GATEWAY_API_KEY) {
    throw new Error("HUB_TRIAGE=ai requires AI_GATEWAY_API_KEY.");
  }
}
