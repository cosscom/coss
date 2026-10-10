"use server";

import {
  checkDomain,
  createDomain,
  deleteDomain,
  getDomain,
  restartDomainVerification,
} from "@coss/email";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { emailRuntime } from "@/lib/email-runtime";
import { type OrgContext, requireOrgPermission } from "@/lib/session";

/** A manual "Verify now" waits at least this long after the previous check. */
const MANUAL_CHECK_INTERVAL_MS = 10_000;

/** The domain addressed by the form, inside the already-authorized organization. */
async function domainFromForm(context: OrgContext, formData: FormData) {
  const domain = await getDomain({
    organizationId: context.organization.id,
    id: formString(formData, "domainId"),
  });
  if (!domain) throw new ActionError("Domain not found.");
  return domain;
}

/** Claims the domain, creates its provider identity, and opens its DNS records page. */
export async function addDomainAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      domain: ["create"],
    });
    const domain = await createDomain(
      {
        organizationId: context.organization.id,
        name: formString(formData, "name"),
        userId: context.session.user.id,
      },
      emailRuntime().domainDeps,
    );
    redirect(`/${context.organization.slug}/domains/${domain.id}`);
  });
}

/** Checks the provider and DNS now instead of waiting for the next scheduled check. */
export async function verifyDomainAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      domain: ["verify"],
    });
    const domain = await domainFromForm(context, formData);
    const deps = emailRuntime().domainDeps;
    if (domain.status === "failed") {
      await restartDomainVerification(
        { organizationId: domain.organizationId, id: domain.id },
        deps,
      );
    } else {
      const since = domain.lastCheckedAt ? Date.now() - domain.lastCheckedAt.getTime() : Infinity;
      if (since < MANUAL_CHECK_INTERVAL_MS) {
        throw new ActionError("This domain was just checked. Try again in a few seconds.");
      }
      await checkDomain({ organizationId: domain.organizationId, id: domain.id }, deps);
    }
    refresh();
    return null;
  });
}

/** Removes the domain and its provider identity; emails can no longer be sent from it. */
export async function deleteDomainAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      domain: ["delete"],
    });
    const domain = await domainFromForm(context, formData);
    await deleteDomain(
      { organizationId: domain.organizationId, id: domain.id },
      emailRuntime().domainDeps,
    );
    redirect(`/${context.organization.slug}/domains`);
  });
}
