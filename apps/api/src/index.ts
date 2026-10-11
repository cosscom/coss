/** Server entry: `bun src/index.ts`. Validates the environment, serves the API, drains on SIGTERM. */

// First: monitoring must be set up before the server starts.
import "./instrument.ts";
import { closeDb } from "@coss/db";
import { startJobBoss } from "@coss/db/jobs";
import { createEmailService } from "@coss/email";
import { ensureEmailDispatchQueue, pgBossDispatchQueue } from "@coss/email/dispatch";
import { createLogWriter } from "@coss/logs";
import { createRateLimitRuntime } from "@coss/ratelimit";
import { parseSecretsKey } from "@coss/webhooks";
import * as Sentry from "@sentry/bun";
import { createApp } from "./app.ts";
import { env } from "./env.ts";
import { createDefaultEmailRuntime } from "./runtime.ts";
import { startServer } from "./server.ts";

const publicUrl = env.API_PUBLIC_URL ?? `http://localhost:${env.API_PORT}`;
const email = createDefaultEmailRuntime(env);
// Sends only enqueue (the worker dispatches).
const jobs = await startJobBoss();
await ensureEmailDispatchQueue(jobs);
const rateLimits = createRateLimitRuntime(env);
await rateLimits.ready();
const logWriter = createLogWriter();

const app = createApp({
  emailService: createEmailService({
    liveProvider: email.liveProvider,
    sandboxProvider: email.sandboxProvider,
    queue: pgBossDispatchQueue(jobs),
    trackingBaseUrl: publicUrl,
  }),
  domainDeps: email.domainDeps,
  webhookDeps: {
    secretsKey: parseSecretsKey(env.WEBHOOK_SECRETS_KEY),
    allowInsecureUrls: process.env.NODE_ENV !== "production",
  },
  publicUrl: env.API_PUBLIC_URL,
  rateLimiter: rateLimits.limiter,
  clientIp: rateLimits.clientIp,

  corsOrigins: env.API_CORS_ORIGINS,
  logWriter,
});

const server = startServer({
  fetch: app.fetch,
  port: env.API_PORT,
  onDrained: async () => {
    await Promise.all([jobs.stop({ graceful: true }), logWriter.close()]);
    await Promise.all([closeDb(), rateLimits.limiter.close(), Sentry.close(2_000)]);
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
