import "server-only";
import type { Session } from "./auth";

/**
 * Why this session may not create a live (production) key, or `null` if it may. Checked by the
 * create-key action and mirrored in the UI.
 */
export function liveKeyRestriction(session: Session): string | null {
  if (session.session.impersonatedBy) {
    return "Live keys can't be created while impersonating a user.";
  }
  if (!session.user.emailVerified) {
    return "Verify your email address before creating live keys.";
  }
  return null;
}
