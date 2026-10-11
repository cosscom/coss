"use server";

import { LOG_DRAIN_SOURCES, type LogDrainSource } from "@coss/logs/schemas";
import { getEnvironment } from "@coss/tenancy";
import {
  createLogDrain,
  deleteLogDrain,
  getLogDrain,
  revealLogDrainSecret,
  updateLogDrain,
  WebhookError,
} from "@coss/webhooks";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { type OrgContext, requireOrgPermission } from "@/lib/session";
import { webhookManagementDeps } from "@/lib/webhooks";

/** The environment addressed by the form's slugs, inside the already-authorized organization. */
async function environmentFromForm(context: OrgContext, formData: FormData) {
  const found = await getEnvironment({
    organizationId: context.organization.id,
    projectSlug: formString(formData, "projectSlug"),
    envSlug: formString(formData, "envSlug"),
  });
  if (!found) throw new ActionError("Environment not found.");
  return found;
}

/** The drain addressed by the form, checked to belong to that environment. */
async function drainFromForm(context: OrgContext, formData: FormData) {
  const { environment } = await environmentFromForm(context, formData);
  const drain = await getLogDrain({
    organizationId: context.organization.id,
    id: formString(formData, "drainId"),
  });
  if (!drain || drain.environmentId !== environment.id) {
    throw new ActionError("Log drain not found.");
  }
  return drain;
}

function drainAudit(
  context: OrgContext,
  drain: { id: string; url: string; projectId: string; environmentId: string },
  action: string,
  metadata?: Record<string, unknown>,
) {
  return recordAudit(context.session, {
    organizationId: context.organization.id,
    action,
    target: { type: "log_drain", id: drain.id, label: drain.url },
    projectId: drain.projectId,
    environmentId: drain.environmentId,
    metadata,
  });
}

/** The checked sources; every source checked means "all", which includes sources added later. */
function sourcesFromForm(formData: FormData): LogDrainSource[] {
  const known = new Set<string>(LOG_DRAIN_SOURCES);
  const selected = formData.getAll("sources").filter((value) => typeof value === "string");
  if (selected.some((source) => !known.has(source))) throw new ActionError("Unknown source.");
  if (selected.length === 0) throw new ActionError("Select at least one source.");
  return selected.length === known.size ? [] : (selected as LogDrainSource[]);
}

function userFacing<T>(body: () => Promise<T>): Promise<T> {
  return body().catch((error: unknown) => {
    if (error instanceof WebhookError) throw new ActionError(error.message);
    throw error;
  });
}

/** Creates a drain; the result carries its signing secret to show right away. */
export async function createLogDrainAction(
  _previous: ActionResult<{ id: string; secret: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; secret: string }>> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      logDrain: ["create"],
    });
    const { environment } = await environmentFromForm(context, formData);
    const { drain, secret } = await userFacing(() =>
      createLogDrain(
        {
          organizationId: context.organization.id,
          environmentId: environment.id,
          url: formString(formData, "url"),
          description: formString(formData, "description"),
          sources: sourcesFromForm(formData),
          userId: context.session.user.id,
        },
        webhookManagementDeps(),
      ),
    );
    await drainAudit(context, drain, "log_drain.created", { sources: drain.sources });
    refresh();
    return { id: drain.id, secret };
  });
}

export async function setLogDrainEnabledAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      logDrain: ["update"],
    });
    const drain = await drainFromForm(context, formData);
    const enabled = formString(formData, "enabled") === "true";
    await updateLogDrain(
      { organizationId: context.organization.id, id: drain.id, enabled },
      webhookManagementDeps(),
    );
    await drainAudit(context, drain, enabled ? "log_drain.enabled" : "log_drain.disabled");
    refresh();
    return null;
  });
}

export async function updateLogDrainSourcesAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      logDrain: ["update"],
    });
    const drain = await drainFromForm(context, formData);
    const updated = await userFacing(() =>
      updateLogDrain(
        {
          organizationId: context.organization.id,
          id: drain.id,
          sources: sourcesFromForm(formData),
        },
        webhookManagementDeps(),
      ),
    );
    await drainAudit(context, drain, "log_drain.updated", { sources: updated.sources });
    refresh();
    return null;
  });
}

export async function deleteLogDrainAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      logDrain: ["delete"],
    });
    const drain = await drainFromForm(context, formData);
    await deleteLogDrain({ organizationId: context.organization.id, id: drain.id });
    await drainAudit(context, drain, "log_drain.deleted");
    redirect(
      `/${context.organization.slug}/projects/${formString(formData, "projectSlug")}/` +
        `${formString(formData, "envSlug")}/log-drains`,
    );
  });
}

/** The signing secret, for members who may manage the drain. */
export async function revealLogDrainSecretAction(
  _previous: ActionResult<{ secret: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ secret: string }>> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      logDrain: ["update"],
    });
    const drain = await drainFromForm(context, formData);
    const secret = revealLogDrainSecret(drain, webhookManagementDeps().secretsKeys);
    // Who has seen a signing secret matters when it leaks.
    await drainAudit(context, drain, "log_drain.secret_revealed");
    return { secret };
  });
}
