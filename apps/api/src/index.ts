/** Bun server entry: `bun src/index.ts` serves the default export (`Bun.serve` options). */
import { startJobBoss } from "@coss/db/jobs";
import { createEmailService } from "@coss/email";
import { ensureEmailDispatchQueue, pgBossDispatchQueue } from "@coss/email/dispatch";
import { parseSecretsKey } from "@coss/webhooks";
import { createApp } from "./app.ts";
import { env } from "./env.ts";
import { createDefaultEmailRuntime } from "./runtime.ts";

const email = createDefaultEmailRuntime(env);
// Sends only enqueue (the worker dispatches), sharing the `@coss/db` pool.
const jobs = await startJobBoss();
await ensureEmailDispatchQueue(jobs);

const app = createApp({
  emailService: createEmailService({
    liveProvider: email.liveProvider,
    sandboxProvider: email.sandboxProvider,
    queue: pgBossDispatchQueue(jobs),
  }),
  domainDeps: email.domainDeps,
  webhookDeps: {
    secretsKey: parseSecretsKey(env.WEBHOOK_SECRETS_KEY),
    allowInsecureUrls: process.env.NODE_ENV !== "production",
  },
  publicUrl: env.API_PUBLIC_URL,
});

export default {
  port: env.API_PORT,
  fetch: app.fetch,
};
