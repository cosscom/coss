import { z } from "zod";
import { sentryEnvShape } from "./env.ts";

/** Share of requests/runs traced when `SENTRY_TRACES_SAMPLE_RATE` is unset. */
export const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

/** What an SDK needs to report. Nothing in it is secret: the dashboard hands it to browsers. */
export type SentryConfig = {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
};

/**
 * Reads the Sentry variables from `env` (raw `process.env` is fine: servers set Sentry up before
 * their t3-env schema runs). `null` when no DSN is set or a value is invalid — the app's own
 * schema rejects invalid values right after, so monitoring never stops a server by itself.
 */
export function sentryConfig(env: Record<string, unknown>): SentryConfig | null {
  const values = Object.fromEntries(
    Object.keys(sentryEnvShape).map((key) => [key, env[key] === "" ? undefined : env[key]]),
  );
  const parsed = z.object(sentryEnvShape).safeParse(values);
  if (!parsed.success || !parsed.data.SENTRY_DSN) return null;
  return {
    dsn: parsed.data.SENTRY_DSN,
    environment: parsed.data.SENTRY_ENVIRONMENT ?? (process.env.NODE_ENV || "development"),
    tracesSampleRate: parsed.data.SENTRY_TRACES_SAMPLE_RATE ?? DEFAULT_TRACES_SAMPLE_RATE,
  };
}
