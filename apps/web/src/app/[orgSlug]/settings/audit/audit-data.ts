import "server-only";
import { BillingError } from "@coss/billing";
import type { OrgAuditFilters } from "@coss/logs";
import { apiKeyNames, listEnvironments, listProjects } from "@coss/tenancy";
import { notFound } from "next/navigation";
import { planGate } from "@/lib/billing";
import { requireOrgMember } from "@/lib/session";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

/**
 * The organization whose audit log is served, for members who may read it (owners, admins).
 * `planAllows` is false on plans without the audit log: it keeps recording, but only shows
 * an upgrade prompt.
 */
export async function requireAuditAccess(orgSlug: string) {
  const context = await requireOrgMember(orgSlug);
  if (!context.can({ audit: ["read"] })) notFound();
  const planAllows = await planGate()
    .requireFeature(context.organization.id, "auditLog")
    .then(() => true)
    .catch((error: unknown) => {
      if (error instanceof BillingError) return false;
      throw error;
    });
  return { ...context, planAllows };
}

/** `?action=domain.` (a prefix ending in `.`, or an exact action) and `?actor=<id>`. */
export function auditFiltersFrom(search: SearchParams | URLSearchParams): OrgAuditFilters {
  const get = (name: string) =>
    search instanceof URLSearchParams ? (search.get(name) ?? undefined) : single(search[name]);
  const action = get("action");
  const actor = get("actor");
  return {
    ...(action ? { actions: [action] } : {}),
    ...(actor ? { actorId: actor } : {}),
  };
}

/** Labels for the projects/environments and API keys events name. */
export async function auditLabels(organizationId: string, keyIds: string[]) {
  const projects = await listProjects({ organizationId });
  const environments = await Promise.all(
    projects.map(async (project) => ({
      project,
      environments: await listEnvironments({ organizationId, projectId: project.id }),
    })),
  );
  const environmentNames: Record<string, string> = {};
  for (const entry of environments) {
    for (const environment of entry.environments) {
      environmentNames[environment.id] = `${entry.project.name} · ${environment.name}`;
    }
  }
  return { environmentNames, keyNames: await apiKeyNames({ organizationId, ids: keyIds }) };
}
