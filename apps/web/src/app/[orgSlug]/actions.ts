"use server";

import { createProject } from "@coss/tenancy";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { requireOrgPermission } from "@/lib/session";

/** Creates a project (with production + development environments) and opens it. */
export async function createProjectAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { organization } = await requireOrgPermission(formString(formData, "orgSlug"), {
      project: ["create"],
    });
    const name = formString(formData, "name");
    if (!name) throw new ActionError("Enter a project name.");
    const { project } = await createProject({ organizationId: organization.id, name });
    return `/${organization.slug}/projects/${project.slug}`;
  });
  if (result.ok) redirect(result.data);
  return result;
}
