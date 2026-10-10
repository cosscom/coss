"use server";

import { addSuppression, getSuppression, removeSuppression } from "@coss/email";
import { CreateSuppressionRequest } from "@coss/email/schemas";
import { getEnvironment } from "@coss/tenancy";
import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { type OrgContext, requireOrgPermission } from "@/lib/session";

/** The environment addressed by the form's slugs, inside the already-authorized organization. */
async function environmentFromForm(context: OrgContext, formData: FormData) {
  const found = await getEnvironment({
    organizationId: context.organization.id,
    projectSlug: formString(formData, "projectSlug"),
    envSlug: formString(formData, "envSlug"),
  });
  if (!found) throw new ActionError("Environment not found.");
  return { organizationId: context.organization.id, environmentId: found.environment.id };
}

/** Adds an address for every email, or for one category when `category` is filled in. */
export async function addSuppressionAction(
  _previous: ActionResult<{ created: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ created: boolean }>> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      suppression: ["create"],
    });
    const env = await environmentFromForm(context, formData);
    const category = formString(formData, "category");
    const parsed = CreateSuppressionRequest.safeParse({
      address: formString(formData, "address"),
      scope: category || undefined,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0] === "scope" ? "Category" : "Address";
      throw new ActionError(`${field}: ${issue?.message ?? "Invalid value."}`);
    }
    const result = await addSuppression(env, parsed.data);
    if (!result) throw new ActionError("Environment not found.");
    refresh();
    return { created: result.created };
  });
}

export async function removeSuppressionAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      suppression: ["delete"],
    });
    const env = await environmentFromForm(context, formData);
    // Only an entry of this environment (and so of this organization) can be removed.
    const suppression = await getSuppression(env, formString(formData, "suppressionId"));
    if (!suppression || !(await removeSuppression(env, suppression.id))) {
      throw new ActionError("Suppression not found.");
    }
    refresh();
    return null;
  });
}
