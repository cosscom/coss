"use server";

import {
  addRiskListEntry,
  getRiskListEntry,
  RiskError,
  recordRiskFeedback,
  removeRiskListEntry,
} from "@coss/risk";
import { CreateRiskFeedbackRequest, CreateRiskListEntryRequest } from "@coss/risk/schemas";
import { getEnvironment } from "@coss/tenancy";
import { refresh } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { riskHasher } from "@/lib/risk";
import { type OrgContext, requireOrgPermission } from "@/lib/session";

/** The environment addressed by the form's slugs, inside the already-authorized organization. */
async function environmentFromForm(context: OrgContext, formData: FormData) {
  const found = await getEnvironment({
    organizationId: context.organization.id,
    projectSlug: formString(formData, "projectSlug"),
    envSlug: formString(formData, "envSlug"),
  });
  if (!found) throw new ActionError("Environment not found.");
  return {
    scope: { organizationId: context.organization.id, environmentId: found.environment.id },
    projectId: found.project.id,
  };
}

/** Records an outcome for an assessment of this environment (also resolves an open review). */
export async function recordRiskFeedbackAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      risk: ["feedback"],
    });
    const { scope, projectId } = await environmentFromForm(context, formData);
    const parsed = CreateRiskFeedbackRequest.safeParse({
      outcome: formString(formData, "outcome"),
      note: formString(formData, "note") || undefined,
    });
    if (!parsed.success)
      throw new ActionError("Choose an outcome (notes are at most 500 characters).");
    // Only an assessment of this environment (and so of this organization) can be changed.
    const assessment = await recordRiskFeedback(
      riskHasher(),
      scope,
      formString(formData, "assessmentId"),
      parsed.data,
      { source: "dashboard", actorId: context.session.user.id },
    );
    if (!assessment) throw new ActionError("Assessment not found.");
    await recordAudit(context.session, {
      action: "risk_assessment.feedback",
      organizationId: scope.organizationId,
      projectId,
      environmentId: scope.environmentId,
      target: { type: "risk_assessment", id: assessment.id },
      metadata: { outcome: parsed.data.outcome },
    });
    refresh();
    return null;
  });
}

export async function addRiskListEntryAction(
  _previous: ActionResult<{ created: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ created: boolean }>> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      riskList: ["create"],
    });
    const { scope, projectId } = await environmentFromForm(context, formData);
    const parsed = CreateRiskListEntryRequest.safeParse({
      list: formString(formData, "list"),
      type: formString(formData, "type"),
      value: formString(formData, "value"),
      note: formString(formData, "note") || undefined,
    });
    if (!parsed.success) {
      throw new ActionError(parsed.error.issues[0]?.message ?? "Check the entry.");
    }
    let result: Awaited<ReturnType<typeof addRiskListEntry>>;
    try {
      result = await addRiskListEntry(scope, parsed.data);
    } catch (error) {
      if (error instanceof RiskError) throw new ActionError(error.message);
      throw error;
    }
    if (!result) throw new ActionError("Environment not found.");
    if (result.created) {
      await recordAudit(context.session, {
        action: "risk_list_entry.created",
        organizationId: scope.organizationId,
        projectId,
        environmentId: scope.environmentId,
        target: { type: "risk_list_entry", id: result.entry.id, label: result.entry.value },
        metadata: { list: result.entry.list, type: result.entry.type },
      });
      refresh();
    }
    return { created: result.created };
  });
}

export async function removeRiskListEntryAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      riskList: ["delete"],
    });
    const { scope, projectId } = await environmentFromForm(context, formData);
    const entry = await getRiskListEntry(scope, formString(formData, "entryId"));
    if (!entry || !(await removeRiskListEntry(scope, entry.id))) {
      throw new ActionError("List entry not found.");
    }
    await recordAudit(context.session, {
      action: "risk_list_entry.deleted",
      organizationId: scope.organizationId,
      projectId,
      environmentId: scope.environmentId,
      target: { type: "risk_list_entry", id: entry.id, label: entry.value },
      metadata: { list: entry.list, type: entry.type },
    });
    refresh();
    return null;
  });
}
