"use server";

import {
  createMobileAuthorizationCode,
  isAuthorizationState,
  isCodeChallenge,
  mobileCallbackUrl,
} from "@coss/auth/mobile";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { getSession } from "@/lib/session";
import { appSignInRefusal } from "./refusal";

export async function authorizeApp(
  _prev: ActionResult<{ url: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  return runAction(async () => {
    const codeChallenge = formString(formData, "code_challenge");
    const state = formString(formData, "state");
    if (!isCodeChallenge(codeChallenge) || !isAuthorizationState(state)) {
      throw new ActionError("This sign-in link is invalid. Start again from the app.");
    }
    const session = await getSession();
    if (!session) throw new ActionError("Your session has ended. Sign in again.");
    const refusal = appSignInRefusal(session);
    if (refusal) throw new ActionError(refusal);
    const code = await createMobileAuthorizationCode({
      userId: session.user.id,
      codeChallenge,
      ssoProviderId: session.session.ssoProviderId ?? null,
    });
    return { url: mobileCallbackUrl(code, state) };
  });
}
