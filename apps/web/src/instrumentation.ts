import * as Sentry from "@sentry/nextjs";

/**
 * Runs once when a server starts. The standalone server doesn't load next.config.ts, so this is
 * where a deployed dashboard validates its environment. A misconfigured production task exits at
 * boot (Next would otherwise keep running and fail every request).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // `next build` loads this too; builds are configured per stage only when they start.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const production = process.env.NODE_ENV === "production";
  try {
    const { env } = await import("./env");
    // Every instance must decrypt the others' Server Action payloads, and the key shouldn't be the
    // one embedded in the image (`openssl rand -base64 32`, one per stage).
    if (production && !process.env.SKIP_ENV_VALIDATION && !env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY) {
      throw new Error("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY is required in production.");
    }
    // Without the secret key, @coss/auth leaves sign-up and sign-in open to bots.
    if (Boolean(env.TURNSTILE_SITE_KEY) !== Boolean(env.TURNSTILE_SECRET_KEY)) {
      throw new Error("Set both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, or neither.");
    }
    if (production && !process.env.SKIP_ENV_VALIDATION && !env.TURNSTILE_SECRET_KEY) {
      throw new Error("TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are required in production.");
    }
    // Must match the API's, or feedback from the dashboard would teach a different memory.
    if (production && !process.env.SKIP_ENV_VALIDATION && !env.RISK_HASH_KEY) {
      throw new Error("RISK_HASH_KEY is required in production.");
    }
    // Checkout and the portal need the secret key; Stripe's webhooks need the signing secret.
    if (
      env.BILLING_PROVIDER === "stripe" &&
      (!env.STRIPE_SECRET_KEY || (production && !env.STRIPE_WEBHOOK_SECRET))
    ) {
      throw new Error(
        "BILLING_PROVIDER=stripe requires STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET in production).",
      );
    }
  } catch (error) {
    if (!production) throw error;
    console.error("[web] Refusing to start:", error);
    process.exit(1);
  }
  const { initServerMonitoring } = await import("./lib/monitoring-server");
  initServerMonitoring();
  // Connect to Valkey now rather than on the first rate-limited request: the client never queues
  // commands while connecting, so that request would get its buckets' outage policy (sign-in and
  // other auth buckets deny). The limiter is a process-wide singleton, shared with route handlers.
  const { rateLimitRuntime } = await import("./lib/rate-limit-runtime");
  rateLimitRuntime();
}

/** Errors thrown while rendering, in route handlers, server actions and the proxy. */
export const onRequestError = Sentry.captureRequestError;
