/**
 * Messages for the `?error=` codes Better Auth puts on the error URL of a Google or GitHub
 * sign-in or account connection (its own codes and those of `@coss/auth`'s guards). Unknown
 * codes get a generic message: `error_description` is never shown, since anyone can craft the
 * link.
 */
const MESSAGES: Record<string, string> = {
  account_not_linked:
    "An account with this email already exists and its address isn't verified yet. Sign in with your password, verify your email from your account settings, then try again.",
  SOCIAL_EMAIL_NOT_VERIFIED:
    "That account's email address isn't verified. Verify it with the provider first, or sign up with your email.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account already exists for this email address. Sign in with your password instead.",
  DISPOSABLE_EMAIL: "Disposable email addresses can't be used. Use a permanent address.",
  EMAIL_DOMAIN_UNDELIVERABLE: "That account's email domain can't receive email.",
  email_not_found: "That account has no email address COSS can use.",
  BANNED_USER: "This account has been suspended. Contact support if you think this is a mistake.",
  access_denied: "Sign-in was canceled.",
  state_not_found: "Your sign-in attempt expired. Try again.",
  state_mismatch: "Your sign-in attempt expired. Try again.",
  please_restart_the_process: "Your sign-in attempt expired. Try again.",
  account_already_linked_to_different_user:
    "That account is already connected to another COSS account.",
  unable_to_link_account:
    "That account couldn't be connected. Check that its email address is verified with the provider.",
};

export function socialErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? "Signing in with that account didn't work. Try again.";
}
