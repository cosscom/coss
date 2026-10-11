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
  } catch (error) {
    if (!production) throw error;
    console.error("[web] Refusing to start:", error);
    process.exit(1);
  }
  const { initServerMonitoring } = await import("./lib/monitoring-server");
  initServerMonitoring();
}

/** Errors thrown while rendering, in route handlers, server actions and the proxy. */
export const onRequestError = Sentry.captureRequestError;
