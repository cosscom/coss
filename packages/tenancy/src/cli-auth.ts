/**
 * The CLI's sign-in (`coss login`): redeeming the one-time code the dashboard's approval page gave
 * it. Everything the approval checked is checked again here, against the state at exchange time
 * (the code may have waited minutes in a terminal): the user, their membership and role, the
 * organization's SSO and two-factor requirements, and the environment. The dashboard's token route
 * then creates the key (`createEnvironmentApiKey`, which Better Auth re-checks) and records it.
 * CLI keys are personal keys of the user who approved them: their usage is that member's spend.
 */
import { consumeCliAuthorizationCode } from "@coss/auth/cli";
import { orgAccess } from "@coss/auth/org-access";
import { db, schema } from "@coss/db";
import { eq } from "drizzle-orm";
import { keyCreationAllowed } from "./api-keys.ts";
import { getEnvironmentById } from "./environments.ts";
import { getMembership } from "./organizations.ts";
import type { Environment } from "./types.ts";

const { user } = schema;

export type CliGrant = {
  user: { id: string; email: string };
  organizationId: string;
  environment: Environment;
  /** The new key's name, as approved. */
  name: string;
};

export type CliRedemption =
  | { ok: true; grant: CliGrant }
  /** `invalid_grant`: unknown, used or expired code, or the wrong verifier. */
  | { ok: false; error: "invalid_grant" | "access_denied"; message: string };

const denied = (message: string): CliRedemption => ({ ok: false, error: "access_denied", message });

export async function redeemCliAuthorization(
  input: { code: string; codeVerifier: string },
  now = new Date(),
): Promise<CliRedemption> {
  const payload = await consumeCliAuthorizationCode(input, now);
  if (!payload) {
    return {
      ok: false,
      error: "invalid_grant",
      message: "This sign-in has expired. Run `coss login` again.",
    };
  }

  const [account] = await db
    .select({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      banned: user.banned,
      banExpires: user.banExpires,
      twoFactorEnabled: user.twoFactorEnabled,
    })
    .from(user)
    .where(eq(user.id, payload.userId))
    .limit(1);
  if (!account) return denied("This account no longer exists.");
  if (account.banned && (!account.banExpires || account.banExpires > now)) {
    return denied("This account is banned.");
  }

  const membership = await getMembership({
    userId: account.id,
    organizationSlug: payload.organizationSlug,
  });
  if (!membership || membership.organization.id !== payload.organizationId) {
    return denied("You are no longer a member of this organization.");
  }
  if (membership.suspended) {
    return denied("This organization is suspended, so new API keys can't be created.");
  }
  const access = orgAccess(membership, {
    session: { ssoProviderId: payload.ssoProviderId, impersonatedBy: null },
    user: { twoFactorEnabled: account.twoFactorEnabled },
  });
  if (access.kind === "redirect") {
    return denied(
      access.to.startsWith("/sso")
        ? "This organization requires single sign-on: sign in with SSO, then run `coss login` again."
        : "This organization requires two-factor authentication: turn it on, then run `coss login` again.",
    );
  }

  const environment = await getEnvironmentById({
    organizationId: membership.organization.id,
    environmentId: payload.environmentId,
  });
  if (!environment) return denied("This environment no longer exists.");
  if (
    !keyCreationAllowed({
      role: membership.member.role,
      environment,
      ownerUserId: account.id,
      creatorUserId: account.id,
    })
  ) {
    return denied("Your role in this organization can't create API keys in this environment.");
  }
  if (environment.mode === "live" && !account.emailVerified) {
    return denied("Verify your email address before creating live keys.");
  }

  return {
    ok: true,
    grant: {
      user: { id: account.id, email: account.email },
      organizationId: membership.organization.id,
      environment,
      name: payload.name,
    },
  };
}
