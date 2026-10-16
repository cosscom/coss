/**
 * Charges a contract carries over from the one it replaced: an add-on change keeps the unchanged
 * monthly fee and same-price add-ons already paid for the month instead of charging them again,
 * so they stay under the earlier contract's charge keys. Later changes in the month and the
 * month close read them through here.
 */
import { db, type Executor } from "@coss/db";
import { type Contract, getContract } from "./contracts.ts";
import {
  addOnCarriesOver,
  addOnChargeKeyAt,
  feeCarriesOver,
  feeChargeKeyAt,
  feeCreditKeyAt,
} from "./engine/compose.ts";
import type { Segment } from "./engine/types.ts";
import { existingChargeKeys } from "./invoices.ts";
import { contractSegment } from "./resolve.ts";
import { monthStart, periodOf } from "./time.ts";

/** The segment of `contract` from `at` to the end of `at`'s month. */
function segmentFrom(contract: Contract, at: Date): Segment {
  return contractSegment(contract, { start: at, end: periodOf(at).end }, true);
}

export type AdvancePaid = {
  /** The advance fee for `at`'s interval was paid… */
  fee: boolean;
  /** …and these advance add-ons (by key). */
  addOns: Set<string>;
  /** Paid by an earlier contract (carried over), not under the contract's own keys. */
  feeCarried: boolean;
  addOnsCarried: Set<string>;
};

/** How many contracts back `advancePaid` follows `supersedes_id` (each one a change in the month). */
const MAX_CARRIED_CONTRACTS = 50;

/**
 * Whether `from`'s advance fee, and which of its advance add-ons, were paid for `at`'s interval:
 * charged under its own keys, or carried over from the contract it replaced in that month (an
 * add-on change carries the unchanged fee and same-price add-ons instead of charging them again,
 * so their charge keys stay the earlier contract's), following `supersedes_id` back.
 */
export async function advancePaid(
  executor: Executor,
  from: Contract,
  at: Date,
): Promise<AdvancePaid> {
  const paid: AdvancePaid = {
    fee: false,
    addOns: new Set(),
    feeCarried: false,
    addOnsCarried: new Set(),
  };
  let contract = from;
  let segment = segmentFrom(contract, at);
  // Still looking for: the fee, and add-ons by key (as `from` has them).
  let fee = segment.terms.fee !== null;
  let addOns = new Map(segment.terms.addOns.map((addOn) => [addOn.key, addOn]));
  for (let hop = 0; hop < MAX_CARRIED_CONTRACTS; hop++) {
    const open: Segment = { ...segment, contractEnd: null };
    const feeKey = fee ? feeChargeKeyAt(open, at) : null;
    const addOnKeys = new Map<string, string>();
    for (const addOn of open.terms.addOns) {
      if (addOns.has(addOn.key)) addOnKeys.set(addOnChargeKeyAt(open, addOn, at), addOn.key);
    }
    const charged = await existingChargeKeys(
      [...(feeKey ? [feeKey] : []), ...addOnKeys.keys()],
      executor,
    );
    if (feeKey && charged.has(feeKey)) {
      paid.fee = true;
      paid.feeCarried = hop > 0;
      fee = false;
    }
    for (const [chargeKey, key] of addOnKeys) {
      if (!charged.has(chargeKey)) continue;
      paid.addOns.add(key);
      if (hop > 0) paid.addOnsCarried.add(key);
      addOns.delete(key);
    }
    // Carried charges come only from a contract this one replaced in `at`'s month (its first
    // hour included: a change then starts at the month's start).
    const started = contract.effectiveFrom.getTime();
    if ((!fee && !addOns.size) || !contract.supersedesId) break;
    if (monthStart(contract.effectiveFrom).getTime() !== monthStart(at).getTime()) break;
    const previous = await getContract(contract.organizationId, contract.supersedesId, executor);
    if (previous?.effectiveUntil?.getTime() !== started) break;
    if (!previous) break;
    const before = segmentFrom(previous, at);
    fee = fee && feeCarriesOver(before, segment);
    const carried = new Map<string, Segment["terms"]["addOns"][number]>();
    for (const [key, addOn] of addOns) {
      const line = before.terms.addOns.find((candidate) => candidate.key === key);
      if (line && addOnCarriesOver(before, line, segment, addOn)) carried.set(key, line);
    }
    addOns = carried;
    contract = previous;
    segment = before;
  }
  return paid;
}

/**
 * The charge and grant keys of `contract`'s advance charges for the month starting at `at` that an
 * earlier contract paid (and the usage credit that came with that fee): the month close counts
 * them as billed, so a carried fee or add-on isn't charged (or credited) twice.
 */
export async function carriedKeys(
  contract: Contract,
  at: Date,
  executor: Executor = db,
): Promise<{ chargeKeys: string[]; grantKeys: string[] }> {
  const paid = await advancePaid(executor, contract, at);
  const segment: Segment = { ...segmentFrom(contract, at), contractEnd: null };
  const chargeKeys: string[] = [];
  const grantKeys: string[] = [];
  if (paid.feeCarried) {
    const feeKey = feeChargeKeyAt(segment, at);
    if (feeKey) chargeKeys.push(feeKey);
    grantKeys.push(feeCreditKeyAt(segment, at));
  }
  for (const addOn of segment.terms.addOns) {
    if (paid.addOnsCarried.has(addOn.key)) chargeKeys.push(addOnChargeKeyAt(segment, addOn, at));
  }
  return { chargeKeys, grantKeys };
}
