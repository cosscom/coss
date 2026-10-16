/**
 * Recurring add-ons: charged on top of the plan, never spendable as usage credit. Catalog add-ons
 * are bought self-serve (on the plans they list) or put on contracts by key, and grant their
 * features while a contract carrying them is in effect; contracts can also carry custom ones (a
 * name and a price, no features).
 */
import type { FeatureKey } from "./entitlements.ts";
import type { PlanKey } from "./plans.ts";

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
  /** The plans it can be added to (self-serve: the plans it can be bought on). */
  plans: readonly PlanKey[];
  /** What it grants while in effect, on top of the plan's entitlements. */
  features: readonly FeatureKey[];
};

export const ADD_ONS = {
  dedicated_ips: {
    key: "dedicated_ips",
    name: "Dedicated IPs",
    description:
      "Your own sending IPs, managed and warmed up automatically. Email sent through them is also metered.",
    unitAmountCents: 5_000n,
    interval: "month",
    timing: "advance",
    selfServe: true,
    plans: ["scale", "enterprise"],
    features: ["dedicatedIps"],
  },
} as const satisfies Record<string, AddOnDefinition>;

export type AddOnKey = keyof typeof ADD_ONS;
export const ADD_ON_KEYS = Object.keys(ADD_ONS) as [AddOnKey, ...AddOnKey[]];

export function isAddOnKey(value: string): value is AddOnKey {
  return Object.hasOwn(ADD_ONS, value);
}

/** The catalog add-on with this key (`null`: a contract's custom add-on). */
export function catalogAddOn(key: string): AddOnDefinition | null {
  return isAddOnKey(key) ? ADD_ONS[key] : null;
}

/** The catalog add-on that grants `feature`, if only an add-on does. */
export function addOnGranting(feature: FeatureKey): AddOnDefinition | null {
  for (const key of ADD_ON_KEYS) {
    const addOn: AddOnDefinition = ADD_ONS[key];
    if (addOn.features.includes(feature)) return addOn;
  }
  return null;
}
