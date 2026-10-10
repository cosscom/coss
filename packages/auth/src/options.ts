/**
 * Base Better Auth options shared by every process (dashboard, public API, scripts, `auth` CLI).
 * Must stay free of Next.js imports — apps/web appends `nextCookies()` in its own instance.
 * Must not import "server-only" (it breaks the `auth` CLI loader).
 */
import { apiKey } from "@better-auth/api-key";
import { db } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import * as schema from "@coss/db/schema";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { admin, organization } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";
import {
  API_KEY_NAME_MAX_LENGTH,
  API_KEY_PERMISSIONS,
  API_KEY_VISIBLE_CHARACTERS,
} from "./constants.ts";
import { INVITABLE_ORG_ROLES, isOrgRole, orgAc, orgRoles } from "./permissions.ts";
import { validateOrgName, validateOrgSlug } from "./slugs.ts";

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
    autoSignInAfterVerification: true,
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
  ],
  hooks: {
    // Better Auth skips beforeCreateInvitation on resend, and leave has no organization hook.
    before: createAuthMiddleware(async (ctx) => {
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
      // Our custom generateId makes invitation ids predictable, so Better Auth requires a verified
      // email to read/accept invitations. Keep it explicit; NEVER disable while sign-up is unverified.
      requireEmailVerificationOnInvitation: true,
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
        beforeCreateInvitation: async ({ invitation }) => {
          if (!(INVITABLE_ORG_ROLES as readonly string[]).includes(invitation.role)) {
            throw new APIError("BAD_REQUEST", { message: "Role must be admin or member." });
          }
          await assertOrgNotSuspended(invitation.organizationId);
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
