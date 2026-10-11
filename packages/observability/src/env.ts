/**
 * Environment variables of error and performance monitoring (Sentry), for each server's t3-env
 * schema. Imports only zod: the servers read them before anything else is imported.
 */
import { z } from "zod";

export const sentryEnvShape = {
  // The service's Sentry project DSN. Unset: nothing is reported (local development, CI).
  SENTRY_DSN: z.url().optional(),
  // The stage (`production`, `staging`, …). Defaults to NODE_ENV.
  SENTRY_ENVIRONMENT: z.string().min(1).max(64).optional(),
  // Share of requests/runs traced (0–1). Defaults to DEFAULT_TRACES_SAMPLE_RATE.
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
};

export type SentryEnv = {
  SENTRY_DSN?: string | undefined;
  SENTRY_ENVIRONMENT?: string | undefined;
  SENTRY_TRACES_SAMPLE_RATE?: number | undefined;
};
