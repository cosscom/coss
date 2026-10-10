/**
 * Background worker: sends scheduled emails, delivers webhooks, re-checks domains, recovers
 * interrupted sends and (with `EMAIL_PROVIDER=ses`) ingests SES delivery events. Safe to run
 * several instances.
 */
import { closeDb } from "@coss/db";
import { createEmailRuntime, emailRuntimeConfig } from "@coss/email/runtime";
import { createWebhookSender, parseSecretsKey } from "@coss/webhooks";
import { env } from "./env.ts";
import { startJobs } from "./jobs.ts";
import { createSqsApi } from "./sqs.ts";

const config = emailRuntimeConfig(env);
const email = createEmailRuntime(config);
const shutdownSignal = new AbortController();
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
    signal: shutdownSignal.signal,
  };
}
const loops = startJobs({
  sesEvents,
  domains: email.domainDeps,
  email: email.emailService,
  webhooks: {
    secretsKey: parseSecretsKey(env.WEBHOOK_SECRETS_KEY),
    // The dashboard accepts local endpoints outside production; let them be reached there too.
    send: createWebhookSender({ allowPrivateNetworks: process.env.NODE_ENV !== "production" }),
  },
});
console.info(`[worker] started (${loops.map((loop) => loop.name).join(", ")})`);

let stopping = false;
async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  console.info(`[worker] ${signal}: finishing current runs…`);
  // Ends the SQS long poll; unrecorded messages simply become visible again.
  shutdownSignal.abort();
  await Promise.all(loops.map((loop) => loop.stop()));
  await closeDb();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
