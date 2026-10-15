import "server-only";
import type { OrgAuditEventOutput } from "@coss/logs/schemas";
import { apiKeyNames, listEnvironments, listProjects } from "@coss/tenancy";

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

/** `api_key.created` → `API key created`. */
export function describeAction(action: string): string {
  const [resource = action, verb = ""] = action.split(".");
  const noun = resource
    .replaceAll("_", " ")
    .replace(/^api key/, "API key")
    .replace(/^sso/, "SSO");
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${verb.replaceAll("_", " ")}`.trim();
}

/** The `field: from → to` changes an event's metadata describes, plus other details. */
export function details(event: OrgAuditEventOutput): string {
  return Object.entries(event.metadata)
    .filter(([key]) => key !== "request_id" && key !== "impersonated_by")
    .map(([key, value]) => {
      if (value && typeof value === "object" && "from" in value && "to" in value) {
        return `${key}: ${String(value.from)} → ${String(value.to)}`;
      }
      return `${key}: ${Array.isArray(value) ? value.join(", ") || "all" : String(value)}`;
    })
    .join(" · ");
}

export function auditActorLabel(
  event: OrgAuditEventOutput,
  keyNames: Record<string, string>,
): string {
  // Changes made in the Hooks portal keep their label (the key or member that opened the portal
  // is the actor id).
  return event.actor_type === "api_key" &&
    event.actor_id &&
    !event.actor_label.startsWith("Portal · ")
    ? `API key ${keyNames[event.actor_id] ?? event.actor_id}`
    : event.actor_label;
}
