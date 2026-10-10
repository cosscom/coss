"use server";

import { EMAIL_EVENT_TYPES } from "@coss/email/schemas";
import { getEnvironment } from "@coss/tenancy";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookEndpoint,
  retryWebhookDelivery,
  revealWebhookSecret,
  updateWebhookEndpoint,
  WebhookError,
} from "@coss/webhooks";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
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

/** The endpoint addressed by the form, checked to belong to that environment. */
async function endpointFromForm(context: OrgContext, formData: FormData) {
  const { environment } = await environmentFromForm(context, formData);
  const endpoint = await getWebhookEndpoint({
    organizationId: context.organization.id,
    id: formString(formData, "endpointId"),
  });
  if (!endpoint || endpoint.environmentId !== environment.id) {
    throw new ActionError("Webhook endpoint not found.");
  }
  return endpoint;
}

function userFacing<T>(body: () => Promise<T>): Promise<T> {
  return body().catch((error: unknown) => {
    if (error instanceof WebhookError) throw new ActionError(error.message);
    throw error;
  });
}

/** Creates an endpoint; the result carries its signing secret to show right away. */
export async function createWebhookEndpointAction(
  _previous: ActionResult<{ id: string; secret: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; secret: string }>> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      webhook: ["create"],
    });
    const { environment } = await environmentFromForm(context, formData);
    const known = new Set<string>(EMAIL_EVENT_TYPES);
    const selected = formData.getAll("eventTypes").filter((value) => typeof value === "string");
    if (selected.some((type) => !known.has(type))) throw new ActionError("Unknown event type.");
    if (selected.length === 0) throw new ActionError("Select at least one event.");
    const { endpoint, secret } = await userFacing(() =>
      createWebhookEndpoint(
        {
          organizationId: context.organization.id,
          environmentId: environment.id,
          url: formString(formData, "url"),
          description: formString(formData, "description"),
          // Every type selected means "all", which includes types added later.
          eventTypes: selected.length === known.size ? [] : selected,
          userId: context.session.user.id,
        },
        webhookManagementDeps(),
      ),
    );
    refresh();
    return { id: endpoint.id, secret };
  });
}

export async function setWebhookEndpointEnabledAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      webhook: ["update"],
    });
    const endpoint = await endpointFromForm(context, formData);
    await updateWebhookEndpoint(
      {
        organizationId: context.organization.id,
        id: endpoint.id,
        enabled: formString(formData, "enabled") === "true",
      },
      webhookManagementDeps(),
    );
    refresh();
    return null;
  });
}

export async function deleteWebhookEndpointAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      webhook: ["delete"],
    });
    const endpoint = await endpointFromForm(context, formData);
    await deleteWebhookEndpoint({ organizationId: context.organization.id, id: endpoint.id });
    redirect(
      `/${context.organization.slug}/projects/${formString(formData, "projectSlug")}/` +
        `${formString(formData, "envSlug")}/webhooks`,
    );
  });
}

/** The signing secret, for members who may manage the endpoint. */
export async function revealWebhookSecretAction(
  _previous: ActionResult<{ secret: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ secret: string }>> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      webhook: ["update"],
    });
    const endpoint = await endpointFromForm(context, formData);
    return { secret: revealWebhookSecret(endpoint, webhookManagementDeps().secretsKey) };
  });
}

export async function retryWebhookDeliveryAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      webhook: ["update"],
    });
    const endpoint = await endpointFromForm(context, formData);
    const retried = await retryWebhookDelivery({
      organizationId: context.organization.id,
      endpointId: endpoint.id,
      id: formString(formData, "deliveryId"),
    });
    if (!retried) throw new ActionError("This delivery is already scheduled.");
    refresh();
    return null;
  });
}
