/**
 * Base Better Auth options shared by every process (dashboard, public API, scripts, `auth` CLI).
 * Must stay free of Next.js imports — apps/web appends `nextCookies()` in its own instance.
 * Must not import "server-only" (it breaks the `auth` CLI loader).
 */
import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { db } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import * as schema from "@coss/db/schema";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { admin, organization, twoFactor } from "better-auth/plugins";
import {
  API_KEY_NAME_MAX_LENGTH,
  API_KEY_PERMISSIONS,
  API_KEY_VISIBLE_CHARACTERS,
} from "./constants.ts";
import { INVITABLE_ORG_ROLES, isOrgRole, orgAc, orgRoles } from "./permissions.ts";
import { validateOrgSlug } from "./slugs.ts";

/** Better Auth model name -> TypeID prefix. */
const MODEL_ID_PREFIX: Record<string, string> = {
  user: ID_PREFIXES.user,
  session: ID_PREFIXES.session,
  account: ID_PREFIXES.account,
  verification: ID_PREFIXES.verification,
  organization: ID_PREFIXES.organization,
  member: ID_PREFIXES.member,
  invitation: ID_PREFIXES.invitation,
  apikey: ID_PREFIXES.apiKey,
  twoFactor: ID_PREFIXES.twoFactor,
  passkey: ID_PREFIXES.passkey,
};

export function generateAuthId({ model }: { model: string }): string {
  const prefix = MODEL_ID_PREFIX[model];
  if (!prefix) {
    console.warn(`[auth] No id prefix registered for model "${model}"; using "id_".`);
    return newId("id");
  }
  return newId(prefix);
}

/** Dev-only "email" delivery: logs links to the server console. Refuses to run in production. */
function logDevEmail(kind: string, to: string, url: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(`[auth] No email delivery configured for "${kind}" in production.`);
  }
  console.info(`\n[auth] ${kind} for ${to}:\n  ${url}\n`);
}

function assertValidOrgSlug(slug: string | undefined): void {
  if (slug === undefined) return;
  const error = validateOrgSlug(slug);
  if (error) throw new APIError("BAD_REQUEST", { message: error });
}

/**
 * Endpoints that add, change or remove a sign-in factor. An impersonating admin must not be able
 * to enroll a factor the real user doesn't know about (or remove theirs), so these refuse
 * impersonation sessions — like live API keys (`liveKeyRestriction` in apps/web).
 */
const FACTOR_MANAGEMENT_PATHS: ReadonlySet<string> = new Set([
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/verify-totp", // with a session, this is the step that turns TOTP on
  "/two-factor/get-totp-uri",
  "/two-factor/generate-backup-codes",
  "/passkey/generate-register-options",
  "/passkey/verify-registration",
  "/passkey/update-passkey",
  "/passkey/delete-passkey",
]);

/** Origin of the dashboard, which hosts /api/auth (also the WebAuthn origin and RP ID). */
const dashboardUrl = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL) : undefined;

/**
 * Better Auth's passkey plugin verifies assertions with `requireUserVerification: false`. A
 * passkey sign-in skips the TOTP challenge, so it must prove both possession and the user
 * (biometric or PIN) — reject any ceremony the authenticator didn't user-verify.
 */
function assertUserVerified(userVerified: boolean): void {
  if (!userVerified) {
    throw new APIError("UNAUTHORIZED", {
      message: "Your passkey must verify you with a PIN, fingerprint or face to be used here.",
    });
  }
}

