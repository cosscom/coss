/**
 * Platform administration (dashboard /admin). These are platform-level functions: they read and
 * write across organizations, so they are exempt from the tenancy rule and must only be called
 * after checking that the caller is a platform admin. Every write records an `admin_audit_event`.
 */
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, count, desc, eq, gt, ilike, lt, or, type SQL, sql } from "drizzle-orm";
import { TenancyError } from "./errors.ts";

const {
  adminAuditEvent,
  apikey,
  environment,
  environmentApiKey,
  member,
  organization,
  organizationSuspension,
  project,
  session,
  user,
} = schema;

/** Grants the platform admin role; used by the seed and `admin:create`. The user must exist. */
export async function promoteToAdmin(email: string): Promise<{ id: string; email: string }> {
  const [row] = await db
    .update(user)
    .set({ role: "admin" })
    .where(sql`lower(${user.email}) = lower(${email.trim()})`)
    .returning({ id: user.id, email: user.email });
  if (!row) throw new TenancyError("not_found", `No user with email "${email}".`);
  return row;
}

// --- Audit log -------------------------------------------------------------------------------

/** The platform admin performing an action. The email is copied into the log. */
export type AdminActor = { userId: string; email: string };

export const ADMIN_ACTIONS = [
  "user.ban",
  "user.unban",
  "user.set_role",
  "user.impersonate",
  "user.revoke_session",
  "user.revoke_sessions",
  "user.reset_two_factor",
  "organization.suspend",
  "organization.unsuspend",
  "api_key.revoke",
] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export type AdminTargetType = "user" | "organization" | "api_key";

