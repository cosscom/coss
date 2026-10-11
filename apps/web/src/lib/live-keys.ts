import "server-only";
import { isSuspended } from "@coss/reputation";
import type { Session } from "./auth";

/**
 * Why this session may not create a live (production) key, or `null` if it may. Checked by the
 * create-key action and mirrored in the UI.
 */
export async function liveKeyRestriction(
  session: Session,
  organizationId: string,
): Promise<string | null> {
  if (session.session.impersonatedBy) {
    return "Live keys can't be created while impersonating a user.";
  }
  if (!session.user.emailVerified) {
    return "Verify your email address before creating live keys.";
  }
  if (await isSuspended(organizationId)) {
    return "Live sending is suspended for this organization, so live keys can't be created.";
  }
  return null;
}
