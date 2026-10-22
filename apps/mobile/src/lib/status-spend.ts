import type { SpendBudget } from "@coss/companion";

/** The share of the budget spent, 0-1 (`null`: no limit); `budgetShare` in `@coss/billing`. */
export function budgetFraction(budget: SpendBudget): number | null {
  if (budget.amount === null) return null;
  if (budget.amount === 0) return budget.spent > 0 ? 1 : 0;
  return Math.min(1, budget.spent / budget.amount);
}

/** `overBudget` in `@coss/billing`. */
export function overBudget(budget: SpendBudget): boolean {
  return budget.amount !== null && budget.spent > budget.amount;
}
