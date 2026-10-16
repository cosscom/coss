/** For the `auth` CLI only (`bun run auth:generate`): the instance without Next.js cookies. */
import { betterAuth } from "better-auth";
import { authOptions } from "./auth-options.ts";

export const auth = betterAuth(authOptions);
