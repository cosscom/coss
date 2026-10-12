/**
 * Contracts taking effect mid-month: the prorated invoice they need, and settling a self-serve
 * upgrade once that invoice is paid. Shared by `changes.ts` and `payments.ts` (which must not
 * import each other's callers).
 */
import { schema, type Transaction } from "@coss/db";
import { and, eq, gt, ne } from "drizzle-orm";
import { type BillingAccount, lockBillingAccount, organizationLabel } from "./accounts.ts";
import {
  type Contract,
  cancelContract,
  confirmContract,
  contractAt,
  contractPendingOn,
} from "./contracts.ts";
import { composeContractChange, feeChargeKeyAt } from "./engine/compose.ts";
import type { Composition, Segment } from "./engine/types.ts";
import { BillingError } from "./errors.ts";
import { existingGrantKeys, insertComposedGrants } from "./grants.ts";
import { createInvoice, existingChargeKeys, finalizeInvoice, type InvoiceRow } from "./invoices.ts";
import { parsePendingGrants, pendingGrantsSnapshot } from "./pending.ts";
import { snapshot } from "./periods.ts";
import { contractSegment } from "./resolve.ts";
import { type Interval, periodOf } from "./time.ts";

const { billingContract, billingCreditGrant } = schema;

/** The segment of `contract` from `at` to the end of `at`'s month (`null` for Free). */
function segmentFrom(contract: Contract | null, at: Date, superseded: boolean): Segment | null {
  if (!contract) return null;
  const period = periodOf(at);
  return contractSegment(contract, { start: at, end: period.end }, superseded);
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
  const feeKey = fromSegment ? feeChargeKeyAt({ ...fromSegment, contractEnd: null }, at) : null;
  const advanceCharged = feeKey ? (await existingChargeKeys([feeKey], tx)).size > 0 : false;
  const input = {
    at,
    from: fromSegment ? { segment: fromSegment, advanceCharged } : null,
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
        gt(billingContract.createdAt, pending.createdAt),
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
    await confirmContract(tx, pending, now);
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
  await creditPayment(tx, invoice, "Payment for an upgrade that took effect the next month", now);
  const composition = await composeChange(tx, previous, contract, current.start);
  await invoiceChange(tx, account, composition, {
    contract,
    at: current.start,
    deferGrants: false,
    now,
  });
}
