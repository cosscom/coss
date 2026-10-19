/**
 * Budgets (`@coss/billing`): a member, project or API key over its monthly budget has a hold, and
 * its live sends are refused at acceptance and held at a scheduled send's or broadcast's claim,
 * like the organization's billing hold. Already-queued immediate sends go out.
 */
import {
  BUDGET_EXCEEDED_MESSAGES,
  budgetHoldFor,
  type SpendSourceInput,
} from "@coss/billing/metering";
import { EmailError } from "./errors.ts";

/** Throws `budget_exceeded` (402) when a budget of the send's source is used up. */
export async function assertWithinBudget(source: SpendSourceInput): Promise<void> {
  const scope = await budgetHoldFor(source);
  if (scope) throw new EmailError("budget_exceeded", BUDGET_EXCEEDED_MESSAGES[scope]);
}