export const authOptions = {
  appName: "COSS",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
  database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
  advanced: {
    database: { generateId: generateAuthId },
  },
  emailAndPassword: {
    enabled: true,
    // v0: sign-up does not require verification (accepts sign-up email enumeration).
    requireEmailVerification: false,
    // `url` is Better Auth's /api/auth/reset-password/:token, which checks the token and redirects
    // to the client's `redirectTo` (the dashboard's /reset-password) with `?token=` or `?error=`.
    sendResetPassword: async ({ user, url }) => {
      logDevEmail("Reset password", user.email, url);
    },
    // Reset links expire after Better Auth's default of one hour. A reset signs out every session,
    // including any opened with the old (possibly compromised) password.
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    // Off: a verification link must never create a session, which would skip the TOTP challenge.
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      logDevEmail("Verify email", user.email, url);
    },
  },
  // Block these HTTP routes (server-side `auth.api.*` calls still work). API keys are only
  // created/listed/revoked through our server code so every key gets an environment binding.
  disabledPaths: [
    "/api-key/create",
    "/api-key/update",
    "/api-key/get",
    "/api-key/list",
    "/api-key/delete",
    "/organization/update",
    "/admin/remove-user",
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!FACTOR_MANAGEMENT_PATHS.has(ctx.path)) return;
      const session = await getSessionFromCtx(ctx);
      if (session?.session.impersonatedBy) {
        throw new APIError("FORBIDDEN", {
          message: "Two-factor settings and passkeys can't be changed while impersonating a user.",
        });
      }
    }),
  },
  plugins: [
    organization({
      ac: orgAc,
      roles: orgRoles,
      creatorRole: "owner",
      disableOrganizationDeletion: true,
      schema: {
        organization: {
          additionalFields: {
            // Members without TOTP are sent to /settings until they set it up (apps/web
            // `requireOrgMember`). Written only by `setOrganizationTwoFactorRequired` (@coss/tenancy).
            requireTwoFactor: {
              type: "boolean",
              required: false,
              defaultValue: false,
              input: false,
            },
          },
        },
      },
      // Our custom generateId makes invitation ids predictable, so Better Auth requires a verified
      // email to read/accept invitations. Keep it explicit; NEVER disable while sign-up is unverified.
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async ({ id, email, organization: org, role }) => {
        const url = `${process.env.BETTER_AUTH_URL ?? ""}/accept-invitation/${id}`;
        logDevEmail(`Invitation to ${org.name} as ${role}`, email, url);
      },
      organizationHooks: {
        beforeCreateOrganization: async ({ organization: org }) => {
          assertValidOrgSlug(org.slug);
        },
        beforeUpdateOrganization: async ({ organization: org }) => {
          assertValidOrgSlug(org.slug);
        },
        // The invite/update-role HTTP endpoints accept arbitrary role strings; only allow
        // canonical role names so Better Auth and `orgRoleCan` always agree on privileges.
        beforeCreateInvitation: async ({ invitation }) => {
          if (!(INVITABLE_ORG_ROLES as readonly string[]).includes(invitation.role)) {
            throw new APIError("BAD_REQUEST", { message: "Role must be admin or member." });
          }
        },
        // Better Auth cancels invitations in any status, which would rewrite an accepted (or
        // already canceled) one; only pending invitations can be canceled.
        beforeCancelInvitation: async ({ invitation }) => {
          if (invitation.status !== "pending") {
            throw new APIError("BAD_REQUEST", { message: "This invitation is no longer pending." });
          }
        },
        beforeUpdateMemberRole: async ({ newRole }) => {
          if (!newRole.split(",").every(isOrgRole)) {
            throw new APIError("BAD_REQUEST", { message: "Unknown role." });
          }
        },
      },
    }),
    admin(),
    twoFactor({
      // Only TOTP (authenticator apps) and backup codes: there is no email/SMS OTP delivery.
      // Enabling needs the password and a verified code; disabling needs the password and a
      // fresh session. Sign-in challenges lock the account for 15 min after 10 failed codes.
      issuer: "COSS",
    }),
    passkey({
      rpName: "COSS",
      rpID: dashboardUrl?.hostname,
      origin: dashboardUrl?.origin,
      // Discoverable credentials power the "Sign in with a passkey" button and autofill.
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      registration: {
        afterVerification: ({ verification }) =>
          assertUserVerified(verification.registrationInfo?.userVerified ?? false),
      },
      authentication: {
        afterVerification: ({ verification }) =>
          assertUserVerified(verification.authenticationInfo.userVerified),
      },
    }),
    apiKey({
      // Keys belong to the organization (referenceId = organization id), not to their creator.
      references: "organization",
      requireName: true,
      maximumNameLength: API_KEY_NAME_MAX_LENGTH,
      startingCharactersConfig: { shouldStore: true, charactersLength: API_KEY_VISIBLE_CHARACTERS },
      // Built-in limiter defaults to 10 requests/day per key. Rate limiting will live in our API.
      rateLimit: { enabled: false },
      // Environment binding lives in our `environment_api_key` table (metadata is client-writable).
      enableMetadata: false,
      // Stored on the key at creation, so adding a resource here needs a backfill for existing
      // keys (see migrations 0004 and 0006) or they get a 403 from the new endpoints.
      permissions: { defaultPermissions: API_KEY_PERMISSIONS },
    }),
  ],
} satisfies BetterAuthOptions;
