"use server";

import { deleteTrackingRule, upsertTrackingRule } from "@coss/email";
import { TrackingRuleInput } from "@coss/email/schemas";
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

/** Sets the environment default (no `category`) or the rule for one category. */
export async function saveTrackingRuleAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      environment: ["update"],
    });
    const env = await environmentFromForm(context, formData);
    const parsed = TrackingRuleInput.safeParse({
      category: formString(formData, "category") || null,
      opens: formData.get("opens") === "on",
      clicks: formData.get("clicks") === "on",
    });
    if (!parsed.success) {
      throw new ActionError(`Category: ${parsed.error.issues[0]?.message ?? "Invalid value."}`);
    }
    if (!(await upsertTrackingRule(env, parsed.data))) {
      throw new ActionError("Environment not found.");
    }
    refresh();
    return null;
  });
}

export async function deleteTrackingRuleAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      environment: ["update"],
    });
    const env = await environmentFromForm(context, formData);
    // Scoped by environment (and so organization): another environment's rule is "not found".
    if (!(await deleteTrackingRule(env, formString(formData, "ruleId")))) {
      throw new ActionError("Rule not found.");
    }
    refresh();
    return null;
  });
}
