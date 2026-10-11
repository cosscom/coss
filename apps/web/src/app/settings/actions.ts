"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, ForbiddenError, formString, runAction } from "@/lib/actions";
import { auth, type Session } from "@/lib/auth";
import { requireSession } from "@/lib/session";

const USER_NAME_MAX_LENGTH = 64;

/**
 * The signed-in user's own session. Account changes are refused while a platform admin is
 * impersonating: an admin must never change someone else's password, name or sessions.
 */
async function requireAccountOwner(): Promise<Session> {
  const session = await requireSession();
  if (session.session.impersonatedBy) {
    throw new ForbiddenError("Account settings can't be changed while impersonating.");
  }
  return session;
}

export async function updateNameAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAccountOwner();
    const name = formString(formData, "name");
    if (name.length === 0 || name.length > USER_NAME_MAX_LENGTH) {
      throw new ActionError(`Name must be 1-${USER_NAME_MAX_LENGTH} characters.`);
    }
    await auth.api.updateUser({ headers: await headers(), body: { name } });
    refresh();
    return null;
  });
}

/** Emails a new verification link (logged to the console in development). */
export async function sendVerificationEmailAction(
  _previous: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireAccountOwner();
    if (session.user.emailVerified) throw new ActionError("Your email is already verified.");
    await auth.api.sendVerificationEmail({
      headers: await headers(),
      body: { email: session.user.email, callbackURL: "/settings" },
    });
    return null;
  });
}

/**
 * Changes the password and signs out every other session. Better Auth replaces this session too,
 * and `nextCookies()` stores the new session cookie, so this browser stays signed in. Setting a
 * cookie makes Next re-render the page (with the new session: see `authHeaders`), so there's no
 * `refresh()`.
 */
export async function changePasswordAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAccountOwner();
    // Passwords are not trimmed: `formString` would change what the user typed.
    const field = (name: string) => {
      const value = formData.get(name);
      return typeof value === "string" ? value : "";
    };
    const currentPassword = field("currentPassword");
    const newPassword = field("newPassword");
    if (!currentPassword) throw new ActionError("Enter your current password.");
    if (newPassword.length < 8) throw new ActionError("Use at least 8 characters.");
    if (newPassword !== field("confirmPassword")) {
      throw new ActionError("The new passwords don't match.");
    }
    if (newPassword === currentPassword) {
      throw new ActionError("Choose a password different from your current one.");
    }
    await auth.api.changePassword({
      headers: await headers(),
      body: { currentPassword, newPassword, revokeOtherSessions: true },
    });
    return null;
  });
}

/** Signs out one of the user's other sessions, identified by session id (never by token). */
export async function revokeSessionAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireAccountOwner();
    const sessionId = formString(formData, "sessionId");
    if (sessionId === session.session.id) {
      throw new ActionError("Use “Sign out” to end this session.");
    }
    const requestHeaders = await headers();
    const sessions = await auth.api.listSessions({ headers: requestHeaders });
    const target = sessions.find((row) => row.id === sessionId);
    if (!target) throw new ActionError("This session has already ended.");
    await auth.api.revokeSession({ headers: requestHeaders, body: { token: target.token } });
    refresh();
    return null;
  });
}

export async function revokeOtherSessionsAction(
  _previous: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAccountOwner();
    await auth.api.revokeOtherSessions({ headers: await headers() });
    refresh();
    return null;
  });
}
