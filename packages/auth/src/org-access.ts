/**
 * Who may use an organization's dashboard with the current session (pure; `requireOrgMember`
 * applies it). SSO from the organization's own provider satisfies both its SSO requirement and
 * its two-factor requirement (the IdP is responsible for MFA); SSO through another
 * organization's provider satisfies neither.
 */

/** Where the session guards send a request they refuse (`requireSession`, `orgAccess`). */
export const SIGN_IN_PATH = "/sign-in";
export const SSO_SIGN_IN_PATH = "/sso";
export const TWO_FACTOR_SETUP_PATH = "/settings/security";

const ACCESS_REDIRECT_PATHS = new Set([SIGN_IN_PATH, SSO_SIGN_IN_PATH, TWO_FACTOR_SETUP_PATH]);

/**
 * Whether a redirect is a guard turning the request away rather than an action finishing: a
 * server action redirected there changed nothing (`useActionToast` doesn't confirm it).
 */
export function isAccessRedirect(url: string): boolean {
  return ACCESS_REDIRECT_PATHS.has(new URL(url, "http://localhost").pathname);
}

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
      return { kind: "redirect", to: `${SSO_SIGN_IN_PATH}?org=${encodeURIComponent(slug)}` };
    }
    breakGlass = true;
  }
  // SSO skips the local challenge, so enrollment is not MFA proof for a foreign IdP session.
  if (
    requireTwoFactor &&
    !viaSso &&
    (!session.user.twoFactorEnabled || session.session.ssoProviderId)
  ) {
    return { kind: "redirect", to: TWO_FACTOR_SETUP_PATH };
  }
  return { kind: "allowed", viaSso, breakGlass };
}
