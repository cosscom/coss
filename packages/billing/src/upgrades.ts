/**
 * Contracts taking effect mid-month: the prorated invoice they need, and settling a self-serve
 * upgrade once that invoice is paid. Shared by `changes.ts` and `payments.ts` (which must not
 * import each other's callers).
 */
import { schema, type Transaction } from "@coss/db";
import { and, eq, gt, ne, sql } from "drizzle-orm";
import { type BillingAccount, lockBillingAccount, organizationLabel } from "./accounts.ts";
import { announcePlanChange } from "./announce.ts";
import {
  type Contract,
  cancelContract,
  confirmContract,
  contractAt,
  contractPendingOn,
  getContract,
} from "./contracts.ts";
import {
  addOnCarriesOver,
  addOnChargeKeyAt,
  composeContractChange,
  feeCarriesOver,
  feeChargeKeyAt,
} from "./engine/compose.ts";
import type { Composition, Segment } from "./engine/types.ts";
import { BillingError } from "./errors.ts";
import { existingGrantKeys, insertComposedGrants } from "./grants.ts";
import { createInvoice, existingChargeKeys, finalizeInvoice, type InvoiceRow } from "./invoices.ts";
import { parsePendingGrants, pendingGrantsSnapshot } from "./pending.ts";
import { snapshot } from "./periods.ts";
import { contractSegment } from "./resolve.ts";
import { type Interval, monthStart, periodOf } from "./time.ts";

const { billingContract, billingCreditGrant } = schema;

/** The segment of `contract` from `at` to the end of `at`'s month (`null` for Free). */
function segmentFrom(contract: Contract | null, at: Date, superseded: boolean): Segment | null {
  if (!contract) return null;
  const period = periodOf(at);
  return contractSegment(contract, { start: at, end: period.end }, superseded);
}

/** How many contracts back `advancePaid` follows `supersedes_id` (each one a change in the month). */
const MAX_CARRIED_CONTRACTS = 50;

/**
 * Whether `from`'s advance fee, and which of its advance add-ons, were paid for `at`'s interval:
 * charged under its own keys, or carried over from the contract it replaced in that month (an
 * add-on change carries the unchanged fee and same-price add-ons instead of charging them again,
 * so their charge keys stay the earlier contract's), following `supersedes_id` back.
 */
async function advancePaid(
  tx: Transaction,
  from: Contract,
  at: Date,
): Promise<{ fee: boolean; addOns: Set<string> }> {
  const paid = { fee: false, addOns: new Set<string>() };
  let contract = from;
  let segment = segmentFrom(contract, at, true);
  if (!segment) return paid;
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
      tx,
    );
    if (feeKey && charged.has(feeKey)) {
      paid.fee = true;
      fee = false;
    }
    for (const [chargeKey, key] of addOnKeys) {
      if (!charged.has(chargeKey)) continue;
      paid.addOns.add(key);
      addOns.delete(key);
    }
    // Carried charges come only from a contract this one replaced in `at`'s month (its first
    // hour included: a change then starts at the month's start).
    const started = contract.effectiveFrom.getTime();
    if ((!fee && !addOns.size) || !contract.supersedesId) break;
    if (monthStart(contract.effectiveFrom).getTime() !== monthStart(at).getTime()) break;
    const previous = await getContract(contract.organizationId, contract.supersedesId, tx);
    if (previous?.effectiveUntil?.getTime() !== started) break;
    const before = segmentFrom(previous, at, true);
    if (!before) break;
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

/** The prorated charges and credit of `to` replacing `from` at `at`, less what was already billed. */
export async function composeChange(
  tx: Transaction,
  from: Contract | null,
  to: Contract,
  at: Date,
): Promise<Composition> {
  const fromSegment = segmentFrom(from, at, true);
  if (fromSegment) fromSegment.contractEnd = at;
  const toSegment = segmentFrom(to, at, false);
  if (!toSegment) throw new Error("A contract change needs a contract to change to.");
  // What the replaced contract was charged in advance for `at`'s interval.
  const paid = from ? await advancePaid(tx, from, at) : null;
  const input = {
    at,
    from:
      fromSegment && paid
        ? { segment: fromSegment, advanceCharged: paid.fee, addOnsCharged: paid.addOns }
        : null,
    to: toSegment,
  };
  const draft = composeContractChange(input);
  const chargeKeys = await existingChargeKeys(
    draft.lines.flatMap((line) => (line.chargeKey ? [line.chargeKey] : [])),
    tx,
  );
  const grantKeys = await existingGrantKeys(
    draft.grants.map((grant) => grant.key),
    tx,
  );
  return chargeKeys.size || grantKeys.size
    ? composeContractChange({ ...input, billed: { chargeKeys, grantKeys } })
    : draft;
}

