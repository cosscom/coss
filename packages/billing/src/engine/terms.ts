/** Resolves contract terms against their plan and the list prices into what the engine applies. */
import { type BillingInterval, catalogAddOn, INTERVAL_MONTHS } from "../catalog/add-ons.ts";
import { type Entitlements, type FeatureKey, mergeEntitlements } from "../catalog/entitlements.ts";
import { METER_KEYS, METERS, type MeterKey } from "../catalog/meters.ts";
import { PLANS, type PlanKey } from "../catalog/plans.ts";
import { type MeterRates, type RateCard, rateCardAt } from "../catalog/rates.ts";
import type { AddOn, Commitment, ContractTerms, Discount, FeeCredit } from "../schemas.ts";

export type EffectiveFee = {
  amountCents: bigint;
  interval: BillingInterval;
  timing: "advance" | "arrears";
};

export type EffectiveTerms = {
  plan: PlanKey;
  /** `null` when there is no fee (Free, or a contract without one). */
  fee: EffectiveFee | null;
  feeCredit: FeeCredit;
  includedUnits: Partial<Record<MeterKey, number>>;
  overage: "billed" | "blocked";
  /** Per meter: the contract's own rates, else the list prices. */
  rates: Partial<Record<MeterKey, MeterRates>>;
  /** Discounts on list prices set per meter (`{ discountPercent }`). */
  meterDiscounts: Partial<Record<MeterKey, number>>;
  discounts: readonly Discount[];
  commitments: readonly Commitment[];
  addOns: readonly AddOn[];
  entitlements: Entitlements;
  /** Hard per-period limits (`undefined`: none). */
  usageCaps: Partial<Record<MeterKey, number>>;
};

const DEFAULT_FEE_CREDIT: FeeCredit = { spendable: true, pool: "month" };

export function resolveTerms(terms: ContractTerms, rateCard: RateCard): EffectiveTerms {
  const plan = PLANS[terms.plan];
  const feeTerms =
    terms.fee === undefined
      ? { amountCents: plan.feeCents, interval: "month" as const, timing: "advance" as const }
      : terms.fee;
  const fee = feeTerms && feeTerms.amountCents > 0n ? feeTerms : null;
  const includedUnits: Partial<Record<MeterKey, number>> = {
    ...(terms.includedUnits ?? plan.includedUnits),
  };
  const overage = terms.overage ?? plan.overage;

  const rates: Partial<Record<MeterKey, MeterRates>> = {};
  const meterDiscounts: Partial<Record<MeterKey, number>> = {};
  for (const meter of METER_KEYS) {
    const override = terms.rates?.[meter];
    if (override && "discountPercent" in override) {
      meterDiscounts[meter] = override.discountPercent;
      const list = rateCard.rates[meter];
      if (list) rates[meter] = list;
    } else if (override) {
      rates[meter] = override;
    } else {
      const list = rateCard.rates[meter];
      if (list) rates[meter] = list;
    }
  }

  const usageCaps: Partial<Record<MeterKey, number>> = {};
  for (const meter of METER_KEYS) {
    const explicit = terms.usageCaps?.[meter];
    if (explicit !== undefined) {
      if (explicit !== null) usageCaps[meter] = explicit;
    } else if (overage === "blocked") {
      usageCaps[meter] = includedUnits[meter] ?? 0;
    }
  }

  return {
    plan: terms.plan,
    fee,
    feeCredit: terms.feeCredit ?? DEFAULT_FEE_CREDIT,
    includedUnits,
    overage,
    rates,
    meterDiscounts,
    discounts: terms.discounts ?? [],
    commitments: terms.commitments ?? [],
    addOns: terms.addOns ?? [],
    entitlements: withAddOnFeatures(
      mergeEntitlements(plan.entitlements, terms.entitlements),
      terms.addOns ?? [],
    ),
    usageCaps,
  };
}

/** What catalog add-ons grant on top (a contract's custom add-ons grant nothing). */
function withAddOnFeatures(base: Entitlements, addOns: readonly AddOn[]): Entitlements {
  const granted: FeatureKey[] = addOns.flatMap((addOn) => catalogAddOn(addOn.key)?.features ?? []);
  if (!granted.length) return base;
  const features = { ...base.features };
  for (const feature of granted) features[feature] = true;
  return { ...base, features };
}

/** Terms at a moment, against the list prices in effect then. */
export function resolveTermsAt(terms: ContractTerms, at: Date): EffectiveTerms {
  return resolveTerms(terms, rateCardAt(at));
}

/** The fee per month (for monthly credit pools and plan comparisons). */
export function monthlyFeeCents(fee: EffectiveFee | null): bigint {
  if (!fee) return 0n;
  return fee.amountCents / BigInt(INTERVAL_MONTHS[fee.interval]);
}

export type MeterAvailability = "available" | "requires_commitment" | "not_priced" | "blocked";

/**
 * Whether a meter's usage is allowed at all: committed-volume meters (SMS) need a commitment
 * covering them, every meter needs a price, and a zero cap blocks it.
 */
export function meterAvailability(terms: EffectiveTerms, meter: MeterKey): MeterAvailability {
  if (METERS[meter].requires === "commitment" && !hasCommitmentFor(terms, meter)) {
    return "requires_commitment";
  }
  const rates = terms.rates[meter];
  if (!rates?.default && !Object.keys(rates?.byDimension ?? {}).length) return "not_priced";
  if (terms.usageCaps[meter] === 0) return "blocked";
  return "available";
}

function hasCommitmentFor(terms: EffectiveTerms, meter: MeterKey): boolean {
  return terms.commitments.some((commitment) =>
    commitment.kind === "prepaid_units"
      ? commitment.meter === meter
      : (commitment.meters?.includes(meter) ?? false),
  );
}