export type AdminAuditEvent = {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  organizationId: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

/** Longest reason/note an admin may record. */
export const ADMIN_REASON_MAX_LENGTH = 500;

function normalizeReason(reason: string | null | undefined, required: boolean): string | null {
  const trimmed = reason?.trim() ?? "";
  if (required && trimmed.length === 0) throw new TenancyError("invalid", "Enter a reason.");
  if (trimmed.length > ADMIN_REASON_MAX_LENGTH) {
    throw new TenancyError(
      "invalid",
      `The reason must be at most ${ADMIN_REASON_MAX_LENGTH} characters.`,
    );
  }
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Appends one entry to the admin audit log. Pass `executor` to commit it with the change it
 * describes; actions performed through Better Auth are recorded right after they succeed.
 */
export async function recordAdminAction(
  input: {
    actor: AdminActor;
    action: AdminAction;
    target: { type: AdminTargetType; id: string };
    organizationId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
  executor: Executor = db,
): Promise<void> {
  await executor.insert(adminAuditEvent).values({
    actorUserId: input.actor.userId,
    actorEmail: input.actor.email,
    action: input.action,
    targetType: input.target.type,
    targetId: input.target.id,
    organizationId: input.organizationId ?? null,
    reason: normalizeReason(input.reason, false),
    metadata: input.metadata ?? {},
  });
}

/**
 * Audit entries, newest first. Filter by organization (every entry recorded with it) or by
 * target; page with `before` (the last id of the previous page).
 */
export async function listAdminAuditEvents(
  input: {
    organizationId?: string;
    target?: { type: AdminTargetType; id: string };
    before?: string;
    limit?: number;
  } = {},
): Promise<{ events: AdminAuditEvent[]; nextBefore: string | null }> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const before = input.before && isId("audit", input.before) ? input.before : undefined;
  const rows = await db
    .select()
    .from(adminAuditEvent)
    .where(
      and(
        input.organizationId ? eq(adminAuditEvent.organizationId, input.organizationId) : undefined,
        input.target
          ? and(
              eq(adminAuditEvent.targetType, input.target.type),
              eq(adminAuditEvent.targetId, input.target.id),
            )
          : undefined,
        before ? lt(adminAuditEvent.id, before) : undefined,
      ),
    )
    .orderBy(desc(adminAuditEvent.id))
    .limit(limit + 1);
  const events = rows.slice(0, limit);
  return {
    events,
    nextBefore: rows.length > limit ? (events.at(-1)?.id ?? null) : null,
  };
}

// --- Organization suspension -----------------------------------------------------------------

export type OrganizationSuspension = {
  reason: string;
  suspendedByUserId: string | null;
  createdAt: Date;
};

/** The organization's suspension, or `null` when it is active. */
export async function getOrganizationSuspension(
  organizationId: string,
): Promise<OrganizationSuspension | null> {
  const [row] = await db
    .select({
      reason: organizationSuspension.reason,
      suspendedByUserId: organizationSuspension.suspendedByUserId,
      createdAt: organizationSuspension.createdAt,
    })
    .from(organizationSuspension)
    .where(eq(organizationSuspension.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

async function requireOrganization(organizationId: string, executor: Executor = db) {
  const [row] = await executor
    .select({ id: organization.id, slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!row) throw new TenancyError("not_found", "Organization not found.");
  return row;
}

/**
 * Suspends an organization: its API keys are refused (403 `organization_suspended`), its webhook
 * deliveries are held until it is lifted, and its dashboard becomes read-only. The reason is an
 * internal note for admins.
 */
export async function suspendOrganization(input: {
  organizationId: string;
  reason: string;
  actor: AdminActor;
}): Promise<void> {
  const reason = normalizeReason(input.reason, true) as string;
  await db.transaction(async (tx) => {
    const org = await requireOrganization(input.organizationId, tx);
    const [inserted] = await tx
      .insert(organizationSuspension)
      .values({ organizationId: org.id, reason, suspendedByUserId: input.actor.userId })
      .onConflictDoNothing()
      .returning({ organizationId: organizationSuspension.organizationId });
    if (!inserted) throw new TenancyError("conflict", "This organization is already suspended.");
    await recordAdminAction(
      {
        actor: input.actor,
        action: "organization.suspend",
        target: { type: "organization", id: org.id },
        organizationId: org.id,
        reason,
        metadata: { slug: org.slug },
      },
      tx,
    );
  });
}

/** Lifts a suspension; held webhook deliveries resume on the worker's next pass. */
export async function unsuspendOrganization(input: {
  organizationId: string;
  reason?: string | null;
  actor: AdminActor;
}): Promise<void> {
  const reason = normalizeReason(input.reason, false);
  await db.transaction(async (tx) => {
    const org = await requireOrganization(input.organizationId, tx);
    const [deleted] = await tx
      .delete(organizationSuspension)
      .where(eq(organizationSuspension.organizationId, org.id))
      .returning({ reason: organizationSuspension.reason });
    if (!deleted) throw new TenancyError("conflict", "This organization is not suspended.");
    await recordAdminAction(
      {
        actor: input.actor,
        action: "organization.unsuspend",
        target: { type: "organization", id: org.id },
        organizationId: org.id,
        reason,
        metadata: { slug: org.slug, suspensionReason: deleted.reason },
      },
      tx,
    );
  });
}

// --- Admin reads -----------------------------------------------------------------------------

export type AdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  memberCount: number;
  suspendedAt: Date | null;
};

/** `%`, `_` and `\` are literal in a search term. */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Organizations, newest first, matching `search` against the name, slug or exact id. */
export async function listOrganizationsForAdmin(
  input: { search?: string; suspendedOnly?: boolean; limit?: number; offset?: number } = {},
): Promise<{ organizations: AdminOrganizationRow[]; total: number }> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const search = input.search?.trim();
  const filters: (SQL | undefined)[] = [
    search
      ? or(
          ilike(organization.name, likePattern(search)),
          ilike(organization.slug, likePattern(search)),
          eq(organization.id, search),
        )
      : undefined,
    input.suspendedOnly ? sql`${organizationSuspension.organizationId} is not null` : undefined,
  ];
  const memberCount = db
    .select({ organizationId: member.organizationId, count: count().as("member_count") })
    .from(member)
    .groupBy(member.organizationId)
    .as("member_count");

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        memberCount: sql<number>`coalesce(${memberCount.count}, 0)::int`,
        suspendedAt: organizationSuspension.createdAt,
      })
      .from(organization)
      .leftJoin(memberCount, eq(memberCount.organizationId, organization.id))
      .leftJoin(organizationSuspension, eq(organizationSuspension.organizationId, organization.id))
      .where(and(...filters))
      .orderBy(desc(organization.createdAt), desc(organization.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(organization)
      .leftJoin(organizationSuspension, eq(organizationSuspension.organizationId, organization.id))
      .where(and(...filters)),
  ]);
  return { organizations: rows, total: totalRow?.total ?? 0 };
}

export type AdminOrganizationDetail = {
  organization: { id: string; name: string; slug: string; createdAt: Date };
  suspension: (OrganizationSuspension & { suspendedByEmail: string | null }) | null;
};

/** One organization with its suspension (and who suspended it), or `null`. */
export async function getOrganizationForAdmin(
  organizationId: string,
): Promise<AdminOrganizationDetail | null> {
  const [row] = await db
    .select({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
      },
      reason: organizationSuspension.reason,
      suspendedByUserId: organizationSuspension.suspendedByUserId,
      suspendedAt: organizationSuspension.createdAt,
      suspendedByEmail: user.email,
    })
    .from(organization)
    .leftJoin(organizationSuspension, eq(organizationSuspension.organizationId, organization.id))
    .leftJoin(user, eq(user.id, organizationSuspension.suspendedByUserId))
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!row) return null;
  return {
    organization: row.organization,
    suspension:
      row.reason !== null && row.suspendedAt !== null
        ? {
            reason: row.reason,
            suspendedByUserId: row.suspendedByUserId,
            suspendedByEmail: row.suspendedByEmail,
            createdAt: row.suspendedAt,
          }
        : null,
  };
}

