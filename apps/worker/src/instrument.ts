/**
 * Error monitoring (Sentry). Imported first by src/index.ts, so failures while starting are
 * reported too; reads `process.env` directly (src/env.ts validates the same variables right
 * after). Without SENTRY_DSN nothing is reported.
 */
import { sentryConfig, sentryOptions } from "@coss/observability";
import * as Sentry from "@sentry/bun";

const config = sentryConfig(process.env);
if (config) {
  Sentry.init({
    ...sentryOptions(config, "worker"),
    release: process.env.SENTRY_RELEASE || undefined,
    integrations: [
      // Every package logs failures it handles with console.error (provider errors, webhook
      // deliveries, failed loop runs…): each becomes an event tagged with its loop.
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],
  });
}
