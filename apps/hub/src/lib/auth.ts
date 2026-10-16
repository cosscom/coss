import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { authOptions } from "./auth-options.ts";

/** The hub's Better Auth instance: the options plus `nextCookies()`, last, so server actions can set cookies. */
export const auth = betterAuth({
  ...authOptions,
  plugins: [...authOptions.plugins, nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
