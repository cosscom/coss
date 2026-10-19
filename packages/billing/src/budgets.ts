/**
 * Budgets: what a member (their personal API keys), a project or an API key may spend in a month,
 * where spend is their share of the month's usage charges (`spendBreakdown`). The worker's usage
 * checks alert at each budget's thresholds and, over budget, place a `billing_budget_hold`, which
 * refuses that source's live sends (`budgetHoldFor`) until the month ends or the budget is raised.
 * The organization's own spend limit (`billing_account.spend_limit_cents`) is separate.
 */
import { db, type Executor, schema, type Transaction } from "@coss/db";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { announce } from "./announce.ts";
import { BillingError } from "./errors.ts";
import type { BudgetHoldScope } from "./metering.ts";
import { formatCents } from "./money.ts";
import { enqueueBillingNotification } from "./notifications.ts";
import { type SpendBreakdown, type SpendLine, sumSpend } from "./spend.ts";
import { formatPeriod } from "./time.ts";

const { apikey, billingBudget, billingBudgetHold, environmentApiKey, member, project, user } =
  schema;

export type BudgetScopeKind = (typeof billingBudget.$inferSelect)["scope"];
export type Budget = typeof billingBudget.$inferSelect;
export type BudgetHold = typeof billingBudgetHold.$inferSelect;

export const DEFAULT_BUDGET_THRESHOLDS = [80, 100];
export const MAX_BUDGET_THRESHOLDS = 5;
/** $10,000,000: a typo guard, not a business rule. */
export const MAX_BUDGET_CENTS = 1_000_000_000n;

export async function listBudgets(
  organizationId: string,
  executor: Executor = db,
): Promise<Budget[]> {
  return executor
    .select()
    .from(billingBudget)
    .where(eq(billingBudget.organizationId, organizationId))
    .orderBy(asc(billingBudget.createdAt), asc(billingBudget.id));
}

export async function listBudgetHolds(
  organizationId: string,
  executor: Executor = db,
): Promise<BudgetHold[]> {
  return executor
    .select()
    .from(billingBudgetHold)
    .where(eq(billingBudgetHold.organizationId, organizationId));
}

export async function getBudget(input: {
  organizationId: string;
  budgetId: string;
}): Promise<Budget | null> {
  const [row] = await db
    .select()
    .from(billingBudget)
    .where(
      and(
        eq(billingBudget.id, input.budgetId),
        eq(billingBudget.organizationId, input.organizationId),
      ),
    );
  return row ?? null;
}

/** Whole percentages, at most `MAX_BUDGET_THRESHOLDS`, ascending, without repeats. */
export function normalizeThresholds(thresholds: readonly number[]): number[] {
  const unique = [...new Set(thresholds)].sort((a, b) => a - b);
  if (unique.length > MAX_BUDGET_THRESHOLDS) {
    throw new BillingError(
      "invalid_change",
      `At most ${MAX_BUDGET_THRESHOLDS} alert thresholds per budget.`,
    );
  }
  if (unique.some((value) => !Number.isInteger(value) || value < 1 || value > 1000)) {
    throw new BillingError(
      "invalid_change",
      "Alert thresholds are whole percentages from 1 to 1000.",
    );
  }
  return unique;
}

/**
 * Creates or replaces the budget of one target: the member default (`targetId` `null`), a member
 * (`amountCents` `null` exempts them from the default), a project or an API key of the
 * organization. Returns it and what it replaced.
 */
