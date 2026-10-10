"use server";

import { resetUserTwoFactor } from "@coss/tenancy";
import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, ForbiddenError, formString, runAction } from "@/lib/actions";
import { isPlatformAdmin, requireSession } from "@/lib/session";

/**
 * Account recovery for a user who lost their authenticator and backup codes: turns their
 * two-factor authentication off so they can sign in with their password and set it up again.
 * Verify who you're talking to before using it.
 */
export async function resetTwoFactorAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();
    // An impersonation session is the target user's, so it never passes this check.
    if (!isPlatformAdmin(session)) throw new ForbiddenError("Only platform admins can do that.");
    const userId = formString(formData, "userId");
    if (userId === session.user.id) {
      throw new ActionError("Manage your own two-factor authentication in account settings.");
    }
    if (!(await resetUserTwoFactor({ userId }))) throw new ActionError("User not found.");
    refresh();
    return null;
  });
}
