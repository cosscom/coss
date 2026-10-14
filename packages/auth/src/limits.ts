/**
 * Plan limits Better Auth enforces on its own routes (accepting an invitation adds a member).
 * `@coss/auth` can't depend on billing (billing's tests use tenancy, which depends on auth), so
 * the app registers a resolver; without one, Better Auth's default applies.
 */

/** Better Auth's own default member limit. */
export const DEFAULT_MEMBERSHIP_LIMIT = 100;

/** The organization's member limit (`null`: unlimited). */
export type MembershipLimitResolver = (organizationId: string) => Promise<number | null>;

let resolver: MembershipLimitResolver | null = null;

/** Called once by the app that serves `/api/auth` (the dashboard). */
export function setMembershipLimitResolver(next: MembershipLimitResolver | null): void {
  resolver = next;
}

export async function membershipLimitFor(organizationId: string): Promise<number> {
  if (!resolver) return DEFAULT_MEMBERSHIP_LIMIT;
  const limit = await resolver(organizationId);
  return limit ?? Number.MAX_SAFE_INTEGER;
}
