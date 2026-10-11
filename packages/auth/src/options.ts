/**
 * Base Better Auth options shared by every process (dashboard, public API, scripts, `auth` CLI).
 * Must stay free of Next.js imports — apps/web appends `nextCookies()` in its own instance.
 * Must not import "server-only" (it breaks the `auth` CLI loader).
 */
import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import { sso } from "@better-auth/sso";
import { db } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import * as schema from "@coss/db/schema";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { admin, captcha, organization, twoFactor } from "better-auth/plugins";
import { and, count, eq } from "drizzle-orm";
import {
  API_KEY_NAME_MAX_LENGTH,
  API_KEY_PERMISSIONS,
  API_KEY_VISIBLE_CHARACTERS,
} from "./constants.ts";
import {
  cachedMailDomainCheck,
  canonicalEmail,
  DISPOSABLE_EMAIL,
  isDisposableDomain,
  signUpEmailRejection,
} from "./email-guard.ts";
import { INVITABLE_ORG_ROLES, isOrgRole, orgAc, orgRoles } from "./permissions.ts";
import { validateOrgName, validateOrgSlug } from "./slugs.ts";
import { emailDomainOf, resolveSsoUser, ssoProviderIdOfPath } from "./sso.ts";

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
  ssoProvider: ID_PREFIXES.ssoProvider,
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

/** Validates the name/slug of an organization being created or updated (absent = unchanged). */
function assertValidOrg(org: { name?: string | undefined; slug?: string | undefined }): void {
  const error =
    (org.name === undefined ? null : validateOrgName(org.name)) ??
    (org.slug === undefined ? null : validateOrgSlug(org.slug));
  if (error) throw new APIError("BAD_REQUEST", { message: error });
}

