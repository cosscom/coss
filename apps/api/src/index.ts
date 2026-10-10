/** Server entry: `bun src/index.ts`. Validates the environment, serves the API, drains on SIGTERM. */
import { closeDb } from "@coss/db";
import { createRateLimitRuntime } from "@coss/ratelimit";
import { parseSecretsKey } from "@coss/webhooks";
import { createApp } from "./app.ts";
import { env } from "./env.ts";
import { createDefaultEmailRuntime } from "./runtime.ts";
import { startServer } from "./server.ts";

const email = createDefaultEmailRuntime(env);
const rateLimits = createRateLimitRuntime(env);
await rateLimits.ready();

const app = createApp({
  emailService: email.emailService,
  domainDeps: email.domainDeps,
  webhookDeps: {
    secretsKey: parseSecretsKey(env.WEBHOOK_SECRETS_KEY),
    allowInsecureUrls: process.env.NODE_ENV !== "production",
  },
  publicUrl: env.API_PUBLIC_URL,
  rateLimiter: rateLimits.limiter,
  clientIp: rateLimits.clientIp,

  corsOrigins: env.API_CORS_ORIGINS,
});

const server = startServer({
  fetch: app.fetch,
  port: env.API_PORT,
  onDrained: async () => {
    await Promise.all([closeDb(), rateLimits.limiter.close()]);
  },
});
console.info(`[api] listening on ${server.url}`);

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.info(`[api] ${signal}: draining in-flight requests…`);
    void server.shutdown().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error("[api] shutdown failed:", error);
        process.exit(1);
      },
    );
  });
}
