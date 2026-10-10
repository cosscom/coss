"use server";

import {
  assignableOrgRoles,
  INVITABLE_ORG_ROLES,
  type InvitableOrgRole,
  isOrgRole,
} from "@coss/auth/permissions";
import { getOrganizationMember, getPendingInvitation } from "@coss/tenancy";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, ForbiddenError, formString, runAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { requireOrgPermission } from "@/lib/session";

function isInvitableRole(value: string): value is InvitableOrgRole {
  return (INVITABLE_ORG_ROLES as readonly string[]).includes(value);
}

/** Invites by email. The accept link is logged to the web server console (no delivery yet). */
export async function inviteMemberAction(
  _previous: ActionResult<{ email: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  return runAction(async () => {
    const { organization } = await requireOrgPermission(formString(formData, "orgSlug"), {
      invitation: ["create"],
    });
    const email = formString(formData, "email").toLowerCase();
    if (!z.email().safeParse(email).success) throw new ActionError("Enter a valid email address.");
    const role = formString(formData, "role");
    if (!isInvitableRole(role)) throw new ActionError("Choose a role: admin or member.");

    // organizationId is explicit: Better Auth would otherwise fall back to the active org.
    await auth.api.createInvitation({
      headers: await headers(),
      body: { email, role, organizationId: organization.id },
    });
    refresh();
    return { email };
  });
}

/** Cancels a pending invitation of this organization; its accept link stops working. */
export async function cancelInvitationAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization } = await requireOrgPermission(formString(formData, "orgSlug"), {
      invitation: ["cancel"],
    });
    const invitation = await getPendingInvitation({
      organizationId: organization.id,
      invitationId: formString(formData, "invitationId"),
    });
    if (!invitation) throw new ActionError("This invitation is no longer pending.");

    // The session-bound call lets Better Auth re-check membership and invitation:cancel itself.
    await auth.api.cancelInvitation({
      headers: await headers(),
      body: { invitationId: invitation.id },
    });
    refresh();
    return null;
  });
}

/**
 * Changes a member's role. `assignableOrgRoles` gives a clear error for what Better Auth would
 * reject anyway; Better Auth re-checks everything, including that the last owner can't step down.
 */
export async function updateMemberRoleAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const { organization, member } = await requireOrgPermission(formString(formData, "orgSlug"), {
      member: ["update"],
    });
    const target = await getOrganizationMember({
      organizationId: organization.id,
      memberId: formString(formData, "memberId"),
    });
    if (!target) throw new ActionError("Member not found.");
    const role = formString(formData, "role");
    if (!isOrgRole(role)) throw new ActionError("Choose a role.");
    if (!assignableOrgRoles(member.role, target.role).includes(role)) {
      throw new ForbiddenError("Only owners can change an owner's role or make someone an owner.");
    }
    if (role === target.role) return null;

    // organizationId is explicit: Better Auth would otherwise fall back to the active org.
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: { memberId: target.id, role, organizationId: organization.id },
    });
    refresh();
    return null;
  });
}
