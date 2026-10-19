/**
 * SCIM (directory sync) rules for the `@better-auth/scim` plugin (`options.ts`). Server-only (reads
 * the database); not client-safe.
 *
 * One managed SCIM connection per organization, with `provisioningDomainId` = the organization id.
 * The plugin keeps the directory's Users and Groups; coss.com projects them onto the organization:
 * - a User may only be provisioned on the organization's SSO domains (`ssoDomainForEmail`, like
 *   SSO sign-in), and an existing account with that address is linked — only when it is verified —
 *   without the directory taking over its email or name (`profile: "preserve"`);
 * - an active User is a member, an admin when one of its Groups maps to admin (`scim_group_role`);
 * - a deactivated or deleted User loses its membership of this organization and its sessions from
 *   this organization's SSO provider — never its other memberships or sessions;
 * - owners are never changed (break glass, and Better Auth's last-owner rule stays intact);
 * - while the organization is suspended nobody is added or promoted (removals still apply);
 * - disconnecting the directory leaves the members it provisioned in place.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac } from "node:crypto";
import type {
  SCIMIdentityResolution,
  SCIMIdentityResolutionInput,
  SCIMOptions,
  SCIMProjectedUserState,
  SCIMRoleExistenceInput,
  SCIMRoleMappingInput,
  SCIMTransactionContext,
} from "@better-auth/scim";
import { db } from "@coss/db";
import * as schema from "@coss/db/schema";
import { APIError } from "better-auth/api";
import { and, eq, inArray } from "drizzle-orm";
import { INVITABLE_ORG_ROLES, type InvitableOrgRole } from "./permissions.ts";
import { isOwnerRole, parseSsoDomains, ssoDomainForEmail, ssoProviderIdFor } from "./sso.ts";

/** The SCIM service's base path under Better Auth's `/api/auth`. */
export const SCIM_BASE_PATH = "/scim/v2";

/** Every scope a directory needs (users and groups, read and write). */
export const SCIM_SCOPES = [
  "scim.users.read",
  "scim.users.write",
  "scim.groups.read",
  "scim.groups.write",
] as const;

/**
 * The plugin's HMAC key for bearer token digests, derived from `BETTER_AUTH_SECRET` (rotating that
 * secret invalidates every SCIM token). The plugin needs ≥ 32 characters even when no secret is
 * configured (the `auth` CLI); Better Auth itself refuses to run in production without one.
 */
export function scimCredentialHashSecret(secret = process.env.BETTER_AUTH_SECRET ?? ""): string {
  return createHmac("sha256", secret).update("coss-scim-credentials").digest("hex");
}

const SCIM_ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

/** A SCIM error response (RFC 7644 §3.12); the plugin passes `APIError`s through unchanged. */
function scimError(status: "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT", detail: string): APIError {
  const code = { BAD_REQUEST: "400", FORBIDDEN: "403", CONFLICT: "409" }[status];
  const error = new APIError(status, { schemas: [SCIM_ERROR_SCHEMA], status: code, detail });
  error.message = detail;
  return error;
}

/** The organization's SSO provider when it is active (its domains are verified), else null. */
async function activeSsoProvider(
  organizationId: string,
): Promise<{ providerId: string; domains: string[] } | null> {
  const [provider] = await db
    .select({
      providerId: schema.ssoProvider.providerId,
      domain: schema.ssoProvider.domain,
      domainVerified: schema.ssoProvider.domainVerified,
    })
    .from(schema.ssoProvider)
    .where(eq(schema.ssoProvider.providerId, ssoProviderIdFor(organizationId)))
    .limit(1);
  if (!provider?.domainVerified) return null;
  return { providerId: provider.providerId, domains: parseSsoDomains(provider.domain) };
}

async function isSuspended(organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({ organizationId: schema.organizationSuspension.organizationId })
    .from(schema.organizationSuspension)
    .where(eq(schema.organizationSuspension.organizationId, organizationId))
    .limit(1);
  return row !== undefined;
}

