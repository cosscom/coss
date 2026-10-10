"use server";

import { DASHBOARD_PATH, validateOrgName, validateOrgSlug } from "@coss/auth/slugs";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { auth } from "@/lib/auth";
import { requireOrgMember, requireOrgPermission } from "@/lib/session";

/**
 * Renames the organization and/or changes its slug. A new slug moves every dashboard URL, so the
 * browser follows it to the new settings page. Better Auth re-checks `organization:update`, slug
 * uniqueness and (through our `beforeUpdateOrganization` hook) the name and slug rules.
 */
export async function updateOrganizationAction(
  _previous: ActionResult<{ slug: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ slug: string }>> {
  const result = await runAction(async () => {
    const { organization } = await requireOrgPermission(formString(formData, "orgSlug"), {
      organization: ["update"],
    });
    const name = formString(formData, "name");
    const slug = formString(formData, "slug").toLowerCase();
    const invalid = validateOrgName(name) ?? validateOrgSlug(slug);
    if (invalid) throw new ActionError(invalid);
    if (name === organization.name && slug === organization.slug) return { slug };

    // organizationId is explicit: Better Auth would otherwise fall back to the active org.
    await auth.api.updateOrganization({
      headers: await headers(),
      body: { organizationId: organization.id, data: { name, slug } },
    });
    if (slug === organization.slug) refresh();
    return { slug };
  });
  if (result.ok && result.data.slug !== formString(formData, "orgSlug")) {
    redirect(`/${result.data.slug}/settings`);
  }
  return result;
}

/**
 * Removes the signed-in user from the organization. Better Auth refuses when they are its last
 * owner. Their API keys stay: keys belong to the organization, not to whoever created them.
 */
export async function leaveOrganizationAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { organization, suspended } = await requireOrgMember(formString(formData, "orgSlug"));
    if (suspended) throw new ActionError("This organization is suspended.");
    await auth.api.leaveOrganization({
      headers: await headers(),
      body: { organizationId: organization.id },
    });
    return null;
  });
  if (result.ok) redirect(DASHBOARD_PATH);
  return result;
}
