/**
 * Browser monitoring for the dashboard and the site (their `instrumentation-client.ts`). Both are
 * served from coss.com, where the dashboard's /api/monitoring hands out the configuration and
 * relays envelopes to Sentry (src/tunnel.ts). Takes the app's SDK instead of importing one, so this
 * package depends on no framework SDK.
 */
import type { Integration } from "@sentry/core";
import type { SentryConfig } from "./config.ts";
import { type SentryService, sentryOptions } from "./options.ts";
import { SENTRY_TUNNEL_PATH } from "./tunnel.ts";

/** What this needs of `@sentry/nextjs` (or any browser SDK). */
export type BrowserSdk = {
  // biome-ignore lint/suspicious/noExplicitAny: each SDK types its own options.
  init(options: any): unknown;
  browserTracingIntegration(): Integration;
};

function isConfig(value: unknown): value is SentryConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return (
    typeof config.dsn === "string" &&
    typeof config.environment === "string" &&
    typeof config.tracesSampleRate === "number"
  );
}

/**
 * Fetches the configuration and starts the SDK; does nothing while monitoring is off or the
 * configuration can't be loaded. Errors thrown before it resolves (a few milliseconds after the
 * page loads) aren't reported.
 */
export async function initBrowserMonitoring(
  sdk: BrowserSdk,
  service: Extract<SentryService, "web" | "site">,
): Promise<void> {
  let config: unknown;
  try {
    const response = await fetch(SENTRY_TUNNEL_PATH, { credentials: "omit" });
    if (!response.ok) return;
    config = await response.json();
  } catch {
    return;
  }
  if (!isConfig(config)) return;
  sdk.init({
    ...sentryOptions(config, service),
    tunnel: SENTRY_TUNNEL_PATH,
    integrations: [sdk.browserTracingIntegration()],
  });
}