export type AdminUserStatus = "all" | "banned" | "admin";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  twoFactorEnabled: boolean;
  createdAt: Date;
};

const userColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  role: user.role,
  banned: user.banned,
  banReason: user.banReason,
  banExpires: user.banExpires,
  twoFactorEnabled: sql<boolean>`coalesce(${user.twoFactorEnabled}, false)`,
  createdAt: user.createdAt,
};

/** Better Auth lifts an expired ban lazily (at the next sign-in); treat it as lifted already. */
const activeBan = sql`(${user.banned} is true and (${user.banExpires} is null or ${user.banExpires} > now()))`;
const isAdminRole = sql`'admin' = any(string_to_array(${user.role}, ','))`;

function toAdminUser(row: Omit<AdminUserRow, "banned"> & { banned: boolean | null }): AdminUserRow {
  const banned =
    row.banned === true && (row.banExpires === null || row.banExpires.getTime() > Date.now());
  return { ...row, banned };
}

/** Users, newest first, matching `search` against the email, name or exact id. */
export async function listUsersForAdmin(
  input: { search?: string; status?: AdminUserStatus; limit?: number; offset?: number } = {},
): Promise<{ users: AdminUserRow[]; total: number }> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const search = input.search?.trim();
  const where = and(
    search
      ? or(
          ilike(user.email, likePattern(search)),
          ilike(user.name, likePattern(search)),
          eq(user.id, search),
        )
      : undefined,
    input.status === "banned" ? activeBan : undefined,
    input.status === "admin" ? isAdminRole : undefined,
  );
  const [rows, [totalRow]] = await Promise.all([
    db
      .select(userColumns)
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(user).where(where),
  ]);
  return { users: rows.map(toAdminUser), total: totalRow?.total ?? 0 };
}

export async function getUserForAdmin(userId: string): Promise<AdminUserRow | null> {
  const [row] = await db.select(userColumns).from(user).where(eq(user.id, userId)).limit(1);
  return row ? toAdminUser(row) : null;
}

/**
 * Account recovery for a user who lost their authenticator and backup codes: removes their TOTP
 * secret and turns two-factor off, so their password alone signs them in. Passkeys and sessions
 * are left alone; organizations that require two-factor ask them to set it up again.
 */
export async function resetUserTwoFactor(input: {
  userId: string;
  reason: string;
  actor: AdminActor;
}): Promise<void> {
  const reason = normalizeReason(input.reason, true);
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(user)
      .set({ twoFactorEnabled: false })
      .where(and(eq(user.id, input.userId), eq(user.twoFactorEnabled, true)))
      .returning({ id: user.id });
    if (!updated) throw new TenancyError("not_found", "This user doesn't have two-factor enabled.");
    await tx.delete(schema.twoFactor).where(eq(schema.twoFactor.userId, input.userId));
    await recordAdminAction(
      {
        actor: input.actor,
        action: "user.reset_two_factor",
        target: { type: "user", id: updated.id },
        reason,
      },
      tx,
    );
  });
}

export type AdminSessionRow = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  impersonatedBy: string | null;
};

/** The user's unexpired sessions, newest first. Never selects the session token. */
export async function listUserSessionsForAdmin(userId: string): Promise<AdminSessionRow[]> {
  return db
    .select({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      impersonatedBy: session.impersonatedBy,
    })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.createdAt));
}