/** Membership changes are frozen while a platform admin has the organization suspended. */
async function assertOrgNotSuspended(organizationId: string): Promise<void> {
  const [row] = await db
    .select({ organizationId: schema.organizationSuspension.organizationId })
    .from(schema.organizationSuspension)
    .where(eq(schema.organizationSuspension.organizationId, organizationId))
    .limit(1);
  if (row) throw new APIError("FORBIDDEN", { message: "This organization is suspended." });
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

/** Organizations one user may own (platform admins are exempt). */
export const MAX_OWNED_ORGANIZATIONS = 5;
/** Pending invitations one organization may have at once. */
export const MAX_PENDING_INVITATIONS = 50;

/** Shared by every sign-up in this process, so common domains cost no DNS lookup. */
const checkMailDomain = cachedMailDomainCheck();

/**
 * Refuses a sign-up address that is disposable, can't receive mail, or reaches a mailbox that
 * already has an account (`canonicalEmail`: `a.b+x@gmail.com` is `ab@gmail.com`).
 */
async function assertSignUpEmailAllowed(email: string): Promise<void> {
  const rejection = await signUpEmailRejection(email, {
    checkDomain: checkMailDomain,
    production: process.env.NODE_ENV === "production",
  });
  if (rejection) throw new APIError("BAD_REQUEST", rejection);
  const [existing] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.canonicalEmail, canonicalEmail(email)))
    .limit(1);
  // Same answer as Better Auth's own duplicate check (sign-up email enumeration is accepted).
  if (existing) {
    throw new APIError("UNPROCESSABLE_ENTITY", {
      code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
      message: "User already exists. Use another email.",
    });
  }
}

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
  // Off: it counts per process and trusts any x-forwarded-for. The dashboard limits the credential
  // endpoints itself, in Valkey (apps/web/src/lib/auth-rate-limit.ts).
  rateLimit: { enabled: false },
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
  // Admin mutations go through the dashboard's server actions, which record the audit log.
  disabledPaths: [
    "/api-key/create",
    "/api-key/update",
    "/api-key/get",
    "/api-key/list",
    "/api-key/delete",
    "/organization/update",
    // Invitations go through the dashboard's server action, which rate-limits them per organization.
    "/organization/invite-member",
    "/admin/remove-user",
    "/admin/create-user",
    "/admin/update-user",
    "/admin/set-role",
    "/admin/set-user-password",
    "/admin/ban-user",
    "/admin/unban-user",
    "/admin/impersonate-user",
    "/admin/revoke-user-session",
    "/admin/revoke-user-sessions",
    // SSO providers are managed only by the dashboard's server actions (one per organization,
    // domains from the org's verified email domains) and platform admins. The plugin's own DNS
    // TXT verification is replaced by email domain verification (`./sso.ts`).
    "/sso/register",
    "/sso/update-provider",
    "/sso/delete-provider",
    "/sso/providers",
    "/sso/get-provider",
    "/sso/request-domain-verification",
    "/sso/verify-domain",
  ],
  user: {
    additionalFields: {
      // `canonicalEmail(email)`, set for every new user by the databaseHooks below; sign-up refuses
      // an address whose mailbox already has an account. Nullable: users from before the column
      // were backfilled by migration, and Better Auth tables never get NOT NULL columns.
      canonicalEmail: { type: "string", required: false, input: false, index: true },
    },
  },
  session: {
    additionalFields: {
      // The SSO provider (`ssoProvider.providerId`) whose sign-in created this session, else null.
      // Set only by the databaseHooks below. An organization's SSO requirement and its 2FA
      // requirement accept sessions from its own provider (apps/web `requireOrgMember`).
      ssoProviderId: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Users created by an SSO sign-in: `resolveSsoUser` already checked that their address is
        // on a domain the organization verified, so they don't get a verification email.
        before: async (user, ctx) => ({
          data: {
            ...user,
            canonicalEmail: canonicalEmail(user.email),
            ...(ssoProviderIdOfPath(ctx?.path, ctx?.params) ? { emailVerified: true } : {}),
          },
        }),
      },
    },
    session: {
      create: {
        before: async (session, ctx) => {
          const ssoProviderId = ssoProviderIdOfPath(ctx?.path, ctx?.params);
          return { data: { ...session, ssoProviderId } };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Only the public sign-up: users created server-side (fixtures, seed, admins, SSO) skip it.
      if (ctx.path === "/sign-up/email") {
        if (typeof ctx.body?.email === "string") await assertSignUpEmailAllowed(ctx.body.email);
        return;
      }
      if (FACTOR_MANAGEMENT_PATHS.has(ctx.path)) {
        const session = await getSessionFromCtx(ctx);
        if (session?.session.impersonatedBy) {
          throw new APIError("FORBIDDEN", {
            message:
              "Two-factor settings and passkeys can't be changed while impersonating a user.",
          });
        }
        return;
      }
      // Better Auth skips beforeCreateInvitation on resend, and leave has no organization hook.
      if (ctx.path !== "/organization/invite-member" && ctx.path !== "/organization/leave") return;
      const session = await getSessionFromCtx(ctx);
      if (!session) return;
      const organizationId =
        ctx.body?.organizationId ||
        (session.session as { activeOrganizationId?: string | null }).activeOrganizationId;
      if (typeof organizationId !== "string") return;
      const [membership] = await db
        .select({ id: schema.member.id })
        .from(schema.member)
        .where(
          and(
            eq(schema.member.organizationId, organizationId),
            eq(schema.member.userId, session.user.id),
          ),
        )
        .limit(1);
      if (membership) await assertOrgNotSuspended(organizationId);
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
            // Members (not owners: break glass) need a session from the organization's SSO
            // provider (apps/web `requireOrgMember`). Written only by `setOrganizationSsoRequired`.
            requireSso: {
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
      invitationLimit: MAX_PENDING_INVITATIONS,
      // `true` = limit reached. Counts organizations the user owns (the number option would count
      // memberships, so being invited to five organizations would block creating one's own).
      organizationLimit: async (user) => {
        if ((user as { role?: string | null }).role === "admin") return false;
        const [row] = await db
          .select({ owned: count() })
          .from(schema.member)
          .where(and(eq(schema.member.userId, user.id), eq(schema.member.role, "owner")));
        return (row?.owned ?? 0) >= MAX_OWNED_ORGANIZATIONS;
      },
      sendInvitationEmail: async ({ id, email, organization: org, role }) => {
        const url = `${process.env.BETTER_AUTH_URL ?? ""}/accept-invitation/${id}`;
        logDevEmail(`Invitation to ${org.name} as ${role}`, email, url);
      },
      organizationHooks: {
        beforeCreateOrganization: async ({ organization: org }) => {
          assertValidOrg(org);
        },
        beforeUpdateOrganization: async ({ organization: org, member }) => {
          await assertOrgNotSuspended(member.organizationId);
          assertValidOrg(org);
        },
        // The invite/update-role HTTP endpoints accept arbitrary role strings; only allow
        // canonical role names so Better Auth and `orgRoleCan` always agree on privileges.
        beforeCreateInvitation: async ({ invitation, inviter }) => {
          if (!(INVITABLE_ORG_ROLES as readonly string[]).includes(invitation.role)) {
            throw new APIError("BAD_REQUEST", { message: "Role must be admin or member." });
          }
          await assertOrgNotSuspended(invitation.organizationId);
          // Sign-up doesn't need a verified address, and invitation emails carry the org's name:
          // without this, throwaway accounts could use them to spam any address.
          if (!inviter.emailVerified) {
            throw new APIError("FORBIDDEN", {
              code: "EMAIL_NOT_VERIFIED",
              message: "Verify your email address before inviting people.",
            });
          }
          const domain = emailDomainOf(invitation.email);
          if (domain && isDisposableDomain(domain)) {
            throw new APIError("BAD_REQUEST", DISPOSABLE_EMAIL);
          }
        },
        beforeAcceptInvitation: async ({ organization: org }) => {
          await assertOrgNotSuspended(org.id);
        },
        // Better Auth cancels invitations in any status, which would rewrite an accepted (or
        // already canceled) one; only pending invitations can be canceled.
        beforeCancelInvitation: async ({ invitation }) => {
          await assertOrgNotSuspended(invitation.organizationId);
          if (invitation.status !== "pending") {
            throw new APIError("BAD_REQUEST", { message: "This invitation is no longer pending." });
          }
        },
        beforeRemoveMember: async ({ organization: org }) => {
          await assertOrgNotSuspended(org.id);
        },
        beforeUpdateMemberRole: async ({ newRole, organization: org }) => {
          if (!newRole.split(",").every(isOrgRole)) {
            throw new APIError("BAD_REQUEST", { message: "Unknown role." });
          }
          await assertOrgNotSuspended(org.id);
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
    sso({
      // `domainVerified` gates sign-in and trusted account linking. COSS sets it (from the org's
      // verified email domains) instead of the plugin's TXT records; `resolveUser` re-checks
      // the domains on every sign-in, so a domain that is deleted or fails stops SSO at once.
      domainVerification: { enabled: true },
      resolveUser: resolveSsoUser,
      // Native just-in-time membership: first SSO sign-in joins the provider's organization.
      organizationProvisioning: { defaultRole: "member" },
      // One provider per organization is enforced by the dashboard; the limit counts per user.
      providersLimit: 100,
      saml: {
        // SAML2Int: Okta, Entra ID, Google Workspace… always send NotBefore/NotOnOrAfter.
        requireTimestamps: true,
        algorithms: { onDeprecated: "reject" },
      },
    }),
    // Cloudflare Turnstile on /sign-up/email, /sign-in/email and /request-password-reset (HTTP
    // only: `auth.api.*` calls skip it). The dashboard sends the token as `x-captcha-response`.
    // Fails closed while Cloudflare's siteverify is unreachable (passkeys and SSO still work).
    ...(process.env.TURNSTILE_SECRET_KEY
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: process.env.TURNSTILE_SECRET_KEY,
            allowedHostnames: dashboardUrl ? [dashboardUrl.hostname] : undefined,
          }),
        ]
      : []),
  ],
} satisfies BetterAuthOptions;
