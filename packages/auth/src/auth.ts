import { betterAuth } from "better-auth";
import { authOptions } from "./options.ts";

/**
 * Base Better Auth instance: used by the public API, @coss/tenancy, scripts and the `auth` CLI.
 * The dashboard builds its own instance from `authOptions` with `nextCookies()` appended.
 */
export const auth = betterAuth(authOptions);

export type Auth = typeof auth;
