/**
 * Background worker: dispatches queued emails, delivers webhooks, re-checks domains, recovers
 * lost or interrupted sends, sends account and reputation emails and (with `EMAIL_PROVIDER=ses`)
 * ingests SES delivery events and received emails. Safe to run several instances.
 */
// First: monitoring reports failures while starting, too.
import "./instrument.ts";
import type { AuthEmailSender } from "@coss/auth/emails";
import { type BillingNotifier, createUsageGate, logBillingNotifier } from "@coss/billing";
import { createBillingRuntime } from "@coss/billing/runtime";
import { closeDb } from "@coss/db";
import { startJobBoss } from "@coss/db/jobs";
import { createEmailService, emailNotifier, notificationEnvironment } from "@coss/email";
import {
  ensureEmailDispatchQueue,
  pgBossDispatchQueue,
  workEmailDispatchQueue,
} from "@coss/email/dispatch";
import { createEmailRuntime, emailRuntimeConfig } from "@coss/email/runtime";
import { createS3Api } from "@coss/email/ses";
import { createRateLimitRuntime } from "@coss/ratelimit";
import { logReputationNotifier, type ReputationNotifier } from "@coss/reputation";
import { screenMessage } from "@coss/screening";
import { createClassifier } from "@coss/screening/runtime";
import { createWebhookSender, parseSecretsKeys } from "@coss/webhooks";
import * as Sentry from "@sentry/bun";
import { env } from "./env.ts";
import { inboundQuota, type SesInboundDeps } from "./inbound.ts";
import { startJobs } from "./jobs.ts";
import { monitoredDispatch } from "./monitoring.ts";
import { createShutdown } from "./shutdown.ts";
import { createSqsApi } from "./sqs.ts";

const config = emailRuntimeConfig(env);
const email = createEmailRuntime(config);
const billing = createBillingRuntime(env);
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
// Receiving: the daily inbound limit per organization, and (SES) the receipt notification queue.
const rateLimits = createRateLimitRuntime({
  VALKEY_URL: env.VALKEY_URL,
  VALKEY_CLUSTER: env.VALKEY_CLUSTER,
  RATE_LIMIT_KEY_PREFIX: env.RATE_LIMIT_KEY_PREFIX,
  TRUSTED_PROXY_COUNT: 1,
});
await rateLimits.ready();
let sesInbound: SesInboundDeps | undefined;
if (config.provider === "ses" && email.inbound && config.inbound?.bucket) {
  if (!env.SES_INBOUND_QUEUE_URL) {
    throw new Error(
      "Receiving with EMAIL_PROVIDER=ses requires SES_INBOUND_QUEUE_URL (see `bun run ses:bootstrap`).",
    );
  }
  sesInbound = {
    sqs: createSqsApi(config.ses.region, env.SES_INBOUND_QUEUE_URL, "ses-inbound"),
    s3: createS3Api(config.ses.region),
    bucket: config.inbound.bucket,
    inbound: {
      store: email.inbound.store,
      managedDomain: email.inbound.managedDomain,
      quota: inboundQuota(rateLimits.limiter),
    },
  };
}
if (!env.NOTIFICATIONS_ENVIRONMENT_ID !== !env.NOTIFICATIONS_FROM) {
  throw new Error("Set both NOTIFICATIONS_ENVIRONMENT_ID and NOTIFICATIONS_FROM, or neither.");
}
// COSS's own organization sends account and notification emails: neither the reputation guard
// nor content screening may suspend it (an admin still can).
const systemEnvironment = env.NOTIFICATIONS_ENVIRONMENT_ID
  ? await notificationEnvironment(env.NOTIFICATIONS_ENVIRONMENT_ID)
  : null;
const systemOrganizationId = systemEnvironment?.organizationId ?? null;
// Email dispatch runs on pg-boss (its own pool, woken by NOTIFY when a send commits).
const jobs = await startJobBoss({ worker: true });
await ensureEmailDispatchQueue(jobs);
const dispatchQueue = pgBossDispatchQueue(jobs);
const emailService = createEmailService({
  liveProvider: email.liveProvider,
  sandboxProvider: email.sandboxProvider,
  queue: dispatchQueue,
  trackingBaseUrl:
    env.TRACKING_PUBLIC_URL ?? env.API_PUBLIC_URL ?? `http://localhost:${env.API_PORT}`,
  // Emails from a domain with an active custom tracking domain are tracked through it.
  trackingDomainProvider: email.trackingHostnames.name,
  screen: classifier
    ? (input) => screenMessage(input, { classifier, systemOrganizationId })
    : undefined,
  screeningFailureAllowlist: systemOrganizationId ? new Set([systemOrganizationId]) : undefined,
  // Internal sends count against their organization's allowance (COSS's own is never capped).
  billing: createUsageGate({ systemOrganizationId }),
});
await workEmailDispatchQueue(jobs, monitoredDispatch(emailService));

// Account emails (verification, password resets, invitations) and reputation notifications go
// out through COSS's own email product. Without a configured environment, reputation
// notifications are printed in development and both are held in production (sent once
// configured); the dashboard prints account email links itself outside production.
let notifier: ReputationNotifier | null = logReputationNotifier;
let billingNotifier: BillingNotifier | null = logBillingNotifier;
let authEmailSender: AuthEmailSender | null = null;
if (systemEnvironment && env.NOTIFICATIONS_FROM) {
  const sender = {
    service: emailService,
    environment: systemEnvironment,
    from: env.NOTIFICATIONS_FROM,
  };
  notifier = emailNotifier(sender);
  billingNotifier = notifier;
  // Their links are secrets: the stored email keeps no body once it is sent.
  authEmailSender = emailNotifier({ ...sender, discardBody: true });
} else if (process.env.NODE_ENV === "production") {
  console.warn(
    "[worker] NOTIFICATIONS_ENVIRONMENT_ID and NOTIFICATIONS_FROM are unset: account emails " +
      "(sign-up verification, password resets, invitations) and reputation notifications are " +
      "held until they are configured.",
  );
  notifier = null;
  billingNotifier = null;
}

const loops = startJobs({
  systemOrganizationId,
  dispatchQueue,
  sesEvents,
  inbound: email.inbound,
  sesInbound,
  signal: controller.signal,
  domains: email.domainDeps,
  email: emailService,
  authEmails: authEmailSender && { sender: authEmailSender },
  notifications: notifier && {
    notifier,
    dashboardUrl: env.BETTER_AUTH_URL ?? "http://localhost:3000",
  },
  webhooks: {
    secretsKeys: parseSecretsKeys(env.WEBHOOK_SECRETS_KEY),
    // The dashboard accepts local endpoints outside production; let them be reached there too.
    send: createWebhookSender({ allowPrivateNetworks: process.env.NODE_ENV !== "production" }),
  },
  logRetentionDays: env.LOG_RETENTION_DAYS,
  billing: {
    providers: billing.providers,
    defaultProvider: billing.defaultProvider,
    dashboardUrl: env.BETTER_AUTH_URL ?? "http://localhost:3000",
    notifier: billingNotifier,
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
  close: async () => {
    await Promise.all([closeDb(), rateLimits.limiter.close()]);
    await Sentry.close(2_000);
  },
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
