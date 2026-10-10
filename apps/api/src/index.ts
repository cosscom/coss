/** Bun server entry: `bun src/index.ts` serves the default export (`Bun.serve` options). */
import { parseSecretsKey } from "@coss/webhooks";
import { createApp } from "./app.ts";
import { env } from "./env.ts";
import { createDefaultEmailRuntime } from "./runtime.ts";

const email = createDefaultEmailRuntime(env);

const app = createApp({
  emailService: email.emailService,
  domainDeps: email.domainDeps,
  webhookDeps: {
    secretsKey: parseSecretsKey(env.WEBHOOK_SECRETS_KEY),
    allowInsecureUrls: process.env.NODE_ENV !== "production",
  },
  publicUrl: env.API_PUBLIC_URL,
  corsOrigins: env.API_CORS_ORIGINS,
});

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
