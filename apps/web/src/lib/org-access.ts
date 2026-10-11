/**
 * Who may use an organization's dashboard with the current session (pure; `requireOrgMember`
 * applies it). SSO from the organization's own provider satisfies both its SSO requirement and
 * its two-factor requirement (the IdP is responsible for MFA); SSO through another
 * organization's provider satisfies neither.
 */

export type OrgAccessMembership = {
  organization: { slug: string; requireTwoFactor: boolean; requireSso: boolean };
  member: { role: string };
  ssoProviderId: string | null;
};

export type OrgAccessSession = {
  session: { ssoProviderId?: string | null; impersonatedBy?: string | null };
  user: { twoFactorEnabled?: boolean | null };
};

export type OrgAccess =
  | {
      kind: "allowed";
      /** The session came from the organization's SSO provider. */
      viaSso: boolean;
      /** An owner using break-glass access: SSO is required but this session isn't SSO. */
      breakGlass: boolean;
    }
  | { kind: "redirect"; to: string };

function isOwner(role: string): boolean {
  return role.split(",").includes("owner");
}

export function orgAccess(membership: OrgAccessMembership, session: OrgAccessSession): OrgAccess {
  const viaSso =
    membership.ssoProviderId !== null && session.session.ssoProviderId === membership.ssoProviderId;
  const { requireSso, requireTwoFactor, slug } = membership.organization;
  let breakGlass = false;
  // Platform admins impersonating a member (support) are not held to the member's sign-in method.
  if (requireSso && !viaSso && !session.session.impersonatedBy) {
    if (!isOwner(membership.member.role)) {
      return { kind: "redirect", to: `/sso?org=${encodeURIComponent(slug)}` };
    }
    breakGlass = true;
  }
  if (requireTwoFactor && !viaSso && !session.user.twoFactorEnabled) {
    return { kind: "redirect", to: "/settings" };
  }
  return { kind: "allowed", viaSso, breakGlass };
}
