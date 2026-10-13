"use server";

import {
  checkDomain,
  createDomain,
  createTrackingDomain,
  deleteDomain,
  deleteTrackingDomain,
  getDomain,
  getTrackingDomain,
  restartDomainVerification,
  verifyTrackingDomain,
} from "@coss/email";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { env } from "@/env";
import type { ActionResult } from "@/lib/action-result";
import { ActionError, formString, runAction } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { emailRuntime } from "@/lib/email-runtime";
import { isPlatformAdmin, type OrgContext, requireOrgPermission } from "@/lib/session";
import { isSystemOrganization } from "@/lib/system-organization";

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
        // COSS's own organization sends from coss.com, which no one else may claim: platform admins
        // may add reserved domains there only (anywhere until it is configured, to bootstrap it).
        allowReserved:
          isPlatformAdmin(context.session) &&
          (!env.NOTIFICATIONS_ENVIRONMENT_ID ||
            (await isSystemOrganization(context.organization.id))),
      },
      emailRuntime().domainDeps,
    );
    await recordAudit(context.session, {
      organizationId: context.organization.id,
      action: "domain.created",
      target: { type: "domain", id: domain.id, label: domain.name },
    });
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
    // Its tracking domain shows its own problems on its card.
    await verifyTrackingDomain(
      { organizationId: domain.organizationId, domainId: domain.id },
      deps,
    ).catch((error: unknown) => {
      console.error(`[web:domains] checking the tracking domain of ${domain.id} failed:`, error);
    });
    refresh();
    return null;
  });
}

/** Sets up a subdomain as the domain's tracking domain (the CNAME to publish shows on its page). */
export async function addTrackingDomainAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      domain: ["create"],
    });
    const domain = await domainFromForm(context, formData);
    await createTrackingDomain(
      {
        organizationId: domain.organizationId,
        domainId: domain.id,
        hostname: formString(formData, "hostname"),
      },
      emailRuntime().domainDeps,
    );
    refresh();
    return null;
  });
}

/** Checks the tracking domain now (or starts a `failed` one over). */
export async function checkTrackingDomainAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      domain: ["verify"],
    });
    const domain = await domainFromForm(context, formData);
    const target = { organizationId: domain.organizationId, domainId: domain.id };
    const tracking = await getTrackingDomain(target);
    if (!tracking) throw new ActionError("This domain has no tracking domain.");
    const since = tracking.lastCheckedAt ? Date.now() - tracking.lastCheckedAt.getTime() : Infinity;
    if (tracking.status !== "failed" && since < MANUAL_CHECK_INTERVAL_MS) {
      throw new ActionError("This tracking domain was just checked. Try again in a few seconds.");
    }
    await verifyTrackingDomain(target, emailRuntime().domainDeps);
    refresh();
    return null;
  });
}

/** Removes the tracking domain; links in emails already sent through it stop working. */
export async function removeTrackingDomainAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    const context = await requireOrgPermission(formString(formData, "orgSlug"), {
      domain: ["delete"],
    });
    const domain = await domainFromForm(context, formData);
    await deleteTrackingDomain(
      { organizationId: domain.organizationId, domainId: domain.id },
      emailRuntime().domainDeps,
    );
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
    await recordAudit(context.session, {
      organizationId: context.organization.id,
      action: "domain.deleted",
      target: { type: "domain", id: domain.id, label: domain.name },
    });
    redirect(`/${context.organization.slug}/domains`);
  });
}
