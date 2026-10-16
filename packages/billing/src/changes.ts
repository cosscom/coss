/**
 * Plan and contract changes.
 * - Self-serve upgrades take effect now, once their prorated invoice is paid (the contract stays
 *   `pending` until then, and expires after a day).
 * - Self-serve downgrades and cancellations take effect at the end of the billing period and can
 *   be undone until then; they are refused while the organization uses something the lower plan
 *   lacks (the caller's preflight).
 * - Sales contracts (platform admins) take effect now (backdated within the open month at most)
 *   or at the start of a future month, from any terms.
 */
import { db, schema, type Transaction } from "@coss/db";
import { and, asc, eq, gt, inArray, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { lockBillingAccount, type ProviderName } from "./accounts.ts";
import { announcePlanChange } from "./announce.ts";
import { type AdminActor, auditBillingChange } from "./audit.ts";
import {
  ADD_ONS,
  type AddOnDefinition,
  type AddOnKey,
  catalogAddOn,
  INTERVAL_MONTHS,
} from "./catalog/add-ons.ts";
import { PLANS, type PlanKey } from "./catalog/plans.ts";
import {
  type Contract,
  cancelContract,
  cancelRenewalsOf,
  clearContractEnd,
  confirmContract,
  contractAt,
  endContractAt,
  getContract,
  insertContract,
  nextContractAfter,
  pendingContract,
  renewalNote,
  scheduledManagedContract,
  setPendingInvoice,
} from "./contracts.ts";
import { resolveTermsAt } from "./engine/terms.ts";
import { BillingError } from "./errors.ts";
import { type InvoiceRow, lockInvoice } from "./invoices.ts";
import { enqueueBillingNotification } from "./notifications.ts";
import { afterSettled, voidInvoice, voidInvoiceInTransaction } from "./payments.ts";
import { type BillingState, billingStateAt, FREE_TERMS } from "./resolve.ts";
import {
  addOnTerms,
  type ContractTerms,
  type ContractTermsInput,
  parseContractTerms,
  selfServeTerms,
} from "./schemas.ts";
import { addMonths, floorHour, isMonthStart, monthIndex, nextPeriod, periodOf } from "./time.ts";
import { composeChange, invoiceChange } from "./upgrades.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
/** An unpaid upgrade is given up after this long. */
export const PENDING_UPGRADE_MS = DAY_MS;

function rank(plan: PlanKey): number {
  return PLANS[plan].rank;
}

/**
 * Gives up the upgrade waiting for payment before another plan change: voids its invoice (a
 * payment that still lands becomes credit, see `applyOutcome`). Refused while a payment for it
 * is being processed (a direct debit): its outcome must come first.
 */
async function dropPendingUpgrade(
  tx: Transaction,
  organizationId: string,
  reason: string,
  now: Date,
): Promise<void> {
  const pending = await pendingContract(organizationId, tx);
  if (!pending) return;
  if (pending.pendingInvoiceId) {
    const invoice = await lockInvoice(tx, pending.pendingInvoiceId);
    if (invoice?.paymentState === "processing") {
      throw new BillingError(
        "invalid_change",
        "A payment for your last upgrade is still being processed. Try again once it completes.",
      );
    }
    if (invoice?.status === "open" || invoice?.status === "draft") {
      await voidInvoiceInTransaction(tx, {
        organizationId,
        invoiceId: invoice.id,
        actor: null,
        reason,
        now,
      });
      return;
    }
  }
  await cancelContract(tx, pending.id, now);
}

/**
 * Self-serve changes are refused while a sales or internal contract is scheduled: the deal an
 * admin set up must not be replaced from the dashboard.
 */
async function refuseWhileManagedContractScheduled(
  tx: Transaction,
  organizationId: string,
  now: Date,
): Promise<void> {
  if (await scheduledManagedContract(organizationId, now, tx)) {
    throw new BillingError(
      "self_serve_unavailable",
      "A contract with your account manager starts soon. Contact them to change your plan.",
    );
  }
}

/**
 * Starts a self-serve upgrade: a pending contract and its prorated invoice. The caller collects
 * the invoice right away (`collectInvoiceNow`); paying it confirms the contract. Add-ons carry
 * over.
 */
export async function startUpgrade(input: {
  organizationId: string;
  plan: PlanKey;
  userId: string | null;
  defaultProvider: ProviderName;
  now?: Date;
}): Promise<{ contract: Contract; invoice: InvoiceRow | null }> {
  const target = PLANS[input.plan];
  if (!target.selfServe || input.plan === "free") {
    throw new BillingError(
      "self_serve_unavailable",
      `The ${target.name} plan isn't available from the dashboard. Contact sales.`,
    );
  }
  // Retrying an upgrade replaces the one still waiting for payment.
  return startPendingChange(input, "Replaced by a new upgrade.", async (state) => {
    if (rank(input.plan) <= rank(state.terms.plan)) {
      throw new BillingError(
        "invalid_change",
        `You're already on ${PLANS[state.terms.plan].name}; that isn't an upgrade.`,
      );
    }
    return selfServeTerms(input.plan, state.contract?.terms.addOns);
  });
}

/**
 * Reasons a self-serve add-on can't be bought now (e.g. no capacity left). It runs in the purchase's
 * transaction, which commits the pending contract: a lock it takes there covers that contract.
 */
export type AddOnPreflight = (
  tx: Transaction,
  organizationId: string,
  addOn: AddOnDefinition,
  now: Date,
) => Promise<string[]>;

/**
 * Adds a catalog add-on to the self-serve plan: like an upgrade, a pending contract (the same plan
 * with the add-on) and an invoice for the rest of the add-on's interval; paying it confirms it.
 */
export async function startAddOn(input: {
  organizationId: string;
  key: AddOnKey;
  userId: string | null;
  defaultProvider: ProviderName;
  preflight: AddOnPreflight;
  now?: Date;
}): Promise<{ contract: Contract; invoice: InvoiceRow | null }> {
  const addOn: AddOnDefinition = ADD_ONS[input.key];
  if (!addOn.selfServe) {
    throw new BillingError(
      "self_serve_unavailable",
      `${addOn.name} isn't available from the dashboard. Contact sales.`,
    );
  }
  // Retrying replaces the change still waiting for payment.
  return startPendingChange(input, "Replaced by an add-on purchase.", async (state, tx, now) => {
    const current = state.contract;
    if (!current || !addOn.plans.includes(current.terms.plan)) {
      const plans = addOn.plans.map((key) => PLANS[key].name).join(" and ");
      throw new BillingError(
        "invalid_change",
        `${addOn.name} can be added on the ${plans} plans. Upgrade first.`,
      );
    }
    if ((current.terms.addOns ?? []).some((line) => line.key === addOn.key)) {
      throw new BillingError("invalid_change", `You already have ${addOn.name}.`);
    }
    if (state.scheduled) {
      throw new BillingError(
        "invalid_change",
        "A change to your plan is scheduled. Cancel it before adding to your plan.",
      );
    }
    const blockers = await input.preflight(tx, input.organizationId, addOn, now);
    if (blockers.length) throw new BillingError("invalid_change", blockers.join(" "));
    return selfServeTerms(current.terms.plan, [...(current.terms.addOns ?? []), addOnTerms(addOn)]);
  });
}

/**
 * A pending self-serve contract replacing the current one now, and its prorated invoice: `terms`
 * decides the new terms from the state (and refuses what isn't allowed).
 */
async function startPendingChange(
  input: {
    organizationId: string;
    userId: string | null;
    defaultProvider: ProviderName;
    now?: Date;
  },
  replaced: string,
  terms: (state: BillingState, tx: Transaction, now: Date) => Promise<ContractTerms>,
): Promise<{ contract: Contract; invoice: InvoiceRow | null }> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const account = await lockBillingAccount(tx, input.organizationId, input.defaultProvider);
    await refuseWhileManagedContractScheduled(tx, input.organizationId, now);
    await dropPendingUpgrade(tx, input.organizationId, replaced, now);
    const state = await billingStateAt(input.organizationId, now, tx);
    if (state.contract && state.contract.kind !== "self_serve") {
      throw new BillingError(
        "self_serve_unavailable",
        "Your plan is managed by your contract. Contact your account manager to change it.",
      );
    }
    const newTerms = await terms(state, tx, now);
    const at = floorHour(now);
    const contract = await insertContract(
      tx,
      {
        organizationId: input.organizationId,
        accountId: account.id,
        kind: "self_serve",
        status: "pending",
        terms: newTerms,
        effectiveFrom: at,
        createdByUserId: input.userId,
        // Within the month it starts in: once that month closes without it, a later payment
        // would have to restart it (see `settlePendingContract`).
        pendingExpiresAt: new Date(
          Math.min(now.getTime() + PENDING_UPGRADE_MS, periodOf(now).end.getTime()),
        ),
      },
      now,
    );
    const composition = await composeChange(tx, state.contract, contract, at);
    const invoice = await invoiceChange(tx, account, composition, {
      contract,
      at,
      deferGrants: true,
      createdByUserId: input.userId,
      now,
    });
    if (invoice) await setPendingInvoice(tx, contract.id, invoice.id);
    if (!invoice || invoice.status === "paid") {
      // Nothing to pay (e.g. the last hour of the month): it takes effect at once.
      if (invoice) await afterSettled(tx, invoice, now);
      else await confirmContract(tx, contract, now);
    }
    return { contract, invoice };
  });
}

