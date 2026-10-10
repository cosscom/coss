// Order matters: load the root .env, then validate it (t3-env throws on missing variables).
import "./load-root-env.ts";
import "./src/env.ts";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal packages ship TypeScript source (no build step).
  transpilePackages: [
    "@coss/ui",
    "@coss/auth",
    "@coss/tenancy",
    "@coss/db",
    "@coss/email",
    "@coss/webhooks",
  ],
  experimental: {
    // Suppression CSV imports upload up to 2 MB (`import-limits.ts`) plus multipart overhead.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
