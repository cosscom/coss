/**
 * Server entry: `bun src/index.ts`. Validates the environment, serves SMTP on two ports
 * (implicit TLS and STARTTLS), drains on SIGTERM.
 */

// First: monitoring must be set up before anything else runs.
import "./instrument.ts";
import { createUsageGate, planRateLimits } from "@coss/billing";
import { closeDb } from "@coss/db";
import { startJobBoss } from "@coss/db/jobs";
import { createEmailService } from "@coss/email";
import { ensureEmailDispatchQueue, pgBossDispatchQueue } from "@coss/email/dispatch";
import { createEmailRuntime, emailRuntimeConfig } from "@coss/email/runtime";
import { createLogWriter } from "@coss/logs";
import { createRateLimitRuntime } from "@coss/ratelimit";
import * as Sentry from "@sentry/bun";
import { env } from "./env.ts";
import { createSmtpRelay } from "./server.ts";
import {
  exportAcmCertificate,
  readTlsFiles,
  selfSignedCertificate,
  TLS_RELOAD_INTERVAL_MS,
  type TlsMaterial,
} from "./tls.ts";

const production = process.env.NODE_ENV === "production";

async function loadTls(): Promise<TlsMaterial> {
  if (env.SMTP_TLS_CERTIFICATE_ARN && env.SMTP_TLS_PASSPHRASE) {
    return exportAcmCertificate({
      arn: env.SMTP_TLS_CERTIFICATE_ARN,
      passphrase: env.SMTP_TLS_PASSPHRASE,
    });
  }
  if (env.SMTP_TLS_CERT_FILE && env.SMTP_TLS_KEY_FILE) {
    return readTlsFiles(env.SMTP_TLS_CERT_FILE, env.SMTP_TLS_KEY_FILE);
  }
  if (production) throw new Error("SMTP_TLS_CERTIFICATE_ARN is required in production.");
  return selfSignedCertificate(env.SMTP_HOSTNAME);
}

const email = createEmailRuntime(emailRuntimeConfig(env));
// Sends only enqueue (the worker dispatches), exactly like the API's.
const jobs = await startJobBoss();
await ensureEmailDispatchQueue(jobs);
const rateLimits = createRateLimitRuntime(
  {
    VALKEY_URL: env.VALKEY_URL,
    VALKEY_CLUSTER: env.VALKEY_CLUSTER,
    RATE_LIMIT_KEY_PREFIX: env.RATE_LIMIT_KEY_PREFIX,
    TRUSTED_PROXY_COUNT: 1,
  },
  { planRules: (organizationId) => planRateLimits(organizationId) },
);
await rateLimits.ready();
const logWriter = createLogWriter();

const relay = createSmtpRelay({
  hostname: env.SMTP_HOSTNAME,
  tls: await loadTls(),
  emailService: createEmailService({
    liveProvider: email.liveProvider,
    sandboxProvider: email.sandboxProvider,
    queue: pgBossDispatchQueue(jobs),
    billing: createUsageGate(),
  }),
  rateLimiter: rateLimits.limiter,
  logWriter,
  // Plain-text AUTH only on a developer's machine (swaks/telnet without TLS).
  allowInsecureAuth: !production && env.SMTP_HOSTNAME === "localhost",
});
const ports = await relay.listen({
  implicitTls: env.SMTP_IMPLICIT_TLS_PORT,
  startTls: env.SMTP_STARTTLS_PORT,
});
console.info(
  `[smtp] ${env.SMTP_HOSTNAME}: implicit TLS on ${ports.implicitTls}, STARTTLS on ${ports.startTls}`,
);

// ACM renews the certificate ahead of expiry; pick the new one up without a restart.
const reload = setInterval(() => {
  loadTls().then(
    (tls) => relay.updateTls(tls),
    (error: unknown) => console.error("[smtp] reloading the TLS certificate failed:", error),
  );
}, TLS_RELOAD_INTERVAL_MS);
reload.unref();

let stopping: Promise<void> | undefined;
function shutdown(): Promise<void> {
  stopping ??= (async () => {
    clearInterval(reload);
    await relay.shutdown();
    await Promise.all([jobs.stop({ graceful: true }), logWriter.close()]);
    await Promise.all([closeDb(), rateLimits.limiter.close(), Sentry.close(2_000)]);
  })();
  return stopping;
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.info(`[smtp] ${signal}: finishing messages in progress…`);
    void shutdown().then(
      () => process.exit(0),
      (error: unknown) => {
        console.error("[smtp] shutdown failed:", error);
        process.exit(1);
      },
    );
  });
}
