// The organization's Spend pages (apps/web/src/app/[orgSlug]/spend) on the wire, from the same
// `spendOverview` and row helpers the dashboard renders.
import type { BudgetStatus } from "@coss/billing";
import type {
  BudgetsResponse,
  MemberSpendResponse,
  OrganizationSpendResponse,
  SpendBudget,
  SpendDay,
  SpendGroup,
  SpendRow,
} from "@coss/companion";
import {
  budgetPaused,
  budgetStatusOf,
  dailySpend,
  environmentLabel,
  keyLabel,
  memberLabel,
  ownBudget,
  ownSpend,
  pausedStatuses,
  projectLabel,
  SPEND_GROUP_SCOPE,
  type SpendOverview,
  type SpendRow as SpendRowData,
  spendRows,
  spendShare,
  targetLabel,
} from "@/lib/spend";

const GROUPS: readonly SpendGroup[] = ["member", "project", "environment", "key"];

/** A `BudgetCell`'s status: none (`undefined`), exempt, or spent against an amount. */
export function toMobileBudget(status: BudgetStatus | undefined): SpendBudget {
  return {
    applies: status?.budget != null,
    amount: status?.amountCents == null ? null : Number(status.amountCents),
    spent: status ? Number(status.spentCents) : 0,
    from_default: status?.fromDefault ?? false,
  };
}

function toMobileRow(row: SpendRowData, totalCents: bigint, budgets: boolean): SpendRow {
  return {
    id: row.key,
    label: row.label,
    detail: row.detail || null,
    email_recipients: row.recipients,
    spent: Number(row.cents),
    share: spendShare(row.cents, totalCents),
    budget: budgets && row.key ? toMobileBudget(row.status) : null,
    paused: row.paused,
  };
}

function toMobileDays(days: ReturnType<typeof dailySpend>): SpendDay[] {
  return days.map(({ day, values }) => ({
    date: day.toISOString().slice(0, 10),
    organization: values.organization ?? 0,
    personal: values.personal ?? 0,
  }));
}

function toMobilePeriod(period: { start: Date; end: Date }) {
  return { start: period.start.toISOString(), end: period.end.toISOString() };
}

/** A billing reader's Spend page. */
export function toMobileOrganizationSpend(
  overview: SpendOverview,
  options: { spendLimitCents: bigint | null; now: Date },
): OrganizationSpendResponse {
  const { spend, names } = overview;
  const personal = spend.lines
    .filter((line) => line.userId !== "")
    .reduce((total, line) => total + line.cents, 0n);
  return {
    view: "organization",
    period: toMobilePeriod(spend.period),
    total: Number(spend.totalCents),
    organization: Number(spend.totalCents - personal),
    personal: Number(personal),
    spend_limit: options.spendLimitCents === null ? null : Number(options.spendLimitCents),
    paused: pausedStatuses(overview).map((status) => targetLabel(names, status)),
    days: toMobileDays(
      dailySpend(spend.period, options.now, spend.lines, (line) =>
        line.userId ? "personal" : "organization",
      ),
    ),
    breakdown: Object.fromEntries(
      GROUPS.map((by) => [
        by,
        spendRows(overview, by).map((row) =>
          toMobileRow(row, spend.totalCents, SPEND_GROUP_SCOPE[by] !== null),
        ),
      ]),
    ) as Record<SpendGroup, SpendRow[]>,
  };
}

/** Another member's Spend page: their personal keys only. */
export function toMobileMemberSpend(
  overview: SpendOverview,
  userId: string,
  now: Date,
): MemberSpendResponse {
  const { spend, names } = overview;
  const own = ownSpend(overview, userId);
  return {
    view: "member",
    period: toMobilePeriod(spend.period),
    total: Number(own.total),
    budget: toMobileBudget(own.status),
    remaining: own.remaining === null ? null : Number(own.remaining > 0n ? own.remaining : 0n),
    over_budget: own.remaining !== null && own.remaining < 0n,
    days: toMobileDays(dailySpend(spend.period, now, own.lines, () => "personal")),
    keys: own.byKey.map(([key, total]) => {
      const found = names.keys.get(key);
      return {
        id: key,
        label: keyLabel(names, key),
        detail: found ? environmentLabel(names, found.environmentId) : null,
        email_recipients: total.quantities["email.recipients"] ?? 0,
        spent: Number(total.cents),
        share: null,
        budget: null,
        paused: false,
      };
    }),
  };
}

/** The Budgets page, read-only. */
export function toMobileBudgets(overview: SpendOverview): BudgetsResponse {
  const { budgets, names } = overview;
  const memberDefault = budgets.find((budget) => budget.scope === "member_default") ?? null;
  return {
    member_default: memberDefault?.amountCents == null ? null : Number(memberDefault.amountCents),
    members: [...names.members].map(([userId, member]) => ({
      user_id: userId,
      name: memberLabel(names, userId),
      email: member.email,
      role: member.role,
      budget: toMobileBudget(budgetStatusOf(overview, "user", userId)),
      own: ownBudget(overview, "user", userId) !== null,
      paused: budgetPaused(overview, "user", userId),
    })),
    projects: [...names.projects].map(([projectId]) => ({
      id: projectId,
      name: projectLabel(names, projectId),
      budget: toMobileBudget(
        ownBudget(overview, "project", projectId)
          ? budgetStatusOf(overview, "project", projectId)
          : undefined,
      ),
      paused: budgetPaused(overview, "project", projectId),
    })),
    keys: budgets.flatMap((budget) => {
      if (budget.scope !== "api_key" || !budget.apiKeyId) return [];
      const key = names.keys.get(budget.apiKeyId);
      return [
        {
          api_key_id: budget.apiKeyId,
          label: keyLabel(names, budget.apiKeyId),
          detail: key
            ? `${environmentLabel(names, key.environmentId)}${
                key.ownerUserId ? ` · ${memberLabel(names, key.ownerUserId)}'s personal key` : ""
              }`
            : null,
          budget: toMobileBudget(budgetStatusOf(overview, "api_key", budget.apiKeyId)),
          paused: budgetPaused(overview, "api_key", budget.apiKeyId),
        },
      ];
    }),
  };
}
