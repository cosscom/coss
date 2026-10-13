"use server";

import {
  connectScim,
  createScimToken,
  disconnectScim,
  revokeScimToken,
  SCIM_TOKEN_LIFETIMES_DAYS,
  type ScimGroupRole,
  type ScimTokenLifetimeDays,
  setScimGroupRoles,
} from "@coss/tenancy";
import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { planGate } from "@/lib/billing";
import { requireOrgPermission } from "@/lib/session";

function formLifetime(formData: FormData): ScimTokenLifetimeDays {
  const days = Number(formString(formData, "lifetimeDays"));
  const lifetime = SCIM_TOKEN_LIFETIMES_DAYS.find((value) => value === days);
  if (!lifetime) throw new ActionError("Choose how long the token stays valid.");
  return lifetime;
}

/** Connects the organization's directory; the first token is returned once. */
export async function connectScimAction(
  _previous: ActionResult<{ token: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ token: string }>> {
  return runAction(async () => {
    const { organization, session } = await requireOrgPermission(formString(formData, "orgSlug"), {
      scim: ["update"],
    });
    await planGate().requireFeature(organization.id, "scim");
    const lifetimeDays = formLifetime(formData);
    const { connectionId, token } = await connectScim({
      organizationId: organization.id,
      actorId: session.user.id,
      lifetimeDays,
    });
    await recordAudit(session, {
      organizationId: organization.id,
      action: "scim_connection.created",
      target: { type: "scim_connection", id: connectionId },
      metadata: { token_lifetime_days: lifetimeDays },
    });
    refresh();
    return { token };
  });
}

/** Issues another token, returned once (rotate, then revoke the old one). */
export async function createScimTokenAction(
  _previous: ActionResult<{ token: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ token: string }>> {
  return runAction(async () => {
    const { organization, session } = await requireOrgPermission(formString(formData, "orgSlug"), {
      scim: ["update"],
    });
    const lifetimeDays = formLifetime(formData);
    const { credentialId, token } = await createScimToken({
      organizationId: organization.id,
      actorId: session.user.id,
      lifetimeDays,
    });
    await recordAudit(session, {
      organizationId: organization.id,
      action: "scim_token.created",
      target: { type: "scim_token", id: credentialId },
      metadata: { lifetime_days: lifetimeDays },
    });
    refresh();
    return { token };
  });
}

export async function revokeScimTokenAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization, session } = await requireOrgPermission(formString(formData, "orgSlug"), {
      scim: ["update"],
    });
    const credentialId = formString(formData, "credentialId");
    await revokeScimToken({
      organizationId: organization.id,
      actorId: session.user.id,
      credentialId,
    });
    await recordAudit(session, {
      organizationId: organization.id,
      action: "scim_token.revoked",
      target: { type: "scim_token", id: credentialId },
    });
    refresh();
    return null;
  });
}

/**
 * Disconnects the directory (members stay). Large directories are released in batches: the
 * page then shows "Disconnecting" and running this again resumes.
 */
export async function disconnectScimAction(
  _previous: ActionResult<{ complete: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ complete: boolean }>> {
  return runAction(async () => {
    const { organization, session } = await requireOrgPermission(formString(formData, "orgSlug"), {
      scim: ["update"],
    });
    const result = await disconnectScim({
      organizationId: organization.id,
      actorId: session.user.id,
    });
    // Once, when the directory is fully released (a large one takes several runs).
    if (result.complete) {
      await recordAudit(session, {
        organizationId: organization.id,
        action: "scim_connection.deleted",
        target: { type: "organization", id: organization.id, label: organization.name },
      });
    }
    refresh();
    return result;
  });
}

/** Replaces the group → role mappings and re-applies them to every directory user. */
export async function saveScimGroupRolesAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization, session } = await requireOrgPermission(formString(formData, "orgSlug"), {
      scim: ["update"],
    });
    const names = formData.getAll("groupName");
    const roles = formData.getAll("role");
    const mappings: ScimGroupRole[] = [];
    names.forEach((name, index) => {
      if (typeof name !== "string" || !name.trim()) return;
      mappings.push({ groupName: name, role: roles[index] === "admin" ? "admin" : "member" });
    });
    await setScimGroupRoles({ organizationId: organization.id, mappings });
    await recordAudit(session, {
      organizationId: organization.id,
      action: "scim_group_roles.updated",
      target: { type: "organization", id: organization.id, label: organization.name },
      metadata: { mappings: mappings.map(({ groupName, role }) => ({ group: groupName, role })) },
    });
    refresh();
    return null;
  });
}
