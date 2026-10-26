import "server-only";
import {
  type Budget,
  type BudgetHold,
  type BudgetStatus,
  evaluateBudgets,
  listBudgetHolds,
  listBudgets,
  type SpendBreakdown,
  type SpendLine,
  spendBreakdown,
  sumSpend,
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

/** Who a budget status (or hold) is for. */
export function targetLabel(
  names: SpendNames,
  status: Pick<BudgetStatus, "scope" | "targetId">,
): string {
  if (status.scope === "user") return memberLabel(names, status.targetId);
  if (status.scope === "project") return projectLabel(names, status.targetId);
  return keyLabel(names, status.targetId);
}

/** How the Spend page breaks spend down. */
export type SpendGroup = "member" | "project" | "environment" | "key";

/** The budgets a group's rows are held to (`null`: environments have none). */
export const SPEND_GROUP_SCOPE: Record<SpendGroup, BudgetStatus["scope"] | null> = {
  member: "user",
  project: "project",
  environment: null,
  key: "api_key",
};

export type SpendRow = {
  /** The member, project, environment or key id; `""`: spend without that kind of source. */
  key: string;
  label: string;
  detail?: string;
  cents: bigint;
  recipients: number;
  status?: BudgetStatus;
  paused: boolean;
};

/** The breakdown's rows, most spend first; targets with a budget but no spend yet too. */
export function spendRows(overview: SpendOverview, by: SpendGroup): SpendRow[] {
  const { spend, statuses, holds, names } = overview;
  const keyOf: Record<SpendGroup, (line: SpendLine) => string> = {
    member: (line) => line.userId,
    project: (line) => line.projectId,
    environment: (line) => line.environmentId,
    key: (line) => line.apiKeyId,
  };
  const scope = SPEND_GROUP_SCOPE[by];
  const totals = sumSpend(spend.lines, keyOf[by]);
  for (const status of statuses) {
    if (status.scope === scope && !totals.has(status.targetId)) {
      totals.set(status.targetId, { cents: 0n, quantities: {} });
    }
  }
  const rows: SpendRow[] = [...totals].map(([key, total]) => ({
    key,
    cents: total.cents,
    recipients: total.quantities["email.recipients"] ?? 0,
    status: statuses.find((s) => s.scope === scope && s.targetId === key),
    paused: holds.some((hold) => hold.scope === scope && hold.targetId === key),
    ...spendRowLabel(by, key, names),
  }));
  return rows.sort((a, b) =>
    a.cents === b.cents ? b.recipients - a.recipients : a.cents > b.cents ? -1 : 1,
  );
}

/** How a breakdown row is named. `key` `""`: spend without that kind of source. */
function spendRowLabel(
  by: SpendGroup,
  key: string,
  names: SpendNames,
): { label: string; detail?: string } {
  if (by === "member") {
    if (key === "") return { label: "Organization keys and the dashboard" };
    return { label: memberLabel(names, key), detail: names.members.get(key)?.email };
  }
  if (by === "project") {
    return { label: key === "" ? "Unknown project" : projectLabel(names, key) };
  }
  if (by === "environment") {
    const sandbox = names.environments.get(key)?.mode === "sandbox";
    return { label: environmentLabel(names, key), detail: sandbox ? "Sandbox" : undefined };
  }
  if (key === "") {
    return {
      label: "No API key",
      detail: "The dashboard, and usage from before keys were recorded",
    };
  }
  const found = names.keys.get(key);
  const owner = found?.ownerUserId ? memberLabel(names, found.ownerUserId) : null;
  return {
    label: keyLabel(names, key),
    detail: [
      found ? environmentLabel(names, found.environmentId) : null,
      owner ? `${owner}'s personal key` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/** `part`'s share of `total` in percent, to one decimal (`null`: nothing was spent). */
export function spendShare(part: bigint, total: bigint): number | null {
  if (total === 0n) return null;
  return Number((part * 1000n) / total) / 10;
}

/** The budgets used up, so live sending is paused for their targets. */
export function pausedStatuses(overview: SpendOverview): BudgetStatus[] {
  return overview.statuses.filter((status) =>
    overview.holds.some((hold) => hold.scope === status.scope && hold.targetId === status.targetId),
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Each UTC day of the month so far, with its lines' cents summed by `seriesOf`. */
export function dailySpend(
  period: { start: Date; end: Date },
  now: Date,
  lines: readonly SpendLine[],
  seriesOf: (line: SpendLine) => string,
): { day: Date; values: Record<string, number> }[] {
  const end = now < period.end ? now : period.end;
  const days: { day: Date; values: Record<string, number> }[] = [];
  const index = new Map<number, number>();
  for (let day = period.start.getTime(); day < end.getTime(); day += DAY_MS) {
    index.set(day, days.length);
    days.push({ day: new Date(day), values: {} });
  }
  for (const line of lines) {
    const at = line.day ? index.get(line.day.getTime()) : undefined;
    const column = at === undefined ? undefined : days[at];
    if (!column) continue;
    const key = seriesOf(line);
    column.values[key] = (column.values[key] ?? 0) + Number(line.cents);
  }
  return days;
}

/** A member's own spend: what their personal keys sent this month, against their budget. */
export function ownSpend(overview: SpendOverview, userId: string) {
  const { spend, statuses, budgets } = overview;
  const lines = spend.lines.filter((line) => line.userId === userId);
  const total = lines.reduce((sum, line) => sum + line.cents, 0n);
  // Without spend of their own yet, the member default (if any) still applies.
  const memberDefault = budgets.find((b) => b.scope === "member_default") ?? null;
  const status: BudgetStatus | undefined =
    statuses.find((s) => s.scope === "user" && s.targetId === userId) ??
    (memberDefault
      ? {
          scope: "user",
          targetId: userId,
          budget: memberDefault,
          fromDefault: true,
          amountCents: memberDefault.amountCents,
          spentCents: 0n,
        }
      : undefined);
  const byKey = [...sumSpend(lines, (line) => line.apiKeyId)].sort((a, b) =>
    a[1].cents === b[1].cents ? 0 : a[1].cents > b[1].cents ? -1 : 1,
  );
  const remaining =
    status?.amountCents !== null && status?.amountCents !== undefined
      ? status.amountCents - total
      : null;
  return { lines, total, status, byKey, remaining };
}

/** The Budgets page's status of a target: its own, else (members) the default, else none. */
export function budgetStatusOf(
  overview: SpendOverview,
  scope: BudgetStatus["scope"],
  targetId: string,
): BudgetStatus {
  const memberDefault =
    overview.budgets.find((budget) => budget.scope === "member_default") ?? null;
  return (
    overview.statuses.find((status) => status.scope === scope && status.targetId === targetId) ?? {
      scope,
      targetId,
      budget: scope === "user" ? memberDefault : null,
      fromDefault: scope === "user" && memberDefault !== null,
      amountCents: scope === "user" ? (memberDefault?.amountCents ?? null) : null,
      spentCents: 0n,
    }
  );
}

/** The budget a member, project or key has of its own (not the member default). */
export function ownBudget(
  overview: SpendOverview,
  scope: Budget["scope"],
  targetId: string,
): Budget | null {
  return (
    overview.budgets.find(
      (budget) =>
        budget.scope === scope &&
        (budget.userId ?? budget.projectId ?? budget.apiKeyId) === targetId,
    ) ?? null
  );
}

/** A live key is paused while a budget of it, its owner or its project is used up. */
export function apiKeyPaused(
  holds: readonly BudgetHold[],
  key: { id: string; owner: { id: string } | null },
  projectId: string,
): boolean {
  return holds.some(
    (hold) =>
      (hold.scope === "api_key" && hold.targetId === key.id) ||
      (hold.scope === "user" && hold.targetId === key.owner?.id) ||
      (hold.scope === "project" && hold.targetId === projectId),
  );
}

/** Whether a used-up budget pauses this target's live sending. */
export function budgetPaused(overview: SpendOverview, scope: string, targetId: string): boolean {
  return overview.holds.some((hold) => hold.scope === scope && hold.targetId === targetId);
}
