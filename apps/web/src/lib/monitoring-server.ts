import "server-only";
import { sentryConfig, sentryOptions } from "@coss/observability";
import * as Sentry from "@sentry/nextjs";

/**
 * Sentry for the dashboard's server (src/instrumentation.ts), configured at runtime from
 * SENTRY_DSN. The release (the commit) is injected at build time by `withSentryConfig`.
 */
export function initServerMonitoring(): void {
  const config = sentryConfig(process.env);
  if (!config) return;
  Sentry.init({
    ...sentryOptions(config, "web"),
    integrations: [
      // Packages log the failures they handle with console.error (unexpected server action errors,
      // domain provisioning…): each becomes an event with the request's user and organization.
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],
  });
}
