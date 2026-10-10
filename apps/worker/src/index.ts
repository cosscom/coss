/**
 * Background worker: dispatches queued emails, delivers webhooks, re-checks domains, recovers
 * lost or interrupted sends and (with `EMAIL_PROVIDER=ses`) ingests SES delivery events. Safe to
 * run several instances.
 */
import { closeDb } from "@coss/db";
import { startJobBoss } from "@coss/db/jobs";
import { createEmailService } from "@coss/email";
import {
  ensureEmailDispatchQueue,
  pgBossDispatchQueue,
  workEmailDispatchQueue,
} from "@coss/email/dispatch";
import { createEmailRuntime, emailRuntimeConfig } from "@coss/email/runtime";
import { createWebhookSender, parseSecretsKey } from "@coss/webhooks";
import { env } from "./env.ts";
import { startJobs } from "./jobs.ts";
import { createShutdown } from "./shutdown.ts";
import { createSqsApi } from "./sqs.ts";

const config = emailRuntimeConfig(env);
const email = createEmailRuntime(config);
const controller = new AbortController();
let sesEvents: Parameters<typeof startJobs>[0]["sesEvents"];
if (config.provider === "ses") {
  if (!env.SES_EVENTS_QUEUE_URL) {
    throw new Error(
      "EMAIL_PROVIDER=ses requires SES_EVENTS_QUEUE_URL (see `bun run ses:bootstrap`).",
    );
  }
  sesEvents = {
    sqs: createSqsApi(config.ses.region, env.SES_EVENTS_QUEUE_URL),
    tenantPrefix: config.ses.tenantPrefix,
  };
}
// Email dispatch runs on pg-boss (its own pool, woken by NOTIFY when a send commits).
const jobs = await startJobBoss({ worker: true });
await ensureEmailDispatchQueue(jobs);
const dispatchQueue = pgBossDispatchQueue(jobs);
await workEmailDispatchQueue(
  jobs,
  createEmailService({
    liveProvider: email.liveProvider,
    sandboxProvider: email.sandboxProvider,
    queue: dispatchQueue,
    trackingBaseUrl: env.API_PUBLIC_URL ?? `http://localhost:${env.API_PORT}`,
  }),
);

const loops = startJobs({
  dispatchQueue,
  sesEvents,
  signal: controller.signal,
  domains: email.domainDeps,
  webhooks: {
    secretsKey: parseSecretsKey(env.WEBHOOK_SECRETS_KEY),
    // The dashboard accepts local endpoints outside production; let them be reached there too.
    send: createWebhookSender({ allowPrivateNetworks: process.env.NODE_ENV !== "production" }),
  },
});
console.info(`[worker] started (email-dispatch, ${loops.map((loop) => loop.name).join(", ")})`);

const shutdown = createShutdown({
  controller,
  loops: [
    ...loops,
    { name: "email-dispatch", stop: () => jobs.stop({ graceful: true, timeout: 30_000 }) },
  ],
  close: closeDb,
});
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.info(`[worker] ${signal}: finishing current runs…`);
    void shutdown().then(
      () => {
        console.info("[worker] stopped");
        process.exit(0);
      },
      (error: unknown) => {
        console.error("[worker] shutdown failed:", error);
        process.exit(1);
      },
    );
  });
}
