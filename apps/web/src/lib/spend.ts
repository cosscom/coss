import "server-only";
import {
  type Budget,
  type BudgetHold,
  type BudgetStatus,
  evaluateBudgets,
  listBudgetHolds,
  listBudgets,
  type SpendBreakdown,
  spendBreakdown,
} from "@coss/billing";
import {
  listOrganizationApiKeys,
  listOrganizationMembers,
  listProjectsWithEnvironments,
} from "@coss/tenancy";

/** The names the Spend pages show for ids (members, projects, environments, keys). */
export type SpendNames = {
  members: Map<string, { name: string; email: string; role: string }>;
  projects: Map<string, string>;
  environments: Map<string, { name: string; projectId: string; mode: "live" | "sandbox" }>;
  keys: Map<
    string,
    { name: string; environmentId: string; projectId: string; ownerUserId: string | null }
  >;
};

export type SpendOverview = {
  spend: SpendBreakdown;
  budgets: Budget[];
  holds: BudgetHold[];
  statuses: BudgetStatus[];
  names: SpendNames;
};

/** Everything the Spend pages show for the running month. */
export async function spendOverview(
  organizationId: string,
  now: Date = new Date(),
): Promise<SpendOverview> {
  const [spend, budgets, holds, members, projects, keys] = await Promise.all([
    spendBreakdown(organizationId, now),
    listBudgets(organizationId),
    listBudgetHolds(organizationId),
    listOrganizationMembers({ organizationId }),
    listProjectsWithEnvironments({ organizationId }),
    listOrganizationApiKeys({ organizationId }),
  ]);
  const names: SpendNames = {
    members: new Map(
      members.map((m) => [m.user.id, { name: m.user.name, email: m.user.email, role: m.role }]),
    ),
    projects: new Map(projects.map(({ project }) => [project.id, project.name])),
    environments: new Map(
      projects.flatMap(({ project, environments }) =>
        environments.map((env) => [
          env.id,
          { name: env.name, projectId: project.id, mode: env.mode },
        ]),
      ),
    ),
    keys: new Map(
      keys.map((key) => [
        key.id,
        {
          name: key.name ?? key.start ?? key.id,
          environmentId: key.environmentId,
          projectId: key.projectId,
          ownerUserId: key.ownerUserId,
        },
      ]),
    ),
  };
  return { spend, budgets, holds, statuses: evaluateBudgets(budgets, spend.lines), names };
}

/** A member's name (or address), or what is left of a former one. */
export function memberLabel(names: SpendNames, userId: string): string {
  const found = names.members.get(userId);
  return found ? found.name || found.email : "Former member";
}

/** "Project · Environment", or what is left of a deleted one. */
export function environmentLabel(names: SpendNames, environmentId: string): string {
  const env = names.environments.get(environmentId);
  if (!env) return "Deleted environment";
  return `${names.projects.get(env.projectId) ?? "Deleted project"} · ${env.name}`;
}

export function projectLabel(names: SpendNames, projectId: string): string {
  return names.projects.get(projectId) ?? "Deleted project";
}

export function keyLabel(names: SpendNames, apiKeyId: string): string {
  return names.keys.get(apiKeyId)?.name ?? "Revoked key";
}