export async function setBudget(input: {
  organizationId: string;
  scope: BudgetScopeKind;
  targetId: string | null;
  amountCents: bigint | null;
  alertThresholds?: readonly number[];
  actorUserId: string | null;
}): Promise<{ budget: Budget; previous: Budget | null }> {
  const { organizationId, scope } = input;
  if ((scope === "member_default") !== (input.targetId === null)) {
    throw new BillingError("invalid_change", "Choose who the budget is for.");
  }
  if (input.amountCents === null && scope !== "user") {
    throw new BillingError("invalid_change", "Enter the monthly budget.");
  }
  if (
    input.amountCents !== null &&
    (input.amountCents < 0n || input.amountCents > MAX_BUDGET_CENTS)
  ) {
    throw new BillingError(
      "invalid_change",
      `A budget is between $0 and ${formatCents(MAX_BUDGET_CENTS)} a month.`,
    );
  }
  const alertThresholds = normalizeThresholds(input.alertThresholds ?? DEFAULT_BUDGET_THRESHOLDS);
  const targetId = input.targetId;
  if (targetId !== null && !(await targetBelongs(organizationId, scope, targetId))) {
    throw new BillingError(
      "not_found",
      "That member, project or API key isn't in the organization.",
    );
  }
  const target = {
    userId: scope === "user" ? targetId : null,
    projectId: scope === "project" ? targetId : null,
    apiKeyId: scope === "api_key" ? targetId : null,
  };
  return db.transaction(async (tx) => {
    // One writer per organization's budgets: the unique indexes are partial, so no upsert.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`billing_budget:${organizationId}`}))`,
    );
    const [previous] = await tx
      .select()
      .from(billingBudget)
      .where(
        and(eq(billingBudget.organizationId, organizationId), targetCondition(scope, targetId)),
      )
      .limit(1);
    if (previous) {
      const [budget] = await tx
        .update(billingBudget)
        .set({ amountCents: input.amountCents, alertThresholds })
        .where(eq(billingBudget.id, previous.id))
        .returning();
      return { budget: budget as Budget, previous };
    }
    const [budget] = await tx
      .insert(billingBudget)
      .values({
        organizationId,
        scope,
        ...target,
        amountCents: input.amountCents,
        alertThresholds,
        createdByUserId: input.actorUserId,
      })
      .returning();
    return { budget: budget as Budget, previous: null };
  });
}

/** Deletes a budget of the organization; `null` when it is gone. */
export async function deleteBudget(input: {
  organizationId: string;
  budgetId: string;
}): Promise<Budget | null> {
  const [deleted] = await db
    .delete(billingBudget)
    .where(
      and(
        eq(billingBudget.id, input.budgetId),
        eq(billingBudget.organizationId, input.organizationId),
      ),
    )
    .returning();
  return deleted ?? null;
}

function targetCondition(scope: BudgetScopeKind, targetId: string | null) {
  switch (scope) {
    case "member_default":
      return eq(billingBudget.scope, "member_default");
    case "user":
      return and(eq(billingBudget.scope, "user"), eq(billingBudget.userId, targetId ?? ""));
    case "project":
      return and(eq(billingBudget.scope, "project"), eq(billingBudget.projectId, targetId ?? ""));
    case "api_key":
      return and(eq(billingBudget.scope, "api_key"), eq(billingBudget.apiKeyId, targetId ?? ""));
  }
}

async function targetBelongs(
  organizationId: string,
  scope: BudgetScopeKind,
  targetId: string,
): Promise<boolean> {
  if (scope === "user") {
    const [row] = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.organizationId, organizationId), eq(member.userId, targetId)));
    return Boolean(row);
  }
  if (scope === "project") {
    const [row] = await db
      .select({ id: project.id })
      .from(project)
      .where(and(eq(project.organizationId, organizationId), eq(project.id, targetId)));
    return Boolean(row);
  }
  if (scope === "api_key") {
    const [row] = await db
      .select({ id: apikey.id })
      .from(apikey)
      .where(and(eq(apikey.referenceId, organizationId), eq(apikey.id, targetId)));
    return Boolean(row);
  }
  return false;
}

/** One target's month against its budget. */
export type BudgetStatus = {
  scope: BudgetHoldScope;
  targetId: string;
  /** The budget that applies (for a member: theirs, else the member default); `null`: none. */
  budget: Budget | null;
  /** The member's budget is the organization's default. */
  fromDefault: boolean;
  /** `null`: no limit. */
  amountCents: bigint | null;
  spentCents: bigint;
};

/**
 * Every target's spend this month against the budget that applies to it: each member with
 * personal-key spend or a budget of their own, and each project and API key with a budget.
 */
