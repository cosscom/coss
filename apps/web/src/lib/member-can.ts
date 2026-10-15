import { type OrgPermissions, orgRoleCan } from "@coss/auth/permissions";

/**
 * A suspended organization keeps read access only, and its billing: paying an invoice or fixing
 * the payment method must stay possible while it is suspended.
 */
function allowedWhileSuspended(permissions: OrgPermissions): boolean {
  return Object.entries(permissions).every(
    ([resource, actions]) =>
      resource === "billing" || (actions as string[]).every((action) => action === "read"),
  );
}

// Mirrors Better Auth's role check, narrowed to reads (and billing) while the org is suspended.
export function memberCan(membership: { member: { role: string }; suspended: boolean }) {
  return (permissions: OrgPermissions): boolean =>
    orgRoleCan(membership.member.role, permissions) &&
    (!membership.suspended || allowedWhileSuspended(permissions));
}
