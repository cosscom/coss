"use server";

import { DASHBOARD_PATH } from "@coss/auth/slugs";
import { isId } from "@coss/db/id";
import {
  changeRateLimitOverride,
  isOverridableBucket,
  type LimitRule,
  MAX_RULE_VALUE,
  parsePeriod,
} from "@coss/ratelimit";
import {
  ADMIN_REASON_MAX_LENGTH,
  type AdminActor,
  disableOrganizationSso,
  disableOrganizationSsoRequirement,
  recordAdminAction,
  resetUserTwoFactor,
  revokeApiKeyAsAdmin,
  suspendOrganization,
  unlinkUserSso,
  unsuspendOrganization,
} from "@coss/tenancy/admin";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { requirePlatformAdminAction } from "@/lib/session";

/**
 * Platform admin actions. Better Auth's admin HTTP routes are disabled (`disabledPaths`), so these
 * are the only way to ban, change roles, impersonate or revoke sessions, and each one records an
 * `admin_audit_event`. Better Auth still re-checks the caller's admin role on every call.
 */

/** Ban durations offered by the dashboard, in seconds (`""` = permanent). */
const BAN_DURATIONS: Record<string, number | undefined> = {
  "": undefined,
  "1d": 86_400,
  "7d": 7 * 86_400,
  "30d": 30 * 86_400,
};

function formUserId(formData: FormData): string {
  const userId = formString(formData, "userId");
  if (!isId("user", userId)) throw new ActionError("User not found.");
  return userId;
}

function formOrganizationId(formData: FormData): string {
  const organizationId = formString(formData, "organizationId");
  if (!isId("org", organizationId)) throw new ActionError("Organization not found.");
  return organizationId;
}

function optionalReason(formData: FormData): string | null {
  const reason = formString(formData, "reason");
  if (reason.length > ADMIN_REASON_MAX_LENGTH) {
    throw new ActionError(`The reason must be at most ${ADMIN_REASON_MAX_LENGTH} characters.`);
  }
  return reason || null;
}

function requiredReason(formData: FormData): string {
  const reason = optionalReason(formData);
  if (!reason) throw new ActionError("Enter a reason. It is kept in the audit log.");
  return reason;
}

/** An admin may not act on their own account from the console (lockout and audit hygiene). */
function assertNotSelf(actor: AdminActor, userId: string): void {
  if (actor.userId === userId) throw new ActionError("You can't do that to your own account.");
}

async function targetEmail(userId: string): Promise<string> {
  const user = await auth.api.getUser({ headers: await headers(), query: { id: userId } });
  return user.email;
}

/** Bans a user: signs them out everywhere and blocks sign-in until unbanned or expired. */
export async function banUserAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const userId = formUserId(formData);
    assertNotSelf(actor, userId);
    const reason = requiredReason(formData);
    const duration = formString(formData, "duration");
    if (!Object.hasOwn(BAN_DURATIONS, duration)) throw new ActionError("Choose a ban duration.");
    const banExpiresIn = BAN_DURATIONS[duration];

    const email = await targetEmail(userId);
    // Better Auth deletes the user's sessions as part of the ban.
    await auth.api.banUser({
      headers: await headers(),
      body: { userId, banReason: reason, ...(banExpiresIn && { banExpiresIn }) },
    });
    await recordAdminAction({
      actor,
      action: "user.ban",
      target: { type: "user", id: userId },
      reason,
      metadata: { email, duration: duration || "permanent" },
    });
    refresh();
    return null;
  });
}

export async function unbanUserAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const userId = formUserId(formData);
    const reason = optionalReason(formData);
    const email = await targetEmail(userId);
    await auth.api.unbanUser({ headers: await headers(), body: { userId } });
    await recordAdminAction({
      actor,
      action: "user.unban",
      target: { type: "user", id: userId },
      reason,
      metadata: { email },
    });
    refresh();
    return null;
  });
}

/** Grants or removes the platform admin role. */
export async function setUserRoleAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const userId = formUserId(formData);
    assertNotSelf(actor, userId);
    const role = formString(formData, "role");
    if (role !== "admin" && role !== "user") throw new ActionError("Choose a role.");
    const reason = optionalReason(formData);

    const email = await targetEmail(userId);
    await auth.api.setRole({ headers: await headers(), body: { userId, role } });
    await recordAdminAction({
      actor,
      action: "user.set_role",
      target: { type: "user", id: userId },
      reason,
      metadata: { email, role },
    });
    refresh();
    return null;
  });
}

/**
 * Account recovery for a user who lost their authenticator and backup codes: turns their
 * two-factor authentication off so their password alone signs them in.
 */
export async function resetTwoFactorAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const userId = formUserId(formData);
    assertNotSelf(actor, userId);
    await resetUserTwoFactor({ userId, reason: requiredReason(formData), actor });
    refresh();
    return null;
  });
}

/**
 * Recovery for a user whose SSO sign-in broke: unlinks their SSO accounts and signs out their SSO
 * sessions. They can link again on their next SSO sign-in, or set a password.
 */
export async function unlinkUserSsoAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const userId = formUserId(formData);
    assertNotSelf(actor, userId);
    await unlinkUserSso({ userId, reason: requiredReason(formData), actor });
    refresh();
    return null;
  });
}