/** The finalized `plan_change` invoice for a composition (`null`: nothing to bill or grant). */
export async function invoiceChange(
  tx: Transaction,
  account: BillingAccount,
  composition: Composition,
  input: {
    contract: Contract;
    at: Date;
    /** The grants wait for the invoice to be paid (self-serve upgrades). */
    deferGrants: boolean;
    createdByUserId?: string | null;
    now: Date;
  },
): Promise<InvoiceRow | null> {
  if (!composition.lines.length && !composition.grants.length) return null;
  const organization = await organizationLabel(account.organizationId, tx);
  if (!organization) throw new BillingError("not_found", "The organization no longer exists.");
  const period: Interval = { start: input.at, end: periodOf(input.at).end };
  const segment = segmentFrom(input.contract, input.at, false);
  const invoice = await createInvoice(tx, {
    account,
    organization,
    kind: "plan_change",
    period,
    lines: composition.lines,
    applications: composition.applications,
    grants: input.deferGrants ? [] : composition.grants,
    createdByUserId: input.createdByUserId ?? null,
    termsSnapshot: {
      ...snapshot(segment ? [segment] : []),
      ...(input.deferGrants ? { pendingGrants: pendingGrantsSnapshot(composition.grants) } : {}),
    },
  });
  return finalizeInvoice(tx, invoice, account, input.now);
}

/** What was paid becomes credit for later invoices (the paid change can't take effect). */
async function creditPayment(
  tx: Transaction,
  invoice: InvoiceRow,
  description: string,
  now: Date,
): Promise<void> {
  if (invoice.totalCents <= 0n) return;
  await tx.insert(billingCreditGrant).values({
    organizationId: invoice.organizationId,
    kind: "amount",
    amount: invoice.totalCents,
    appliesTo: "any",
    source: "refund",
    description,
    reason: `Invoice ${invoice.number ?? invoice.id}`,
    effectiveAt: now,
    expiresAt: null,
  });
}

/**
 * A paid invoice settles the upgrade waiting on it (in the payment's transaction, which already
 * holds the account and invoice locks, in that order).
 * - A contract change made since the upgrade began wins: the upgrade is canceled and its payment
 *   becomes credit.
 * - Paid after the month it started in closed (a slow direct debit): that month was billed
 *   without it, so it takes effect at the current month's start instead, its payment becomes
 *   credit, and the current month's difference is invoiced.
 * - Otherwise it takes effect as planned, with its deferred credit.
 */
export async function settlePendingContract(
  tx: Transaction,
  invoice: InvoiceRow,
  now: Date,
): Promise<void> {
  const pending = await contractPendingOn(invoice.id, tx);
  if (!pending) return;
  const account = await lockBillingAccount(tx, pending.organizationId, invoice.provider);
  const [newer] = await tx
    .select({ id: billingContract.id })
    .from(billingContract)
    .where(
      and(
        eq(billingContract.organizationId, pending.organizationId),
        ne(billingContract.id, pending.id),
        eq(billingContract.status, "confirmed"),
        // Against the stored value: `pending.createdAt` came back as a JS Date (milliseconds), so a
        // contract created earlier in the same millisecond (microseconds) would look newer.
        gt(
          billingContract.createdAt,
          sql`(SELECT pending.created_at FROM billing_contract AS pending WHERE pending.id = ${pending.id})`,
        ),
      ),
    )
    .limit(1);
  if (newer) {
    await cancelContract(tx, pending.id, now);
    await creditPayment(tx, invoice, "Payment for an upgrade replaced by a later plan change", now);
    return;
  }

  const current = periodOf(now);
  if (pending.effectiveFrom >= current.start) {
    const before = await contractAt(pending.organizationId, pending.effectiveFrom, tx);
    await confirmContract(tx, pending, now);
    await announcePlanChange(
      tx,
      pending.organizationId,
      {
        change: "upgrade",
        plan: pending.terms.plan,
        previousPlan: before?.terms.plan ?? "free",
        effectiveAt: pending.effectiveFrom,
      },
      now,
    );
    await insertComposedGrants(
      tx,
      invoice.organizationId,
      invoice.id,
      parsePendingGrants(invoice.termsSnapshot),
    );
    return;
  }
  const previous = await contractAt(pending.organizationId, current.start, tx);
  const [moved] = await tx
    .update(billingContract)
    .set({ effectiveFrom: current.start })
    .where(eq(billingContract.id, pending.id))
    .returning();
  if (!moved) return;
  const contract = await confirmContract(tx, { ...pending, effectiveFrom: current.start }, now);
  await announcePlanChange(
    tx,
    pending.organizationId,
    {
      change: "upgrade",
      plan: pending.terms.plan,
      previousPlan: previous?.terms.plan ?? "free",
      effectiveAt: current.start,
    },
    now,
  );
  await creditPayment(tx, invoice, "Payment for an upgrade that took effect the next month", now);
  const composition = await composeChange(tx, previous, contract, current.start);
  await invoiceChange(tx, account, composition, {
    contract,
    at: current.start,
    deferGrants: false,
    now,
  });
}