/**
 * The self-serve terms the next period starts from: a scheduled self-serve contract's, else the
 * current contract's (`null`: the plan already ends).
 */
function nextTerms(state: BillingState): ContractTerms | null {
  if (state.scheduled) return state.scheduled.contract?.terms ?? null;
  return state.contract?.terms ?? null;
}

/** Add-ons of `terms` the plan `plan` can't carry (catalog add-ons not offered on it). */
function ineligibleAddOns(terms: ContractTerms, plan: PlanKey): string[] {
  return (terms.addOns ?? []).flatMap((line) => {
    const addOn = catalogAddOn(line.key);
    return addOn && !addOn.plans.includes(plan) ? [addOn.name] : [];
  });
}

/**
 * Removes a catalog add-on at the end of the billing period (like a downgrade): it stays in effect
 * until then, and `cancelScheduledChange` keeps it.
 */
export async function scheduleAddOnRemoval(input: {
  organizationId: string;
  key: AddOnKey;
  defaultProvider: ProviderName;
  userId: string | null;
  now?: Date;
}): Promise<{ at: Date }> {
  const now = input.now ?? new Date();
  const addOn: AddOnDefinition = ADD_ONS[input.key];
  return db.transaction(async (tx) => {
    await lockBillingAccount(tx, input.organizationId, input.defaultProvider);
    await refuseWhileManagedContractScheduled(tx, input.organizationId, now);
    await dropPendingUpgrade(tx, input.organizationId, "Replaced by an add-on removal.", now);
    const state = await billingStateAt(input.organizationId, now, tx);
    const current = state.contract;
    if (current && current.kind !== "self_serve") {
      throw new BillingError(
        "self_serve_unavailable",
        "Your plan is managed by your contract. Contact your account manager to change it.",
      );
    }
    const base = nextTerms(state);
    if (!current || !base || !(base.addOns ?? []).some((line) => line.key === addOn.key)) {
      throw new BillingError(
        "invalid_change",
        `${addOn.name} isn't part of your plan next month already.`,
      );
    }
    const at = nextPeriod(periodOf(now)).start;
    await insertContract(
      tx,
      {
        organizationId: input.organizationId,
        accountId: current.accountId,
        kind: "self_serve",
        status: "confirmed",
        terms: selfServeTerms(
          base.plan,
          (base.addOns ?? []).filter((line) => line.key !== addOn.key),
        ),
        effectiveFrom: at,
        createdByUserId: input.userId,
      },
      now,
    );
    return { at };
  });
}