/** Throws a SCIM 400 unless `email` is on one of the organization's active SSO domains. */
export async function assertScimEmail(organizationId: string, email: string): Promise<void> {
  const provider = await activeSsoProvider(organizationId);
  if (!provider) {
    throw scimError("FORBIDDEN", "Single sign-on must be set up before users can be provisioned.");
  }
  const domain = await ssoDomainForEmail({
    organizationId,
    providerDomains: provider.domains,
    email: email.toLowerCase(),
  });
  if (!domain) {
    throw scimError(
      "BAD_REQUEST",
      `${email} is not on a domain of this organization's single sign-on provider.`,
    );
  }
}

/** `identity.resolveUser`: runs before a new SCIM User is stored (not for re-created deleted ones). */
export async function resolveScimUser(
  input: SCIMIdentityResolutionInput,
): Promise<SCIMIdentityResolution> {
  const organizationId = input.provisioningDomainId;
  const email = input.resource.primaryEmail.toLowerCase();
  await assertScimEmail(organizationId, email);
  const [existing] = await db
    .select({ id: schema.user.id, emailVerified: schema.user.emailVerified })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (existing) {
    // Keep this independent of sign-up policy: linking an unverified account would make whoever
    // registered it (and knows its password) a member. Same rule as SSO account linking.
    if (!existing.emailVerified) {
      throw scimError(
        "CONFLICT",
        `An unverified account already uses ${email}; its owner must verify the address first.`,
      );
    }
    return { action: "link", userId: existing.id, profile: "preserve" };
  }
  if (await isSuspended(organizationId)) {
    throw scimError("FORBIDDEN", "This organization is suspended.");
  }
  return { action: "create" };
}

/** The organization a SCIM request is for (the plugin's authenticated connection), else null. */
export function scimOrganizationIdOf(ctx: unknown): string | null {
  const context = (ctx as { path?: string; context?: { scimConnection?: unknown } } | undefined)
    ?.context;
  const path = (ctx as { path?: string } | undefined)?.path;
  if (!path?.startsWith(`${SCIM_BASE_PATH}/`)) return null;
  const connection = context?.scimConnection as { provisioningDomainId?: unknown } | undefined;
  return typeof connection?.provisioningDomainId === "string"
    ? connection.provisioningDomainId
    : null;
}

/** Trimmed, lower-cased group name: the key of `scim_group_role`. */
export function normalizeScimGroupName(name: string): string {
  return name.trim().toLowerCase();
}

function isInvitableRole(role: string): role is InvitableOrgRole {
  return (INVITABLE_ORG_ROLES as readonly string[]).includes(role);
}

/** `projection.roles.map`: a group's role from `scim_group_role`, if it is mapped. */
async function mapScimGroupRole(input: SCIMRoleMappingInput): Promise<string[] | undefined> {
  const [row] = await db
    .select({ role: schema.scimGroupRole.role })
    .from(schema.scimGroupRole)
    .where(
      and(
        eq(schema.scimGroupRole.organizationId, input.provisioningDomainId),
        eq(schema.scimGroupRole.groupName, normalizeScimGroupName(input.source.displayName)),
      ),
    )
    .limit(1);
  return row && isInvitableRole(row.role) ? [row.role] : undefined;
}

/**
 * Set while coss.com itself replays or disconnects a directory: a user who then has no source left in
 * a live connection was provisioned by the disconnected one and keeps their membership. Outside
 * it, a user without sources was just deleted by the directory and is removed.
 */
const keepUsersWithoutSources = new AsyncLocalStorage<true>();

/** Runs a server-side SCIM operation (decommission, projection replay) that keeps disconnected members. */
export function preservingScimMembers<T>(fn: () => Promise<T>): Promise<T> {
  return keepUsersWithoutSources.run(true, fn);
}

/**
 * The plugin revokes every session of a user the directory deactivates (or who has no live source
 * left, as after a disconnect), across all their organizations. coss.com revokes only the
 * organization's SSO sessions (`reconcileScimMembership`), so the `session.delete.before` hook
 * vetoes bulk session deletes made during SCIM requests and coss.com's own SCIM operations.
 */
