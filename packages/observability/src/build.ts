/**
 * `withSentryConfig` options for the Next.js apps' builds (next.config.ts). Images are built once,
 * so nothing here is stage-specific: the release is the commit (NEXT_DEPLOYMENT_ID) and the DSN is
 * read at runtime. With SENTRY_AUTH_TOKEN (CI and image builds, a BuildKit secret), source maps
 * are uploaded to Sentry and deleted from the build, so browsers never get them; without it
 * (local builds) nothing is uploaded and no source maps are generated.
 */

/** The Sentry organization's slug. */
export const SENTRY_ORG = "coss";

/**
 * Sentry projects (slugs), one per runtime. Both Next.js zones of coss.com report to `web`: the
 * dashboard's server and every browser (the site's browser events arrive through the dashboard's
 * tunnel with the dashboard's DSN).
 */
export const SENTRY_PROJECTS = { web: "web", api: "api", worker: "worker" } as const;

export function sentryBuildOptions() {
  const authToken = process.env.SENTRY_AUTH_TOKEN || undefined;
  return {
    org: process.env.SENTRY_ORG || SENTRY_ORG,
    project: process.env.SENTRY_PROJECT || SENTRY_PROJECTS.web,
    authToken,
    release: { name: process.env.NEXT_DEPLOYMENT_ID || undefined },
    sourcemaps: { disable: !authToken },
    // Readable stack frames for dependencies (Next, React, Base UI) too.
    widenClientFileUpload: true,
    silent: !authToken,
    telemetry: false,
  };
}