/** Reasons a self-serve downgrade to `plan` is refused (features in use the plan lacks). */
export type DowngradePreflight = (organizationId: string, target: PlanKey) => Promise<string[]>;

/** Downgrades (or cancels, `plan: "free"`) at the end of the current billing period. */
export async function scheduleDowngrade(input: {
  organizationId: string;
  plan: PlanKey;
  defaultProvider: ProviderName;
  preflight: DowngradePreflight;
  userId: string | null;
  now?: Date;
}): Promise<{ at: Date }> {
  const now = input.now ?? new Date();
  const blockers = await input.preflight(input.organizationId, input.plan);
  if (blockers.length) {
    throw new BillingError(
      "downgrade_blocked",
      `Before switching to ${PLANS[input.plan].name}: ${blockers.join(" ")}`,
    );
  }
  return db.transaction(async (tx) => {
    await lockBillingAccount(tx, input.organizationId, input.defaultProvider);
    await refuseWhileManagedContractScheduled(tx, input.organizationId, now);
    await dropPendingUpgrade(tx, input.organizationId, "Replaced by a downgrade.", now);
    const state = await billingStateAt(input.organizationId, now, tx);
    const current = state.contract;
    if (!current) throw new BillingError("invalid_change", "You're on the Free plan already.");
    if (current.kind !== "self_serve") {
      throw new BillingError(
        "self_serve_unavailable",
        "Your plan is managed by your contract. Contact your account manager to change it.",
      );
    }
    if (rank(input.plan) >= rank(current.terms.plan)) {
      throw new BillingError("invalid_change", "That isn't a downgrade.");
    }
    // Add-ons carry over (a scheduled removal stays removed); ending the plan ends them too.
    const base = nextTerms(state) ?? current.terms;
    const ineligible = input.plan === "free" ? [] : ineligibleAddOns(base, input.plan);
    if (ineligible.length) {
      throw new BillingError(
        "downgrade_blocked",
        `Before switching to ${PLANS[input.plan].name}: remove the ${ineligible.join(" and ")} add-on first.`,
      );
    }
    const at = nextPeriod(periodOf(now)).start;
    await announcePlanChange(
      tx,
      input.organizationId,
      {
        change: input.plan === "free" ? "cancellation" : "downgrade",
        plan: input.plan,
        previousPlan: current.terms.plan,
        effectiveAt: at,
      },
      now,
    );
    if (input.plan === "free") {
      await endContractAt(tx, current.id, at);
      const scheduled = await nextContractAfter(input.organizationId, now, tx);
      if (scheduled) await cancelContract(tx, scheduled.id, now);
    } else {
      await insertContract(
        tx,
        {
          organizationId: input.organizationId,
          accountId: current.accountId,
          kind: "self_serve",
          status: "confirmed",
          terms: selfServeTerms(input.plan, base.addOns),
          effectiveFrom: at,
          createdByUserId: input.userId,
        },
        now,
      );
    }
    return { at };
  });
}