export function evaluateBudgets(
  budgets: readonly Budget[],
  lines: readonly SpendLine[],
): BudgetStatus[] {
  const spentBy = (keyOf: (line: SpendLine) => string) => {
    const totals = sumSpend(lines, keyOf);
    return (id: string) => totals.get(id)?.cents ?? 0n;
  };
  const byUser = spentBy((line) => line.userId);
  const byProject = spentBy((line) => line.projectId);
  const byKey = spentBy((line) => line.apiKeyId);
  const memberDefault = budgets.find((budget) => budget.scope === "member_default") ?? null;
  const own = new Map(
    budgets.flatMap((budget) =>
      budget.scope === "user" && budget.userId ? [[budget.userId, budget] as const] : [],
    ),
  );
  const users = new Set([...own.keys(), ...lines.map((line) => line.userId).filter(Boolean)]);

  const statuses: BudgetStatus[] = [];
  for (const userId of users) {
    const budget = own.get(userId) ?? memberDefault;
    statuses.push({
      scope: "user",
      targetId: userId,
      budget,
      fromDefault: !own.has(userId) && memberDefault !== null,
      amountCents: budget?.amountCents ?? null,
      spentCents: byUser(userId),
    });
  }
  for (const budget of budgets) {
    if (budget.scope === "project" && budget.projectId) {
      statuses.push({
        scope: "project",
        targetId: budget.projectId,
        budget,
        fromDefault: false,
        amountCents: budget.amountCents,
        spentCents: byProject(budget.projectId),
      });
    }
    if (budget.scope === "api_key" && budget.apiKeyId) {
      statuses.push({
        scope: "api_key",
        targetId: budget.apiKeyId,
        budget,
        fromDefault: false,
        amountCents: budget.amountCents,
        spentCents: byKey(budget.apiKeyId),
      });
    }
  }
  return statuses;
}

/** Whether a target is over its budget: spent more than it (a $0 budget allows nothing). */
export function overBudget(status: Pick<BudgetStatus, "amountCents" | "spentCents">): boolean {
  return status.amountCents !== null && status.spentCents > status.amountCents;
}

/** The share of the budget spent, in percent (`null`: no limit). */
export function budgetShare(
  status: Pick<BudgetStatus, "amountCents" | "spentCents">,
): number | null {
  if (status.amountCents === null) return null;
  if (status.amountCents === 0n) return status.spentCents > 0n ? Number.POSITIVE_INFINITY : 0;
  return Number((status.spentCents * 10_000n) / status.amountCents) / 100;
}

/**
 * The usage checks' part for budgets (in `checkOrganizationSpend`): alerts at thresholds, and holds
 * placed over budget and lifted under it (or when the budget is gone, or a new month started).
 * Every change is its own transaction with its notification and webhook event.
 */
export async function checkBudgets(
  organizationId: string,
  spend: SpendBreakdown,
  now: Date,
): Promise<void> {
  const [budgets, holds] = await Promise.all([
    listBudgets(organizationId),
    listBudgetHolds(organizationId),
  ]);
  if (budgets.length === 0 && holds.length === 0) return;
  const period = spend.period;
  const periodKey = period.start.toISOString().slice(0, 7);
  const statuses = evaluateBudgets(budgets, spend.lines);
  const labels = await targetLabels(organizationId, statuses);
  const holdOf = new Map(holds.map((hold) => [`${hold.scope}:${hold.targetId}`, hold]));
  const periodData = { start: period.start.toISOString(), end: period.end.toISOString() };

  for (const status of statuses) {
    const amount = status.amountCents;
    if (amount === null || !status.budget) continue;
    const key = `${status.scope}:${status.targetId}`;
    const recipient = labels.recipients.get(key) ?? null;
    const label = labels.names.get(key) ?? status.targetId;
    const share = budgetShare(status) ?? 0;
    const crossed = status.budget.alertThresholds.filter((t) => share >= t).at(-1);
    if (crossed !== undefined) {
      await db.transaction(async (tx) => {
        const fresh = await enqueueBillingNotification(tx, {
          organizationId,
          kind: "budget_threshold",
          dedupeKey: `budget:${organizationId}:${periodKey}:${key}:${amount}:${crossed}`,
          userId: recipient,
          payload: {
            scope: status.scope,
            target: label,
            percent: crossed,
            amount: formatCents(amount),
            spent: formatCents(status.spentCents),
            period: formatPeriod(period),
          },
          now,
        });
        if (!fresh) return;
        await announce(
          tx,
          organizationId,
          {
            type: "billing.budget_threshold_reached",
            data: {
              scope: status.scope,
              target_id: status.targetId,
              percent: crossed,
              amount: Number(amount),
              spent: Number(status.spentCents),
              period: periodData,
            },
          },
          now,
        );
      });
    }

    const hold = holdOf.get(key);
    holdOf.delete(key);
    const stale = hold !== undefined && hold.periodStart.getTime() < period.start.getTime();
    if (overBudget(status)) {
      if (hold && !stale) continue;
      await db.transaction(async (tx) => {
        if (hold) await liftBudgetHold(tx, organizationId, hold, now);
        const [placed] = await tx
          .insert(billingBudgetHold)
          .values({
            organizationId,
            scope: status.scope,
            targetId: status.targetId,
            periodStart: period.start,
            spentCents: status.spentCents,
            limitCents: amount,
            createdAt: now,
          })
          .onConflictDoNothing()
          .returning();
        if (!placed) return;
        await enqueueBillingNotification(tx, {
          organizationId,
          kind: "budget_paused",
          dedupeKey: `budget_paused:${organizationId}:${periodKey}:${key}:${amount}`,
          userId: recipient,
          payload: {
            scope: status.scope,
            targetId: status.targetId,
            target: label,
            amount: formatCents(amount),
            period: formatPeriod(period),
          },
          now,
        });
        await announce(
          tx,
          organizationId,
          {
            type: "billing.budget_hold_placed",
            data: { scope: status.scope, target_id: status.targetId },
          },
          now,
        );
      });
    } else if (hold) {
      await db.transaction((tx) => liftBudgetHold(tx, organizationId, hold, now));
    }
  }
  // Holds without a budget that still applies (deleted, exempted, or the target is gone).
  for (const hold of holdOf.values()) {
    await db.transaction((tx) => liftBudgetHold(tx, organizationId, hold, now));
  }
}

