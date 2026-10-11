/**
 * Organization directory sync (SCIM). The `@better-auth/scim` plugin owns the protocol, the
 * directory's Users/Groups and the bearer tokens of its managed connections; one connection per
 * organization, its `provisioningDomainId` is the organization id. Membership rules live in
 * `@coss/auth/scim`. Callers check `scim:*` permissions (dashboard) or platform admin first.
 */
import { auth } from "@coss/auth";
import { normalizeScimGroupName, preservingScimMembers, SCIM_SCOPES } from "@coss/auth/scim";
import { isOwnerRole } from "@coss/auth/sso";
import { db, schema } from "@coss/db";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { TenancyError } from "./errors.ts";
import { getOrganizationSsoProvider } from "./sso.ts";

const {
  member,
  scimGroup,
  scimGroupRole,
  scimManagedConnection,
  scimManagedConnectionEvent,
  scimManagedCredential,
  scimUser,
  user,
} = schema;

/** How long a new token stays valid, in days (the plugin requires an expiry). */
export const SCIM_TOKEN_LIFETIMES_DAYS = [90, 365, 730] as const;
export type ScimTokenLifetimeDays = (typeof SCIM_TOKEN_LIFETIMES_DAYS)[number];

export const MAX_SCIM_GROUP_ROLES = 100;

export type ScimConnectionStatus = "active" | "decommissioning";

