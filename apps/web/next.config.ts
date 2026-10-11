// Order matters: load the root .env, then validate it (t3-env throws on missing variables).
import "./load-root-env.ts";
import "./src/env.ts";
import path from "node:path";
import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { sentryBuildOptions } from "@coss/observability/build";
import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers.ts";

// Read when `next build`/`next dev` loads this file: the standalone server reuses the serialized
// result and never runs it again, so nothing stage-specific may be decided here.
const dev = process.env.NODE_ENV === "development";

/** apps/site in `next dev` (in production the load balancer routes its paths on coss.com). */
const DEV_SITE_ORIGIN = "http://localhost:3002";

const nextConfig: NextConfig = {
  // Internal packages ship TypeScript source (no build step).
  transpilePackages: [
    "@coss/ui",
    "@coss/auth",
    "@coss/tenancy",
    "@coss/reputation",
    "@coss/db",
    "@coss/email",
    "@coss/webhooks",
    "@coss/ratelimit",
    "@coss/screening",
    "@coss/versioning",
    "@coss/observability",
  ],
  // A self-contained server (.next/standalone) for the container image. Tracing starts at the
  // monorepo root so workspace packages and Bun's isolated node_modules (node_modules/.bun) are
  // copied in; Next runs from cwd = apps/web, which next.config compiles relative to.
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  // Same build → same id on every instance. The image build passes the commit as
  // NEXT_DEPLOYMENT_ID, which also turns on Next's version-skew protection.
  generateBuildId: async () => process.env.NEXT_DEPLOYMENT_ID || null,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders({ dev }) }];
  },
  async redirects() {
    // In production `/` is the site's landing page. Locally, the dashboard's port opens the dashboard.
    if (!dev) return [];
    return [
      { source: "/", destination: DASHBOARD_PATH, permanent: false },
      // The site's legal pages (linked from sign-up), on its own port locally.
      { source: "/legal/:path*", destination: `${DEV_SITE_ORIGIN}/legal/:path*`, permanent: false },
    ];
  },
  async rewrites() {
    // The site owns the icon (see ZONE_ROUTES); locally it runs on its own port.
    if (!dev) return [];
    return [{ source: "/icon.svg", destination: `${DEV_SITE_ORIGIN}/icon.svg` }];
  },
  experimental: {
    // Suppression CSV imports upload up to 2 MB (`import-limits.ts`) plus multipart overhead.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

// Injects the release, uploads source maps (with SENTRY_AUTH_TOKEN) and instruments the server.
// Sentry itself is configured at runtime: src/instrumentation.ts and src/instrumentation-client.ts.
export default withSentryConfig(nextConfig, sentryBuildOptions());