async function liftBudgetHold(
  tx: Transaction,
  organizationId: string,
  hold: BudgetHold,
  now: Date,
): Promise<boolean> {
  const deleted = await tx
    .delete(billingBudgetHold)
    .where(
      and(
        eq(billingBudgetHold.organizationId, organizationId),
        eq(billingBudgetHold.scope, hold.scope),
        eq(billingBudgetHold.targetId, hold.targetId),
      ),
    )
    .returning({ scope: billingBudgetHold.scope });
  if (!deleted.length) return false;
  await announce(
    tx,
    organizationId,
    {
      type: "billing.budget_hold_lifted",
      data: { scope: hold.scope as BudgetHoldScope, target_id: hold.targetId },
    },
    now,
  );
  return true;
}

/**
 * Names for notifications (`scope:target` keys), and who besides the billing contacts hears
 * about a budget: the member for their own, the owner of a personal key for the key's.
 */
async function targetLabels(
  organizationId: string,
  statuses: readonly BudgetStatus[],
): Promise<{ names: Map<string, string>; recipients: Map<string, string> }> {
  const ids = (scope: BudgetHoldScope) =>
    statuses.filter((status) => status.scope === scope).map((status) => status.targetId);
  const [users, projects, keys] = await Promise.all([
    ids("user").length
      ? db
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(inArray(user.id, ids("user")))
      : [],
    ids("project").length
      ? db
          .select({ id: project.id, name: project.name })
          .from(project)
          .where(
            and(eq(project.organizationId, organizationId), inArray(project.id, ids("project"))),
          )
      : [],
    ids("api_key").length
      ? db
          .select({ id: apikey.id, name: apikey.name, ownerUserId: environmentApiKey.ownerUserId })
          .from(apikey)
          .leftJoin(environmentApiKey, eq(environmentApiKey.apiKeyId, apikey.id))
          .where(and(eq(apikey.referenceId, organizationId), inArray(apikey.id, ids("api_key"))))
      : [],
  ]);
  const names = new Map<string, string>();
  const recipients = new Map<string, string>();
  for (const row of users) {
    names.set(`user:${row.id}`, row.name || row.email);
    recipients.set(`user:${row.id}`, row.id);
  }
  for (const row of projects) names.set(`project:${row.id}`, `the ${row.name} project`);
  for (const row of keys) {
    names.set(`api_key:${row.id}`, `the API key “${row.name ?? row.id}”`);
    if (row.ownerUserId) recipients.set(`api_key:${row.id}`, row.ownerUserId);
  }
  return { names, recipients };
}
