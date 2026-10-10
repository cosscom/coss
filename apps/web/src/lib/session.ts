import "server-only";
import { type OrgPermissions, orgRoleCan } from "@coss/auth/permissions";
import { getMembership, type Membership } from "@coss/tenancy";
import type { AdminActor } from "@coss/tenancy/admin";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ActionError, ForbiddenError } from "./actions";
import { auth, type Session } from "./auth";

export type OrgContext = Membership & {
  session: Session;
  /**
   * Whether the member may do this: their role allows it and, while the organization is
   * suspended, it only reads. Use it to gate controls; actions re-check via `requireOrgPermission`.
   */
  can: (permissions: OrgPermissions) => boolean;
};

/** A suspended organization keeps read access only. */
function onlyReads(permissions: OrgPermissions): boolean {
  return Object.values(permissions).every((actions) =>
    (actions as string[]).every((action) => action === "read"),
  );
}

/**
 * Request headers for session-bound Better Auth calls made while rendering. The Cookie header comes
 * from `cookies()`: after a server action replaces the session cookie (e.g. changing the password),
 * Next re-renders with the new cookies but the original request headers.
 */
export async function authHeaders(): Promise<Headers> {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("cookie", (await cookies()).toString());
  return requestHeaders;
}

/** The current session (deduplicated per request), or `null` when signed out. */
export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await authHeaders() });
});

/** The current session; redirects to /sign-in when signed out. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/**
 * Resolves the organization from the URL slug and the signed-in user's membership in it.
 * Non-members get a 404 so org slugs can't be probed. Never uses the session's active org.
 * Members without two-factor authentication are sent to /settings when the organization
 * requires it (this guards every org page, layout and server action).
 */
export const requireOrgMember = cache(async (orgSlug: string): Promise<OrgContext> => {
  const session = await requireSession();
  const membership = await getMembership({ userId: session.user.id, organizationSlug: orgSlug });
  if (!membership) notFound();
  if (membership.organization.requireTwoFactor && !session.user.twoFactorEnabled) {
    redirect("/settings");
  }
  const can = (permissions: OrgPermissions) =>
    orgRoleCan(membership.member.role, permissions) &&
    (!membership.suspended || onlyReads(permissions));
  return { session, ...membership, can };
});

/**
 * `requireOrgMember` plus a role check; throws `ForbiddenError` (an action error) if denied, or
 * an `ActionError` for anything but reads while the organization is suspended.
 */
export async function requireOrgPermission(
  orgSlug: string,
  permissions: OrgPermissions,
): Promise<OrgContext> {
  const context = await requireOrgMember(orgSlug);
  if (!orgRoleCan(context.member.role, permissions)) throw new ForbiddenError();
  if (!context.can(permissions)) {
    throw new ActionError("This organization is suspended, so changes are disabled.");
  }
  return context;
}

/** Platform admin (Better Auth admin plugin role; roles may be comma-joined). */
export function isPlatformAdmin(session: Session): boolean {
  return (session.user.role ?? "").split(",").some((role) => role.trim() === "admin");
}

export type AdminContext = { session: Session; actor: AdminActor };

function adminContext(session: Session): AdminContext {
  return { session, actor: { userId: session.user.id, email: session.user.email } };
}

/**
 * The signed-in platform admin, for /admin pages. Everyone else gets a 404 so the console's
 * existence isn't revealed. An impersonation session is the impersonated user's, so it fails too.
 */
export async function requirePlatformAdmin(): Promise<AdminContext> {
  const session = await requireSession();
  if (!isPlatformAdmin(session)) notFound();
  return adminContext(session);
}

/** `requirePlatformAdmin` for server actions: throws `ForbiddenError` instead of a 404. */
export async function requirePlatformAdminAction(): Promise<AdminContext> {
  const session = await getSession();
  if (!session || !isPlatformAdmin(session)) {
    throw new ForbiddenError("Only platform admins can do that.");
  }
  return adminContext(session);
}
