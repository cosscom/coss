/**
 * Read-only organization queries for the dashboard. Better Auth owns writes to these tables;
 * reading them directly keeps lookups explicit (by slug or id) instead of relying on the
 * session's active organization.
 */
import { db, schema } from "@coss/db";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";

const { invitation, member, organization, user } = schema;

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  /** Members must have two-factor authentication (TOTP) enabled to use the dashboard. */
  requireTwoFactor: boolean;
};

export type Membership = {
  organization: OrganizationSummary;
  member: { id: string; organizationId: string; userId: string; role: string; createdAt: Date };
};

export type OrganizationMember = {
  id: string;
  role: string;
  createdAt: Date;
  user: { id: string; name: string; email: string; twoFactorEnabled: boolean };
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: string | null;
  inviterId: string;
  expiresAt: Date;
  createdAt: Date;
};

const organizationColumns = {
  id: organization.id,
  name: organization.name,
  slug: organization.slug,
  logo: organization.logo,
  createdAt: organization.createdAt,
  requireTwoFactor: sql<boolean>`coalesce(${organization.requireTwoFactor}, false)`,
};

const memberColumns = {
  id: member.id,
  role: member.role,
  createdAt: member.createdAt,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    twoFactorEnabled: sql<boolean>`coalesce(${user.twoFactorEnabled}, false)`,
  },
};

/** The user's membership in the organization with this slug, or `null` if they are not a member. */
export async function getMembership(input: {
  userId: string;
  organizationSlug: string;
}): Promise<Membership | null> {
  const [row] = await db
    .select({
      organization: organizationColumns,
      member: {
        id: member.id,
        organizationId: member.organizationId,
        userId: member.userId,
        role: member.role,
        createdAt: member.createdAt,
      },
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(organization.slug, input.organizationSlug), eq(member.userId, input.userId)))
    .limit(1);
  return row ?? null;
}

/** Members of an organization with their user's name and email, oldest first. */
export async function listOrganizationMembers(input: {
  organizationId: string;
}): Promise<OrganizationMember[]> {
  return db
    .select(memberColumns)
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, input.organizationId))
    .orderBy(asc(member.createdAt), asc(member.id));
}

/** One member of the organization (ownership check before changing it), or `null`. */
export async function getOrganizationMember(input: {
  organizationId: string;
  memberId: string;
}): Promise<OrganizationMember | null> {
  const [row] = await db
    .select(memberColumns)
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(and(eq(member.id, input.memberId), eq(member.organizationId, input.organizationId)))
    .limit(1);
  return row ?? null;
}

const invitationColumns = {
  id: invitation.id,
  email: invitation.email,
  role: invitation.role,
  inviterId: invitation.inviterId,
  expiresAt: invitation.expiresAt,
  createdAt: invitation.createdAt,
};

/** Can still be accepted: status `pending` and not expired. */
function isPending() {
  return and(eq(invitation.status, "pending"), gt(invitation.expiresAt, new Date()));
}

/** Invitations that can still be accepted (status `pending`, not expired), newest first. */
export async function listPendingInvitations(input: {
  organizationId: string;
}): Promise<PendingInvitation[]> {
  return db
    .select(invitationColumns)
    .from(invitation)
    .where(and(eq(invitation.organizationId, input.organizationId), isPending()))
    .orderBy(desc(invitation.createdAt), desc(invitation.id));
}

/** One pending invitation of the organization (ownership check before canceling it), or `null`. */
export async function getPendingInvitation(input: {
  organizationId: string;
  invitationId: string;
}): Promise<PendingInvitation | null> {
  const [row] = await db
    .select(invitationColumns)
    .from(invitation)
    .where(
      and(
        eq(invitation.id, input.invitationId),
        eq(invitation.organizationId, input.organizationId),
        isPending(),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Turns the organization's two-factor requirement on or off. The dashboard checks the actor's
 * permission and their own two-factor status first.
 */
export async function setOrganizationTwoFactorRequired(input: {
  organizationId: string;
  required: boolean;
}): Promise<void> {
  await db
    .update(organization)
    .set({ requireTwoFactor: input.required })
    .where(eq(organization.id, input.organizationId));
}

/** The user's organizations that require two-factor authentication, by name. */
export async function listOrganizationsRequiringTwoFactor(input: {
  userId: string;
}): Promise<{ name: string; slug: string }[]> {
  return db
    .select({ name: organization.name, slug: organization.slug })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.userId, input.userId), eq(organization.requireTwoFactor, true)))
    .orderBy(asc(organization.name));
}