export function isScimSessionSweep(ctx: unknown): boolean {
  return keepUsersWithoutSources.getStore() === true || scimOrganizationIdOf(ctx) !== null;
}

interface MemberRow {
  id: string;
  role: string;
}

/** `projection.reconcileUser`: the organization membership a directory user should have. */
export async function reconcileScimMembership(
  state: SCIMProjectedUserState,
  { database }: SCIMTransactionContext,
): Promise<void> {
  const organizationId = state.provisioningDomainId;
  // An already-authenticated SCIM request must not restore access after deletion was requested.
  const [deletion] = await db
    .select({ id: schema.organizationDeletion.id })
    .from(schema.organizationDeletion)
    .where(
      and(
        eq(schema.organizationDeletion.organizationId, organizationId),
        eq(schema.organizationDeletion.status, "pending"),
      ),
    )
    .limit(1);
  if (deletion) throw scimError("FORBIDDEN", "This organization is being deleted.");
  const member = await database.findOne<MemberRow>({
    model: "member",
    where: [
      { field: "organizationId", value: organizationId },
      { field: "userId", value: state.userId },
    ],
  });
  if (member && isOwnerRole(member.role)) return;

  if (!state.active) {
    if (state.sources.length === 0 && keepUsersWithoutSources.getStore()) return;
    if (member) {
      await database.delete({ model: "member", where: [{ field: "id", value: member.id }] });
      // Their personal API keys go with the membership, in the same transaction
      // (`authenticateApiKey` already refuses them once the member row is gone).
      const keyIds = await personalKeyIds(organizationId, state.userId);
      if (keyIds.length > 0) {
        await database.deleteMany({
          model: "apikey",
          where: [{ field: "id", operator: "in", value: keyIds }],
        });
      }
    }
    await database.deleteMany({
      model: "session",
      where: [
        { field: "userId", value: state.userId },
        { field: "ssoProviderId", value: ssoProviderIdFor(organizationId) },
      ],
    });
    return;
  }

  const role: InvitableOrgRole = state.grants.some((grant) => grant.role === "admin")
    ? "admin"
    : "member";
  if (member?.role === role) return;
  const promotes = !member || role === "admin";
  if (promotes && (await isSuspended(organizationId))) {
    throw scimError("FORBIDDEN", "This organization is suspended.");
  }
  if (member) {
    await database.update({
      model: "member",
      where: [{ field: "id", value: member.id }],
      update: { role },
    });
  } else {
    await database.create({
      model: "member",
      data: { organizationId, userId: state.userId, role, createdAt: new Date() },
    });
  }
}

/** The ids of a member's personal API keys in the organization. */
async function personalKeyIds(organizationId: string, userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: schema.environmentApiKey.apiKeyId })
    .from(schema.environmentApiKey)
    .where(
      and(
        eq(schema.environmentApiKey.ownerUserId, userId),
        inArray(
          schema.environmentApiKey.environmentId,
          db
            .select({ id: schema.environment.id })
            .from(schema.environment)
            .where(eq(schema.environment.organizationId, organizationId)),
        ),
      ),
    );
  return rows.map((row) => row.id);
}

/** The plugin's options, minus `managedConnections` (options.ts adds the secret). */
export const scimPluginOptions = {
  // Connections are created per organization in the dashboard (managed connections) only.
  connections: [],
  identity: {
    resolveUser: resolveScimUser,
    // The default revokes every session of a deactivated user, across all their organizations;
    // `reconcileScimMembership` revokes only this organization's SSO sessions.
    reconcileUser: async () => {},
  },
  projection: {
    roles: {
      map: mapScimGroupRole,
      exists: async (input: SCIMRoleExistenceInput) => isInvitableRole(input.role),
    },
    reconcileUser: reconcileScimMembership,
  },
  compatibility: { microsoftEntra: { acceptLegacyGroupSchema: true } },
} satisfies SCIMOptions;
