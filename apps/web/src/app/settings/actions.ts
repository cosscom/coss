"use server";

import { isSocialProvider, type SocialProvider } from "@coss/auth/constants";
import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountDeletionBlocked, deleteAccount } from "@/lib/account-deletion";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, ForbiddenError, formString, runAction } from "@/lib/actions";
import { auth, type Session } from "@/lib/auth";
import { listOwnSessions, requireSession } from "@/lib/session";
import { enabledSocialProviders } from "@/lib/social";

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
    const sessions = await listOwnSessions(session.user.id);
    const target = sessions.find((row) => row.id === sessionId);
    if (!target) throw new ActionError("This session has already ended.");
    await auth.api.revokeSession({ headers: await headers(), body: { token: target.token } });
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

/**
 * Adding a way to sign in (a provider, a password) needs a recent sign-in, as Better Auth's
 * `freshSessionMiddleware` does for unlinking: a stolen session cookie must not become a way in
 * that outlives the session.
 */
async function requireFreshAccountOwner(): Promise<Session> {
  const session = await requireAccountOwner();
  const { freshAge } = (await auth.$context).sessionConfig;
  if (Date.now() - new Date(session.session.createdAt).getTime() > freshAge * 1000) {
    throw new ActionError("For your security, sign out and sign in again, then retry.");
  }
  return session;
}

function socialProviderField(formData: FormData): SocialProvider {
  const provider = formString(formData, "provider");
  if (!isSocialProvider(provider)) throw new ActionError("Unknown sign-in provider.");
  return provider;
}

/**
 * Sends the browser to Google or GitHub to connect that account; Better Auth's callback links it
 * and returns to /settings/security (`?error=` on failure). The account may use another address.
 */
export async function connectSocialAccountAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireFreshAccountOwner();
    const provider = socialProviderField(formData);
    if (!enabledSocialProviders().includes(provider)) {
      throw new ActionError("This sign-in provider isn't available.");
    }
    const { url } = await auth.api.linkSocialAccount({
      headers: await headers(),
      body: {
        provider,
        callbackURL: "/settings/security",
        errorCallbackURL: "/settings/security",
        disableRedirect: true,
      },
    });
    redirect(url);
  });
}

/** Better Auth refuses to remove the account's last way to sign in (passkeys aside). */
export async function disconnectSocialAccountAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAccountOwner();
    const provider = socialProviderField(formData);
    const requestHeaders = await headers();
    const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
    const account = accounts.find((row) => row.providerId === provider);
    if (!account) throw new ActionError("This account is no longer connected.");
    // The row id; Better Auth only unlinks the session user's own accounts.
    await auth.api.unlinkAccount({ headers: requestHeaders, body: { accountId: account.id } });
    refresh();
    return null;
  });
}

/**
 * A first password for an account created with Google or GitHub (it also lets the user turn
 * on an authenticator app, which Better Auth confirms with the password).
 */
export async function setPasswordAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireFreshAccountOwner();
    // Passwords are not trimmed: `formString` would change what the user typed.
    const field = (name: string) => {
      const value = formData.get(name);
      return typeof value === "string" ? value : "";
    };
    const newPassword = field("newPassword");
    if (newPassword.length < 8) throw new ActionError("Use at least 8 characters.");
    if (newPassword !== field("confirmPassword")) {
      throw new ActionError("The passwords don't match.");
    }
    await auth.api.setPassword({ headers: await headers(), body: { newPassword } });
    refresh();
    return null;
  });
}

/**
 * Deletes the signed-in user's account (`deleteAccount`): typing the email address confirms it,
 * and it needs a recent sign-in like adding a way to sign in. The session went with the account;
 * its cookies are expired so this browser doesn't keep sending them.
 */
export async function deleteAccountAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const session = await requireFreshAccountOwner();
    const { user } = session;
    if (formString(formData, "confirm").toLowerCase() !== user.email.toLowerCase()) {
      throw new ActionError(`Type ${user.email} to confirm.`);
    }
    try {
      await deleteAccount({ id: user.id, email: user.email });
    } catch (error) {
      if (error instanceof AccountDeletionBlocked) throw new ActionError(error.message);
      throw error;
    }
    const cookieStore = await cookies();
    const { authCookies } = await auth.$context;
    for (const cookie of [
      authCookies.sessionToken,
      authCookies.sessionData,
      authCookies.dontRememberToken,
    ]) {
      const { path, domain, secure } = cookie.attributes;
      cookieStore.set(cookie.name, "", { path, domain, secure, maxAge: 0 });
    }
    return null;
  });
  if (result.ok) redirect("/sign-in");
  return result;
}