export type AdminMembershipRow = {
  memberId: string;
  role: string;
  createdAt: Date;
  organization: { id: string; name: string; slug: string };
  suspended: boolean;
};

/** Every organization the user belongs to, oldest membership first. */
export async function listUserMembershipsForAdmin(userId: string): Promise<AdminMembershipRow[]> {
  const rows = await db
    .select({
      memberId: member.id,
      role: member.role,
      createdAt: member.createdAt,
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
      suspendedAt: organizationSuspension.createdAt,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .leftJoin(organizationSuspension, eq(organizationSuspension.organizationId, organization.id))
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt), asc(member.id));
  return rows.map(({ suspendedAt, ...row }) => ({ ...row, suspended: suspendedAt !== null }));
}

export type AdminApiKeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  enabled: boolean;
  lastRequest: Date | null;
  createdAt: Date;
  project: { id: string; name: string; slug: string };
  environment: { id: string; name: string; slug: string; mode: "live" | "sandbox" };
};

/** Every environment-bound API key of the organization, newest first. Never selects the hash. */
export async function listOrganizationApiKeysForAdmin(
  organizationId: string,
): Promise<AdminApiKeyRow[]> {
  const rows = await db
    .select({
      id: apikey.id,
      name: apikey.name,
      start: apikey.start,
      enabled: apikey.enabled,
      lastRequest: apikey.lastRequest,
      createdAt: apikey.createdAt,
      project: { id: project.id, name: project.name, slug: project.slug },
      environment: {
        id: environment.id,
        name: environment.name,
        slug: environment.slug,
        mode: environment.mode,
      },
    })
    .from(environmentApiKey)
    .innerJoin(apikey, eq(apikey.id, environmentApiKey.apiKeyId))
    .innerJoin(environment, eq(environment.id, environmentApiKey.environmentId))
    .innerJoin(
      project,
      and(eq(project.id, environment.projectId), eq(project.organizationId, organizationId)),
    )
    .where(
      and(eq(environment.organizationId, organizationId), eq(apikey.referenceId, organizationId)),
    )
    .orderBy(desc(apikey.createdAt), desc(apikey.id));
  return rows.map((row) => ({ ...row, enabled: row.enabled !== false }));
}

/**
 * Deletes one of the organization's API keys (e.g. a leaked key the organization can't reach).
 * Better Auth's delete endpoint needs a member session, so the row is removed directly; its
 * environment binding cascades.
 */
export async function revokeApiKeyAsAdmin(input: {
  organizationId: string;
  keyId: string;
  reason: string;
  actor: AdminActor;
}): Promise<void> {
  const reason = normalizeReason(input.reason, true);
  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(apikey)
      .where(
        and(
          eq(apikey.id, input.keyId),
          eq(apikey.referenceId, input.organizationId),
          sql`exists (select 1 from ${environmentApiKey} where ${environmentApiKey.apiKeyId} = ${apikey.id})`,
        ),
      )
      .returning({ id: apikey.id, name: apikey.name, start: apikey.start });
    if (!deleted) throw new TenancyError("not_found", "API key not found.");
    await recordAdminAction(
      {
        actor: input.actor,
        action: "api_key.revoke",
        target: { type: "api_key", id: deleted.id },
        organizationId: input.organizationId,
        reason,
        metadata: { name: deleted.name, start: deleted.start },
      },
      tx,
    );
  });
}

export type AdminOverview = {
  users: number;
  bannedUsers: number;
  admins: number;
  organizations: number;
  suspendedOrganizations: number;
};

/** Headline counts for the admin overview. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const [[users], [organizations]] = await Promise.all([
    db
      .select({
        users: count(),
        bannedUsers: sql<number>`count(*) filter (where ${activeBan})::int`,
        admins: sql<number>`count(*) filter (where ${isAdminRole})::int`,
      })
      .from(user),
    db
      .select({
        organizations: count(),
        suspendedOrganizations: count(organizationSuspension.organizationId),
      })
      .from(organization)
      .leftJoin(organizationSuspension, eq(organizationSuspension.organizationId, organization.id)),
  ]);
  return {
    users: users?.users ?? 0,
    bannedUsers: users?.bannedUsers ?? 0,
    admins: users?.admins ?? 0,
    organizations: organizations?.organizations ?? 0,
    suspendedOrganizations: organizations?.suspendedOrganizations ?? 0,
  };
}