export type ScimCredential = {
  credentialId: string;
  status: "active" | "expired" | "revoked" | "decommissioned";
  expiresAt: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export type OrganizationScim = {
  connectionId: string;
  /** `decommissioning`: a disconnect started but has users left to release (resume it). */
  status: ScimConnectionStatus;
  createdAt: Date;
  credentials: ScimCredential[];
  activeUsers: number;
  inactiveUsers: number;
  groups: number;
  /** Owners the directory deactivated: SCIM never changes owners, so they keep their access. */
  deactivatedOwners: { userId: string; email: string }[];
};

type LiveConnection = { id: string; connectionId: string; status: ScimConnectionStatus };

/** The organization's connection that is active or still disconnecting, else null. */
async function liveConnection(organizationId: string): Promise<LiveConnection | null> {
  const [row] = await db
    .select({
      id: scimManagedConnection.id,
      connectionId: scimManagedConnection.connectionId,
      status: scimManagedConnection.status,
    })
    .from(scimManagedConnection)
    .where(
      and(
        eq(scimManagedConnection.provisioningDomainId, organizationId),
        inArray(scimManagedConnection.status, ["active", "decommissioning"]),
      ),
    )
    .orderBy(desc(scimManagedConnection.createdAt))
    .limit(1);
  return row ? { ...row, status: row.status as ScimConnectionStatus } : null;
}

async function requireLiveConnection(organizationId: string): Promise<LiveConnection> {
  const connection = await liveConnection(organizationId);
  if (!connection) throw new TenancyError("not_found", "Directory sync is not set up.");
  return connection;
}

function credentialStatus(row: { status: string; expiresAt: Date }): ScimCredential["status"] {
  if (row.status === "active" && row.expiresAt.getTime() <= Date.now()) return "expired";
  return row.status as ScimCredential["status"];
}

/** The organization's directory connection, its tokens (never their values) and what it synced. */
export async function getOrganizationScim(input: {
  organizationId: string;
}): Promise<OrganizationScim | null> {
  const connection = await liveConnection(input.organizationId);
  if (!connection) return null;
  const [credentials, users, [groups], deactivatedOwners, [created]] = await Promise.all([
    db
      .select({
        credentialId: scimManagedCredential.credentialId,
        status: scimManagedCredential.status,
        expiresAt: scimManagedCredential.expiresAt,
        lastUsedAt: scimManagedCredential.lastUsedAt,
        createdAt: scimManagedCredential.createdAt,
      })
      .from(scimManagedCredential)
      .where(eq(scimManagedCredential.connectionRecordId, connection.id))
      .orderBy(desc(scimManagedCredential.createdAt)),
    db
      .select({ active: scimUser.active, count: count() })
      .from(scimUser)
      .where(eq(scimUser.connectionId, connection.connectionId))
      .groupBy(scimUser.active),
    db
      .select({ count: count() })
      .from(scimGroup)
      .where(eq(scimGroup.connectionId, connection.connectionId)),
    db
      .select({ userId: user.id, email: user.email, role: member.role })
      .from(scimUser)
      .innerJoin(user, eq(user.id, scimUser.userId))
      .innerJoin(
        member,
        and(eq(member.userId, scimUser.userId), eq(member.organizationId, input.organizationId)),
      )
      .where(and(eq(scimUser.connectionId, connection.connectionId), eq(scimUser.active, false))),
    db
      .select({ createdAt: scimManagedConnection.createdAt })
      .from(scimManagedConnection)
      .where(eq(scimManagedConnection.id, connection.id)),
  ]);
  return {
    connectionId: connection.connectionId,
    status: connection.status,
    createdAt: created?.createdAt ?? new Date(0),
    credentials: credentials
      .map((row) => ({ ...row, status: credentialStatus(row) }))
      .filter((row) => row.status === "active" || row.status === "expired"),
    activeUsers: users.find((row) => row.active)?.count ?? 0,
    inactiveUsers: users.find((row) => !row.active)?.count ?? 0,
    groups: groups?.count ?? 0,
    deactivatedOwners: deactivatedOwners
      .filter((row) => isOwnerRole(row.role))
      .map(({ userId, email }) => ({ userId, email })),
  };
}

function expiryFrom(days: ScimTokenLifetimeDays, now = Date.now()): Date {
  return new Date(now + days * 24 * 60 * 60 * 1000);
}

/**
 * Connects a directory: creates the organization's managed connection and its first token,
 * returned only here. Needs an active SSO provider (directory users sign in through it).
 */
export async function connectScim(input: {
  organizationId: string;
  actorId: string;
  lifetimeDays: ScimTokenLifetimeDays;
}): Promise<{ connectionId: string; token: string }> {
  const provider = await getOrganizationSsoProvider({ organizationId: input.organizationId });
  if (!provider?.active) {
    throw new TenancyError("conflict", "Set up single sign-on before connecting a directory.");
  }
  if (await liveConnection(input.organizationId)) {
    throw new TenancyError("conflict", "A directory is already connected.");
  }
  const result = await auth.api.createSCIMManagedConnection({
    body: {
      creationRequestId: crypto.randomUUID(),
      provisioningDomainId: input.organizationId,
      actorId: input.actorId,
      scopes: [...SCIM_SCOPES],
      expiresAt: expiryFrom(input.lifetimeDays),
    },
  });
  return { connectionId: result.connection.connectionId, token: result.token };
}

/** Issues another token (the previous one keeps working until it is revoked or expires). */
export async function createScimToken(input: {
  organizationId: string;
  actorId: string;
  lifetimeDays: ScimTokenLifetimeDays;
}): Promise<{ credentialId: string; token: string }> {
  const connection = await requireLiveConnection(input.organizationId);
  if (connection.status !== "active") {
    throw new TenancyError("conflict", "The directory is being disconnected.");
  }
  const result = await auth.api.rotateSCIMManagedCredential({
    body: {
      connectionId: connection.connectionId,
      provisioningDomainId: input.organizationId,
      actorId: input.actorId,
      scopes: [...SCIM_SCOPES],
      expiresAt: expiryFrom(input.lifetimeDays),
    },
  });
  return { credentialId: result.credential.credentialId, token: result.token };
}

/** Revokes one token of the organization's directory connection. */
export async function revokeScimToken(input: {
  organizationId: string;
  actorId: string;
  credentialId: string;
}): Promise<void> {
  const connection = await requireLiveConnection(input.organizationId);
  const [credential] = await db
    .select({ id: scimManagedCredential.id })
    .from(scimManagedCredential)
    .where(
      and(
        eq(scimManagedCredential.connectionRecordId, connection.id),
        eq(scimManagedCredential.credentialId, input.credentialId),
      ),
    )
    .limit(1);
  if (!credential) throw new TenancyError("not_found", "Token not found.");
  await auth.api.revokeSCIMManagedCredential({
    body: {
      connectionId: connection.connectionId,
      provisioningDomainId: input.organizationId,
      credentialId: input.credentialId,
      actorId: input.actorId,
    },
  });
}

/**
 * Disconnects the directory: its tokens stop working at once, members it provisioned stay (and
 * become ordinary members), and SSO sign-in no longer requires an active directory user. Large
 * directories are released in batches: `complete: false` means call it again (it resumes).
 */
export async function disconnectScim(input: {
  organizationId: string;
  actorId: string;
}): Promise<{ complete: boolean }> {
  const connection = await requireLiveConnection(input.organizationId);
  const result = await preservingScimMembers(() =>
    auth.api.decommissionSCIMManagedConnection({
      body: {
        connectionId: connection.connectionId,
        provisioningDomainId: input.organizationId,
        actorId: input.actorId,
      },
    }),
  );
  return { complete: result.decommission.status === "complete" };
}

export type ScimEvent = {
  sequence: number;
  type: string;
  actorId: string;
  /** The actor's address when they are a member of the organization (not COSS support). */
  actorEmail: string | null;
  credentialId: string | null;
  createdAt: Date;
};

/** Recent changes to the directory connection and its tokens, newest first. */
export async function listScimEvents(input: {
  organizationId: string;
  limit?: number;
}): Promise<ScimEvent[]> {
  const connection = await liveConnection(input.organizationId);
  if (!connection) return [];
  return db
    .select({
      sequence: scimManagedConnectionEvent.sequence,
      type: scimManagedConnectionEvent.type,
      actorId: scimManagedConnectionEvent.actorId,
      actorEmail: user.email,
      credentialId: scimManagedConnectionEvent.credentialId,
      createdAt: scimManagedConnectionEvent.createdAt,
    })
    .from(scimManagedConnectionEvent)
    .leftJoin(
      member,
      and(
        eq(member.userId, scimManagedConnectionEvent.actorId),
        eq(member.organizationId, input.organizationId),
      ),
    )
    .leftJoin(user, eq(user.id, member.userId))
    .where(eq(scimManagedConnectionEvent.connectionRecordId, connection.id))
    .orderBy(desc(scimManagedConnectionEvent.sequence))
    .limit(input.limit ?? 20);
}

export type ScimGroupRole = { groupName: string; role: "admin" | "member" };

/** Normalizes and checks group → role mappings (throws `invalid` with a user-facing message). */
export function parseScimGroupRoles(rows: readonly ScimGroupRole[]): ScimGroupRole[] {
  if (rows.length > MAX_SCIM_GROUP_ROLES) {
    throw new TenancyError("invalid", `At most ${MAX_SCIM_GROUP_ROLES} group mappings.`);
  }
  const seen = new Set<string>();
  return rows.map((row) => {
    const groupName = normalizeScimGroupName(row.groupName);
    if (!groupName || groupName.length > 256) {
      throw new TenancyError("invalid", "Group names must be 1 to 256 characters.");
    }
    if (row.role !== "admin" && row.role !== "member") {
      throw new TenancyError("invalid", "Groups can map to admin or member.");
    }
    if (seen.has(groupName)) {
      throw new TenancyError("invalid", `The group "${groupName}" is mapped more than once.`);
    }
    seen.add(groupName);
    return { groupName, role: row.role };
  });
}

/** The organization's directory group → role mappings, by group name. */
export async function listScimGroupRoles(input: {
  organizationId: string;
}): Promise<ScimGroupRole[]> {
  const rows = await db
    .select({ groupName: scimGroupRole.groupName, role: scimGroupRole.role })
    .from(scimGroupRole)
    .where(eq(scimGroupRole.organizationId, input.organizationId))
    .orderBy(scimGroupRole.groupName);
  return rows.map((row) => ({ ...row, role: row.role === "admin" ? "admin" : "member" }));
}

/**
 * Replaces the organization's group → role mappings, then re-applies them to every directory user
 * (members of a newly mapped admin group become admins, and so on). Owners are never changed.
 */
export async function setScimGroupRoles(input: {
  organizationId: string;
  mappings: readonly ScimGroupRole[];
}): Promise<void> {
  const mappings = parseScimGroupRoles(input.mappings);
  await db.transaction(async (tx) => {
    await tx.delete(scimGroupRole).where(eq(scimGroupRole.organizationId, input.organizationId));
    if (mappings.length > 0) {
      await tx
        .insert(scimGroupRole)
        .values(mappings.map((row) => ({ organizationId: input.organizationId, ...row })));
    }
  });
  const connection = await liveConnection(input.organizationId);
  if (connection?.status === "active") {
    await preservingScimMembers(() =>
      auth.api.reconcileSCIMProjection({
        body: { provisioningDomainId: input.organizationId },
      }),
    );
  }
}

/** Users the organization's connected directory manages (active directory users). */
export async function listScimManagedUserIds(input: {
  organizationId: string;
}): Promise<Set<string>> {
  const connection = await liveConnection(input.organizationId);
  if (connection?.status !== "active") return new Set();
  const rows = await db
    .select({ userId: scimUser.userId })
    .from(scimUser)
    .where(and(eq(scimUser.connectionId, connection.connectionId), eq(scimUser.active, true)));
  return new Set(rows.map((row) => row.userId));
}

/** Whether a user's membership is managed by the organization's connected directory. */
export async function isScimManagedUser(input: {
  organizationId: string;
  userId: string;
}): Promise<boolean> {
  return (await listScimManagedUserIds(input)).has(input.userId);
}

/** Whether the organization has a directory connected (or still disconnecting). */
export async function hasScimConnection(input: { organizationId: string }): Promise<boolean> {
  return (await liveConnection(input.organizationId)) !== null;
}
