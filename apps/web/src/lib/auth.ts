import "server-only";
import { authOptions } from "@coss/auth/options";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

/**
 * The dashboard's Better Auth instance: the shared options plus `nextCookies()`, which lets
 * server actions set auth cookies. It must stay the last plugin.
 */
export const auth = betterAuth({
  ...authOptions,
  plugins: [...authOptions.plugins, nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
