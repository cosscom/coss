/**
 * Error monitoring (Sentry). Imported first by src/index.ts; reads `process.env` directly
 * (src/env.ts validates the same variables right after). Without SENTRY_DSN nothing is reported.
 */
import { sentryConfig, sentryOptions } from "@coss/observability";
import * as Sentry from "@sentry/bun";

const config = sentryConfig(process.env);
if (config) {
  Sentry.init({
    ...sentryOptions(config, "smtp"),
    release: process.env.SENTRY_RELEASE || undefined,
    integrations: [
      // Packages log failures they handle with console.error: each becomes an event.
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],
  });
}
