/**
 * The hub's Better Auth options: its own accounts, in its own database (`src/db`), like coss.com's
 * dashboard but separate from it. Free of Next.js imports and of "server-only" (the `auth` CLI
 * loads this file to generate the schema); `src/lib/auth.ts` appends `nextCookies()`.
 */
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client.ts";
import * as schema from "../db/schema/index.ts";

const publicUrl = process.env.HUB_PUBLIC_URL ?? "http://localhost:3004";

/** GitHub sign-in, when both of its values are set (contributors keep their GitHub identity). */
function socialProviders(): NonNullable<BetterAuthOptions["socialProviders"]> {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  if (process.env.HUB_GITHUB_CLIENT_ID && process.env.HUB_GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: process.env.HUB_GITHUB_CLIENT_ID,
      clientSecret: process.env.HUB_GITHUB_CLIENT_SECRET,
    };
  }
  return providers;
}

export const authOptions = {
  appName: "coss.com hub",
  baseURL: publicUrl,
  secret: process.env.HUB_AUTH_SECRET,
  trustedOrigins: [publicUrl],
  database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
  emailAndPassword: {
    enabled: true,
    // The hub has no mailer yet: an address is taken at its word until it does.
    requireEmailVerification: false,
  },
  socialProviders: socialProviders(),
  account: {
    accountLinking: { enabled: true, requireLocalEmailVerified: true, updateUserInfoOnLink: false },
  },
  // Account changes happen through the hub's own onboarding and settings, never the raw routes
  // (the same rule as coss.com's dashboard). Server-side `auth.api.*` still works.
  disabledPaths: [
    "/update-user",
    "/change-email",
    "/change-password",
    "/delete-user",
    "/list-sessions",
    "/revoke-session",
    "/revoke-sessions",
    "/revoke-other-sessions",
    "/list-accounts",
    "/unlink-account",
  ],
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  plugins: [],
} satisfies BetterAuthOptions;
