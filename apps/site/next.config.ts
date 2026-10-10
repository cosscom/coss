import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import { DEV_DASHBOARD_ORIGIN } from "./src/lib/site.ts";

const nextConfig: NextConfig = {
  // Internal packages ship TypeScript source (no build step).
  transpilePackages: ["@coss/ui"],
  // Twoslash drives the TypeScript compiler while MDX compiles; it must not be bundled.
  serverExternalPackages: ["typescript"],
  // In production the dashboard's zone serves /api/auth on the same origin.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [{ source: "/api/auth/:path*", destination: `${DEV_DASHBOARD_ORIGIN}/api/auth/:path*` }];
  },
};

// Collections are declared with `fumadocs-mdx/macro` (src/lib/collections.ts); global MDX options
// (Shiki, Twoslash) live in source.config.ts. The macro transform only touches modules importing it.
const withMDX = createMDX();

export default withMDX(nextConfig);