/** Undoes a scheduled self-serve downgrade or cancellation. */
export async function cancelScheduledChange(input: {
  organizationId: string;
  defaultProvider: ProviderName;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  await db.transaction(async (tx) => {
    await lockBillingAccount(tx, input.organizationId, input.defaultProvider);
    const state = await billingStateAt(input.organizationId, now, tx);
    if (!state.scheduled || !state.contract) {
      throw new BillingError("invalid_change", "No plan change is scheduled.");
    }
    if (
      state.contract.kind !== "self_serve" ||
      (state.scheduled.contract && state.scheduled.contract.kind !== "self_serve")
    ) {
      throw new BillingError(
        "self_serve_unavailable",
        "This change was made by your account manager.",
      );
    }
    if (state.scheduled.contract) await cancelContract(tx, state.scheduled.contract.id, now);
    await clearContractEnd(tx, state.contract.id);
    // An add-on removal changed no plan: nothing to announce.
    if (state.scheduled.contract && state.scheduled.terms.plan === state.contract.terms.plan)
      return;
    await announcePlanChange(
      tx,
      input.organizationId,
      {
        change: "reverted",
        plan: state.contract.terms.plan,
        previousPlan: state.scheduled.terms.plan,
        effectiveAt: state.scheduled.at,
      },
      now,
    );
  });
}

/**
 * Gives up pending upgrades nobody paid for in time: voids their invoices (a payment still
 * processing waits for its outcome). Oldest first. Returns how many were given up.
 */
export async function expirePendingUpgrades(opts: {
  now?: Date;
  scope?: { organizationIds: string[] };
}): Promise<number> {
  const now = opts.now ?? new Date();
  const contract = schema.billingContract;
  const invoice = schema.billingInvoice;
  const rows = await db
    .select({ contract, invoice })
    .from(contract)
    .leftJoin(invoice, eq(invoice.id, contract.pendingInvoiceId))
    .where(
      and(
        eq(contract.status, "pending"),
        lte(contract.pendingExpiresAt, now),
        or(isNull(invoice.paymentState), ne(invoice.paymentState, "processing")),
        opts.scope ? inArray(contract.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(contract.pendingExpiresAt))
    .limit(100);
  let expired = 0;
  for (const { contract: row, invoice: pendingInvoice } of rows) {
    if (pendingInvoice?.status === "open" || pendingInvoice?.status === "draft") {
      await voidInvoice({
        organizationId: row.organizationId,
        invoiceId: pendingInvoice.id,
        actor: null,
        reason: "The upgrade wasn't paid in time.",
        now,
      });
    } else if (pendingInvoice?.status === "paid") {
      // Paid without being settled (it shouldn't happen): settle it now.
      await db.transaction((tx) => afterSettled(tx, pendingInvoice, now));
      continue;
    } else {
      // No invoice, or a void or uncollectible one: nothing will pay for it.
      await db.transaction((tx) => cancelContract(tx, row.id, now));
    }
    expired++;
  }
  return expired;
}

export type NewSalesContract = {
  organizationId: string;
  kind: "sales" | "internal" | "self_serve";
  /** Validated (`contractTermsSchema`) when the contract is created. */
  terms: ContractTermsInput;
  /** `null`: now. Otherwise within the open month (backdated) or the start of a future month. */
  effectiveFrom: Date | null;
  termEnd?: Date | null;
  autoRenew?: boolean;
  note?: string | null;
  reference?: string | null;
};

/** Validates when a contract may start and what its terms need. */
export function validateContract(
  input: Omit<NewSalesContract, "terms"> & { terms: ContractTerms },
  now: Date,
): Date {
  const start = input.effectiveFrom ? input.effectiveFrom : floorHour(now);
  const open = periodOf(now).start;
  if (start < open) {
    throw new BillingError(
      "invalid_contract",
      "A contract can't start before the current billing month.",
    );
  }
  if (start > now && !isMonthStart(start)) {
    throw new BillingError(
      "invalid_contract",
      "A future contract must start on the first of a month (UTC).",
    );
  }
  if (start.getTime() % (60 * 60 * 1000) !== 0) {
    throw new BillingError("invalid_contract", "A contract must start on the hour.");
  }
  const fee = input.terms.fee;
  if (fee && fee.interval !== "month" && !isMonthStart(start)) {
    throw new BillingError(
      "invalid_contract",
      "Quarterly and yearly fees need a contract that starts on the first of a month.",
    );
  }
  const addOns = input.terms.addOns ?? [];
  if (addOns.some((addOn) => addOn.interval !== "month") && !isMonthStart(start)) {
    throw new BillingError(
      "invalid_contract",
      "Quarterly and yearly add-ons need a contract that starts on the first of a month.",
    );
  }
  const ineligible = ineligibleAddOns(input.terms, input.terms.plan);
  if (ineligible.length) {
    throw new BillingError(
      "invalid_contract",
      `${ineligible.join(" and ")} can't be added to the ${PLANS[input.terms.plan].name} plan.`,
    );
  }
  if (input.termEnd) {
    if (input.termEnd <= start)
      throw new BillingError("invalid_contract", "The term must end after it starts.");
    if (!isMonthStart(input.termEnd)) {
      throw new BillingError(
        "invalid_contract",
        "The term must end on the first of a month (UTC).",
      );
    }
    const months = monthIndex(start, input.termEnd);
    for (const commitment of input.terms.commitments ?? []) {
      if (commitment.period === "term") continue;
      const length = { month: 1, quarter: 3, year: 12 }[commitment.period];
      if (months % length !== 0) {
        throw new BillingError(
          "invalid_contract",
          `The term (${months} months) isn't a whole number of ${commitment.period}s for commitment ${commitment.id}.`,
        );
      }
    }
    if (fee && months % INTERVAL_MONTHS[fee.interval] !== 0) {
      throw new BillingError(
        "invalid_contract",
        `The term (${months} months) isn't a whole number of fee ${fee.interval}s.`,
      );
    }
    for (const addOn of addOns) {
      if (months % INTERVAL_MONTHS[addOn.interval] !== 0) {
        throw new BillingError(
          "invalid_contract",
          `The term (${months} months) isn't a whole number of ${addOn.interval}s for add-on ${addOn.key}.`,
        );
      }
    }
  } else if (input.terms.commitments?.some((commitment) => commitment.period === "term")) {
    throw new BillingError("invalid_contract", "Commitments over the term need a term end.");
  } else if (input.autoRenew) {
    throw new BillingError("invalid_contract", "Only a contract with a term can renew.");
  }
  return start;
}

/**
 * A contract from any terms (platform admins: sales deals, internal accounts, or a self-serve plan
 * set by support). Starting now, it is invoiced for the rest of the month at once.
 */
export async function createContract(input: {
  contract: NewSalesContract;
  defaultProvider: ProviderName;
  actor: AdminActor;
  reason: string;
  now?: Date;
}): Promise<{ contract: Contract; invoice: InvoiceRow | null }> {
  const now = input.now ?? new Date();
  const terms = parseContractTerms(input.contract.terms);
  const start = validateContract({ ...input.contract, terms }, now);
  return db.transaction(async (tx) => {
    const account = await lockBillingAccount(
      tx,
      input.contract.organizationId,
      input.defaultProvider,
    );
    await dropPendingUpgrade(tx, input.contract.organizationId, "Replaced by a new contract.", now);
    // Backdating only replaces the one contract in effect then: a later change (already
    // invoiced) would otherwise be undone without its charges being reversed.
    const [later] = await tx
      .select({ effectiveFrom: schema.billingContract.effectiveFrom })
      .from(schema.billingContract)
      .where(
        and(
          eq(schema.billingContract.organizationId, input.contract.organizationId),
          eq(schema.billingContract.status, "confirmed"),
          gt(schema.billingContract.effectiveFrom, start),
          lte(schema.billingContract.effectiveFrom, now),
        ),
      )
      .limit(1);
    if (later) {
      throw new BillingError(
        "invalid_contract",
        `Another contract started on ${later.effectiveFrom.toISOString()}: the new one can't start before it.`,
      );
    }
    const previous =
      start <= now ? await contractAt(input.contract.organizationId, start, tx) : null;
    const before = previous ?? (await contractAt(input.contract.organizationId, start, tx));
    const contract = await insertContract(
      tx,
      {
        organizationId: input.contract.organizationId,
        accountId: account.id,
        kind: input.contract.kind,
        status: "confirmed",
        terms,
        effectiveFrom: start,
        // A term that doesn't renew ends the contract with it.
        effectiveUntil:
          input.contract.termEnd && !input.contract.autoRenew ? input.contract.termEnd : null,
        termEnd: input.contract.termEnd ?? null,
        autoRenew: input.contract.autoRenew ?? false,
        createdByUserId: input.actor.userId,
        note: input.contract.note ?? null,
        reference: input.contract.reference ?? null,
      },
      now,
    );
    let invoice: InvoiceRow | null = null;
    if (start <= now && input.contract.kind !== "internal") {
      const composition = await composeChange(tx, previous, contract, start);
      invoice = await invoiceChange(tx, account, composition, {
        contract,
        at: start,
        deferGrants: false,
        createdByUserId: input.actor.userId,
        now,
      });
    }
    await auditBillingChange(tx, {
      actor: input.actor,
      action: "billing.contract_created",
      organizationId: input.contract.organizationId,
      reason: input.reason,
      metadata: {
        contractId: contract.id,
        kind: contract.kind,
        plan: contract.plan,
        effectiveFrom: contract.effectiveFrom.toISOString(),
        termEnd: contract.termEnd?.toISOString() ?? null,
        autoRenew: contract.autoRenew,
        replaced: previous?.id ?? null,
        invoiceId: invoice?.id ?? null,
      },
    });
    await announcePlanChange(
      tx,
      input.contract.organizationId,
      {
        change: "contract",
        plan: terms.plan,
        previousPlan: before?.terms.plan ?? "free",
        effectiveAt: start,
      },
      now,
    );
    return { contract, invoice };
  });
}

/** Ends a contract early (platform admins), now or at the start of a future month. */
export async function endContract(input: {
  organizationId: string;
  contractId: string;
  at: Date | null;
  defaultProvider: ProviderName;
  actor: AdminActor;
  reason: string;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const at = input.at ?? floorHour(now);
  if (at > now && !isMonthStart(at)) {
    throw new BillingError(
      "invalid_contract",
      "A contract ends now or on the first of a month (UTC).",
    );
  }
  if (at < floorHour(now))
    throw new BillingError("invalid_contract", "A contract can't end in the past.");
  await db.transaction(async (tx) => {
    await lockBillingAccount(tx, input.organizationId, input.defaultProvider);
    const contract = await getContract(input.organizationId, input.contractId, tx);
    if (!contract) throw new BillingError("not_found", "That contract doesn't exist.");
    if (contract.status === "pending") {
      await dropPendingUpgrade(tx, input.organizationId, input.reason, now);
    } else if (contract.effectiveFrom >= at) {
      await cancelContract(tx, contract.id, now);
    } else {
      if (contract.effectiveUntil && contract.effectiveUntil <= at) {
        throw new BillingError("invalid_contract", "That contract has already ended.");
      }
      await endContractAt(tx, contract.id, at);
    }
    if (contract.status === "confirmed") await cancelRenewalsOf(tx, contract.id, at, now);
    if (contract.status === "confirmed") {
      const effectiveAt = contract.effectiveFrom > at ? contract.effectiveFrom : at;
      const following = await contractAt(input.organizationId, effectiveAt, tx);
      await announcePlanChange(
        tx,
        input.organizationId,
        {
          change: "contract",
          plan: following?.terms.plan ?? "free",
          previousPlan: contract.terms.plan,
          effectiveAt,
        },
        now,
      );
    }
    await auditBillingChange(tx, {
      actor: input.actor,
      action: "billing.contract_canceled",
      organizationId: input.organizationId,
      reason: input.reason,
      metadata: { contractId: contract.id, at: at.toISOString() },
    });
  });
}

/** How far ahead of its term's end an auto-renewing contract is renewed (and announced). */
const RENEW_AHEAD_MS = 7 * DAY_MS;
const ANNOUNCE_END_AHEAD_MS = 30 * DAY_MS;

/**
 * Renews auto-renewing contracts a week before their term ends (a successor with the same
 * terms and term length, so commitments start over), and announces non-renewing ones a month
 * ahead. Returns how many were renewed.
 */
export async function runContractRenewals(opts: {
  now?: Date;
  scope?: { organizationIds: string[] };
}): Promise<number> {
  const now = opts.now ?? new Date();
  const c = schema.billingContract;
  const scope = opts.scope ? inArray(c.organizationId, opts.scope.organizationIds) : undefined;
  const renewing = await db
    .select()
    .from(c)
    .where(
      and(
        eq(c.status, "confirmed"),
        eq(c.autoRenew, true),
        isNotNull(c.termEnd),
        lte(c.termEnd, new Date(now.getTime() + RENEW_AHEAD_MS)),
        // Renewing sets its end (its successor's start).
        isNull(c.effectiveUntil),
        scope,
      ),
    )
    .limit(50);
  let renewed = 0;
  for (const row of renewing) {
    const termEnd = row.termEnd;
    if (!termEnd) continue;
    await db.transaction(async (tx) => {
      const account = await lockBillingAccount(tx, row.organizationId, "manual");
      const [fresh] = await tx.select().from(c).where(eq(c.id, row.id));
      // Already renewed (it has a successor from its term end), or changed meanwhile.
      if (fresh?.status !== "confirmed" || !fresh.autoRenew || fresh.effectiveUntil) return;
      const months = monthIndex(fresh.effectiveFrom, termEnd) || 12;
      await insertContract(
        tx,
        {
          organizationId: fresh.organizationId,
          accountId: account.id,
          kind: fresh.kind,
          status: "confirmed",
          terms: parseContractTerms(fresh.terms),
          effectiveFrom: termEnd,
          termEnd: addMonths(termEnd, months),
          autoRenew: true,
          note: renewalNote(fresh.id),
          reference: fresh.reference,
        },
        now,
      );
      renewed++;
    });
  }

  const ending = await db
    .select()
    .from(c)
    .where(
      and(
        eq(c.status, "confirmed"),
        eq(c.autoRenew, false),
        isNotNull(c.effectiveUntil),
        gt(c.effectiveUntil, now),
        lte(c.effectiveUntil, new Date(now.getTime() + ANNOUNCE_END_AHEAD_MS)),
        eq(c.kind, "sales"),
        scope,
      ),
    )
    .limit(100);
  for (const row of ending) {
    if (!row.effectiveUntil) continue;
    const next = await contractAt(row.organizationId, row.effectiveUntil);
    await enqueueBillingNotification(db, {
      organizationId: row.organizationId,
      kind: "contract_ending",
      dedupeKey: `contract_ending:${row.id}:${row.effectiveUntil.toISOString()}`,
      payload: {
        endsOn: row.effectiveUntil.toISOString().slice(0, 10),
        next: next
          ? `the ${PLANS[next.terms.plan].name} plan applies`
          : "your organization moves to the Free plan",
      },
      now,
    });
  }
  return renewed;
}

/** The terms a contract would have at `at` (resolved), for previews. */
export function termsOf(terms: ContractTerms | null, at: Date) {
  return resolveTermsAt(terms ?? FREE_TERMS, at);
}
