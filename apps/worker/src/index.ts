/**
 * Background worker: dispatches queued emails, delivers webhooks, re-checks domains, recovers
 * lost or interrupted sends, sends account and reputation emails and (with `EMAIL_PROVIDER=ses`)
 * ingests SES delivery events. Safe to run several instances.
 */
import type { AuthEmailSender } from "@coss/auth/emails";
import { closeDb } from "@coss/db";
import { startJobBoss } from "@coss/db/jobs";
import { createEmailService, emailNotifier, notificationEnvironment } from "@coss/email";
import {
  ensureEmailDispatchQueue,
  pgBossDispatchQueue,
  workEmailDispatchQueue,
} from "@coss/email/dispatch";
import { createEmailRuntime, emailRuntimeConfig } from "@coss/email/runtime";
import { logReputationNotifier, type ReputationNotifier } from "@coss/reputation";
import { screenMessage } from "@coss/screening";
import { createClassifier } from "@coss/screening/runtime";
import { createWebhookSender, parseSecretsKey } from "@coss/webhooks";
import { env } from "./env.ts";
import { startJobs } from "./jobs.ts";
import { createShutdown } from "./shutdown.ts";
import { createSqsApi } from "./sqs.ts";

const config = emailRuntimeConfig(env);
const email = createEmailRuntime(config);
const classifier = createClassifier(env);
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
const emailService = createEmailService({
  liveProvider: email.liveProvider,
  sandboxProvider: email.sandboxProvider,
  queue: dispatchQueue,
  trackingBaseUrl: env.API_PUBLIC_URL ?? `http://localhost:${env.API_PORT}`,
  screen: classifier ? (input) => screenMessage(input, { classifier }) : undefined,
});
await workEmailDispatchQueue(jobs, emailService);

// Account emails (verification, password resets, invitations) and reputation notifications go
// out through COSS's own email product. Without a configured environment, reputation
// notifications are printed in development and both are held in production (sent once
// configured); the dashboard prints account email links itself outside production.
if (!env.NOTIFICATIONS_ENVIRONMENT_ID !== !env.NOTIFICATIONS_FROM) {
  throw new Error("Set both NOTIFICATIONS_ENVIRONMENT_ID and NOTIFICATIONS_FROM, or neither.");
}
let notifier: ReputationNotifier | null = logReputationNotifier;
let authEmailSender: AuthEmailSender | null = null;
if (env.NOTIFICATIONS_ENVIRONMENT_ID && env.NOTIFICATIONS_FROM) {
  const sender = {
    service: emailService,
    environment: await notificationEnvironment(env.NOTIFICATIONS_ENVIRONMENT_ID),
    from: env.NOTIFICATIONS_FROM,
  };
  notifier = emailNotifier(sender);
  // Their links are secrets: the stored email keeps no body once it is sent.
  authEmailSender = emailNotifier({ ...sender, discardBody: true });
} else if (process.env.NODE_ENV === "production") {
  console.warn(
    "[worker] NOTIFICATIONS_ENVIRONMENT_ID and NOTIFICATIONS_FROM are unset: account emails " +
      "(sign-up verification, password resets, invitations) and reputation notifications are " +
      "held until they are configured.",
  );
  notifier = null;
}

const loops = startJobs({
  dispatchQueue,
  sesEvents,
  signal: controller.signal,
  domains: email.domainDeps,
  email: emailService,
  authEmails: authEmailSender && { sender: authEmailSender },
  notifications: notifier && {
    notifier,
    dashboardUrl: env.BETTER_AUTH_URL ?? "http://localhost:3000",
  },
  webhooks: {
    secretsKey: parseSecretsKey(env.WEBHOOK_SECRETS_KEY),
    // The dashboard accepts local endpoints outside production; let them be reached there too.
    send: createWebhookSender({ allowPrivateNetworks: process.env.NODE_ENV !== "production" }),
  },
});
console.info(
  `[worker] started (email-dispatch, ${loops.map((loop) => loop.name).join(", ")}; ` +
    `content screening: ${env.SCREENING_CLASSIFIER === "ai" ? env.SCREENING_MODEL : env.SCREENING_CLASSIFIER})`,
);

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
