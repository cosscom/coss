import "server-only";
import { type OrgPermissions, orgRoleCan } from "@coss/auth/permissions";
import { getMembership, type Membership } from "@coss/tenancy";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ForbiddenError } from "./actions";
import { auth, type Session } from "./auth";

export type OrgContext = Membership & { session: Session };

/** The current session (deduplicated per request), or `null` when signed out. */
export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() });
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
 */
export const requireOrgMember = cache(async (orgSlug: string): Promise<OrgContext> => {
  const session = await requireSession();
  const membership = await getMembership({ userId: session.user.id, organizationSlug: orgSlug });
  if (!membership) notFound();
  return { session, ...membership };
});

/** `requireOrgMember` plus a role check; throws `ForbiddenError` (an action error) if denied. */
export async function requireOrgPermission(
  orgSlug: string,
  permissions: OrgPermissions,
): Promise<OrgContext> {
  const context = await requireOrgMember(orgSlug);
  if (!orgRoleCan(context.member.role, permissions)) throw new ForbiddenError();
  return context;
}

/** Platform admin (Better Auth admin plugin role; roles may be comma-joined). */
export function isPlatformAdmin(session: Session): boolean {
  return (session.user.role ?? "").split(",").some((role) => role.trim() === "admin");
}

/**
 * The current session if it belongs to a platform admin; everyone else gets a 404 (pages and
 * actions alike), so admin surfaces aren't revealed. Impersonation sessions are the impersonated
 * user's, so they never pass.
 */
export async function requirePlatformAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!isPlatformAdmin(session)) notFound();
  return session;
}
