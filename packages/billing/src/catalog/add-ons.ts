/**
 * Recurring add-ons: charged on top of the plan, never spendable as usage credit. None is sold
 * self-serve yet; contracts can carry custom ones (a name and a price) today.
 */

export type BillingInterval = "month" | "quarter" | "year";

export const INTERVAL_MONTHS: Record<BillingInterval, number> = { month: 1, quarter: 3, year: 12 };

export type AddOnDefinition = {
  key: string;
  name: string;
  description: string;
  unitAmountCents: bigint;
  interval: BillingInterval;
  timing: "advance" | "arrears";
  selfServe: boolean;
};

export const ADD_ONS: Readonly<Record<string, AddOnDefinition>> = {};
