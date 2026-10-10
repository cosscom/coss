"use server";

import { INVITABLE_ORG_ROLES, type InvitableOrgRole } from "@coss/auth/permissions";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
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