/** Signs out every session of the user. */
export async function revokeUserSessionsAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const userId = formUserId(formData);
    assertNotSelf(actor, userId);
    const reason = optionalReason(formData);
    const email = await targetEmail(userId);
    await auth.api.revokeUserSessions({ headers: await headers(), body: { userId } });
    await recordAdminAction({
      actor,
      action: "user.revoke_sessions",
      target: { type: "user", id: userId },
      reason,
      metadata: { email },
    });
    refresh();
    return null;
  });
}

/**
 * Signs out one session. The form carries only the session id; its token (a credential) is looked
 * up here and never sent to the browser.
 */
export async function revokeUserSessionAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const userId = formUserId(formData);
    const reason = optionalReason(formData);
    const sessionId = formString(formData, "sessionId");
    const requestHeaders = await headers();
    const { sessions } = await auth.api.listUserSessions({
      headers: requestHeaders,
      body: { userId },
    });
    const target = sessions.find((session) => session.id === sessionId);
    if (!target) throw new ActionError("This session has already ended.");
    await auth.api.revokeUserSession({
      headers: requestHeaders,
      body: { sessionToken: target.token },
    });
    await recordAdminAction({
      actor,
      action: "user.revoke_session",
      target: { type: "user", id: userId },
      reason,
      metadata: { sessionId, impersonatedBy: target.impersonatedBy ?? null },
    });
    refresh();
    return null;
  });
}

/**
 * Starts an impersonation session (one hour) after recording why. Live API keys can't be created
 * while impersonating, and the banner offers to stop.
 */
export async function impersonateUserAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const userId = formUserId(formData);
    assertNotSelf(actor, userId);
    const reason = requiredReason(formData);
    const email = await targetEmail(userId);
    // Better Auth refuses admins and banned users; the response switches the session cookies.
    await auth.api.impersonateUser({ headers: await headers(), body: { userId } });
    await recordAdminAction({
      actor,
      action: "user.impersonate",
      target: { type: "user", id: userId },
      reason,
      metadata: { email },
    });
    redirect(DASHBOARD_PATH);
  });
}

/** Suspends an organization (API keys refused, webhooks held, dashboard read-only). */
export async function suspendOrganizationAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    await suspendOrganization({
      organizationId: formOrganizationId(formData),
      reason: requiredReason(formData),
      actor,
    });
    refresh();
    return null;
  });
}

export async function unsuspendOrganizationAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    await unsuspendOrganization({
      organizationId: formOrganizationId(formData),
      reason: optionalReason(formData),
      actor,
    });
    refresh();
    return null;
  });
}

/** Revokes one of an organization's API keys (e.g. a leaked key). */
export async function revokeApiKeyAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    await revokeApiKeyAsAdmin({
      organizationId: formOrganizationId(formData),
      keyId: formString(formData, "keyId"),
      reason: requiredReason(formData),
      actor,
    });
    refresh();
    return null;
  });
}

/** Lets the organization's members open it without SSO again (their IdP is down). */
export async function disableOrganizationSsoRequirementAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    await disableOrganizationSsoRequirement({
      organizationId: formOrganizationId(formData),
      reason: requiredReason(formData),
      actor,
    });
    refresh();
    return null;
  });
}

/** Stops SSO sign-in for the organization (and its requirement) until its admins save it again. */
export async function disableOrganizationSsoAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    await disableOrganizationSso({
      organizationId: formOrganizationId(formData),
      reason: requiredReason(formData),
      actor,
    });
    refresh();
    return null;
  });
}

function formBucket(formData: FormData): string {
  const bucket = formString(formData, "bucket");
  if (!isOverridableBucket(bucket)) throw new ActionError("This rate limit can't be overridden.");
  return bucket;
}

function ruleNumber(formData: FormData, name: string, label: string): number | undefined {
  const value = formString(formData, name);
  if (!value) return undefined;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > MAX_RULE_VALUE) {
    throw new ActionError(`${label} must be a whole number from 1 to ${MAX_RULE_VALUE}.`);
  }
  return number;
}

function formRule(formData: FormData): LimitRule {
  const limit = ruleNumber(formData, "limit", "The limit");
  if (limit === undefined) throw new ActionError("Enter a limit.");
  const burst = ruleNumber(formData, "burst", "The burst");
  let periodMs: number;
  try {
    periodMs = parsePeriod(formString(formData, "period"));
  } catch {
    throw new ActionError("Enter a period such as 1s, 5m, 1h or 1d.");
  }
  if (periodMs < 1 || periodMs > MAX_RULE_VALUE) {
    throw new ActionError("The period must be between 1ms and 24 days.");
  }
  return { limit, periodMs, ...(burst === undefined ? {} : { burst }) };
}

/** Gives an organization its own rule for one rate limit bucket (applies within a minute). */
export async function setRateLimitOverrideAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const organizationId = formOrganizationId(formData);
    const bucket = formBucket(formData);
    const rule = formRule(formData);
    const reason = requiredReason(formData);
    await changeRateLimitOverride({ organizationId, bucket, rule, actor, reason });
    refresh();
    return null;
  });
}

/** Puts one of an organization's rate limits back to the default (applies within a minute). */
export async function resetRateLimitOverrideAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { actor } = await requirePlatformAdminAction();
    const organizationId = formOrganizationId(formData);
    const bucket = formBucket(formData);
    const reason = optionalReason(formData);
    await changeRateLimitOverride({ organizationId, bucket, rule: null, actor, reason });
    refresh();
    return null;
  });
}
