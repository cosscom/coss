"use server";

import { createEnvironmentApiKey, getEnvironment, getKeyBinding } from "@coss/tenancy";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { liveKeyRestriction } from "@/lib/live-keys";
import { type OrgContext, requireOrgPermission } from "@/lib/session";

/** The environment addressed by the form's slugs, inside the already-authorized organization. */
async function environmentFromForm(context: OrgContext, formData: FormData) {
  const found = await getEnvironment({
    organizationId: context.organization.id,
    projectSlug: formString(formData, "projectSlug"),
    envSlug: formString(formData, "envSlug"),
  });
  if (!found) throw new ActionError("Environment not found.");
  return found.environment;
}

/**
 * Mints a key for this environment. The plaintext key is only ever in this action's result
 * (shown once in a dialog); it is never stored or put in a URL.
 */
export async function createApiKeyAction(
  _previous: ActionResult<{ name: string; key: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ name: string; key: string }>> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      apiKey: ["create"],
    });
    const environment = await environmentFromForm(context, formData);
    if (environment.mode === "live") {
      const restriction = liveKeyRestriction(context.session);
      if (restriction) throw new ActionError(restriction);
    }
    const created = await createEnvironmentApiKey({
      organizationId: context.organization.id,
      environmentId: environment.id,
      name: formString(formData, "name"),
      userId: context.session.user.id,
    });
    refresh();
    return { name: created.name, key: created.key };
  });
}

/** Revokes (deletes) a key after checking it is bound to this environment of this org. */
export async function revokeApiKeyAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      apiKey: ["delete"],
    });
    const environment = await environmentFromForm(context, formData);
    const binding = await getKeyBinding({
      organizationId: context.organization.id,
      keyId: formString(formData, "keyId"),
    });
    if (!binding || binding.environmentId !== environment.id) {
      throw new ActionError("API key not found.");
    }
    // The session-bound call lets Better Auth re-check membership and apiKey:delete itself.
    await auth.api.deleteApiKey({
      headers: await headers(),
      body: { keyId: binding.apiKeyId },
    });
    refresh();
    return null;
  });
}
