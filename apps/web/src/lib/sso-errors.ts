/**
 * Messages for the `?error=` codes Better Auth's SSO plugin (and our `resolveSsoUser`) put on the
 * error callback URL. Unknown codes get a generic message: the IdP's own `error_description` is
 * not shown, since anyone can craft the link.
 */
const ACCOUNT_NOT_LINKED =
  "An account with this email already exists and its address isn't verified yet. Sign in another way, verify your email from your account settings, then try SSO again.";

const MESSAGES: Record<string, string> = {
  // OIDC passes Better Auth's error through as is; SAML replaces spaces with underscores.
  "account not linked": ACCOUNT_NOT_LINKED,
  account_not_linked: ACCOUNT_NOT_LINKED,
  email_domain_not_allowed:
    "Your identity provider returned an address that isn't on one of the organization's verified domains.",
  organization_suspended: "This organization is suspended, so it can't add new members.",
  provider_not_found: "This SSO connection no longer exists.",
  access_denied: "Sign-in was canceled at your identity provider.",
};

export function ssoErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return (
    MESSAGES[code] ??
    "Single sign-on didn't work. Try again, or contact your organization's administrator."
  );
}
