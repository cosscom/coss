/** Server entry: `bun src/index.ts`. Validates the environment, serves the API, drains on SIGTERM. */

// First: monitoring must be set up before the server starts.
import "./instrument.ts";
import { createPlanGate, createUsageGate, planRateLimits } from "@coss/billing";
import { closeDb } from "@coss/db";
import { startJobBoss } from "@coss/db/jobs";
import { createEmailService } from "@coss/email";
import { ensureEmailDispatchQueue, pgBossDispatchQueue } from "@coss/email/dispatch";
import { createLogWriter } from "@coss/logs";
import { createRateLimitRuntime } from "@coss/ratelimit";
import { createRiskDeps } from "@coss/risk/runtime";
import { parseSecretsKeys } from "@coss/webhooks";
import * as Sentry from "@sentry/bun";
import { createApp } from "./app.ts";
import { env } from "./env.ts";
import { createDefaultEmailRuntime } from "./runtime.ts";
import { startServer } from "./server.ts";

const publicUrl = env.API_PUBLIC_URL ?? `http://localhost:${env.API_PORT}`;
// Plans: features and resource limits, Free's capped allowance, and plan rate limits.
const plans = createPlanGate();
const email = createDefaultEmailRuntime(env, { plans });
// Sends only enqueue (the worker dispatches).
const jobs = await startJobBoss();
await ensureEmailDispatchQueue(jobs);
const rateLimits = createRateLimitRuntime(env, {
  planRules: (organizationId) => planRateLimits(organizationId),
});
await rateLimits.ready();
const logWriter = createLogWriter();

const app = createApp({
  emailService: createEmailService({
    liveProvider: email.liveProvider,
    sandboxProvider: email.sandboxProvider,
    queue: pgBossDispatchQueue(jobs),
    trackingBaseUrl: env.TRACKING_PUBLIC_URL ?? publicUrl,
    trackingDomainProvider: email.trackingHostnames.name,
    billing: createUsageGate(),
  }),
  domainDeps: email.domainDeps,
  webhookDeps: {
    secretsKeys: parseSecretsKeys(env.WEBHOOK_SECRETS_KEY),
    allowInsecureUrls: process.env.NODE_ENV !== "production",
    plans,
  },
  // Velocity counters share the rate limiter's Valkey connection.
  riskDeps: createRiskDeps(env, { valkey: rateLimits.valkey }),
  plans,
  publicUrl: env.API_PUBLIC_URL,
  portalUrl: env.PORTAL_PUBLIC_URL ?? null,
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
