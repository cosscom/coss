import "server-only";
import { setOrgAuditRecorder } from "@coss/auth/audit";
import { setMembershipLimitResolver } from "@coss/auth/limits";
import { authOptions } from "@coss/auth/options";
import { setSignUpRiskAssessor } from "@coss/auth/risk";
import { recordOrgAuditEvent } from "@coss/logs";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { memberLimit } from "./billing";

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
// Accepting an invitation adds a member: the organization's plan limits how many it may have.
setMembershipLimitResolver(memberLimit);
// COSS's own sign-ups go through COSS Risk when `RISK_SIGNUP_ENVIRONMENT_ID` is set. Loaded on the
// first sign-up: risk's dependencies (and validated env) stay out of everything importing auth.
setSignUpRiskAssessor(async (input) => (await import("./risk")).assessSignUp(input));

export type Session = typeof auth.$Infer.Session;
