"use server";

import { cancelScheduledEmail } from "@coss/email";
import { getEnvironment } from "@coss/tenancy";
import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { requireOrgPermission } from "@/lib/session";

/** Cancels a scheduled email of the environment addressed by the form's slugs. */
export async function cancelEmailAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      email: ["send"],
    });
    const found = await getEnvironment({
      organizationId: context.organization.id,
      projectSlug: formString(formData, "projectSlug"),
      envSlug: formString(formData, "envSlug"),
    });
    if (!found) throw new ActionError("Environment not found.");
    // Scoped to this environment (and so this organization): other emails are "not found".
    await cancelScheduledEmail({
      organizationId: context.organization.id,
      environmentId: found.environment.id,
      emailId: formString(formData, "emailId"),
    });
    refresh();
    return null;
  });
}
