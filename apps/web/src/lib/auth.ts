import "server-only";
import { setOrgAuditRecorder } from "@coss/auth/audit";
import { authOptions } from "@coss/auth/options";
import { recordOrgAuditEvent } from "@coss/logs";
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

// Invitations accepted or rejected on Better Auth's own routes land in the org's audit log too.
setOrgAuditRecorder((record) => recordOrgAuditEvent(record));

export type Session = typeof auth.$Infer.Session;
