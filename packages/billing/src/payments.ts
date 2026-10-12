/**
 * Payments and what follows them: an invoice settles, an upgrade waiting on it takes effect,
 * and the account's standing (and any delinquency hold) is re-evaluated. Also invoice voids,
 * write-offs and manual payments, which platform admins make.
 */
import { db, schema, type Transaction } from "@coss/db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { lockBillingAccount } from "./accounts.ts";
import { type AdminActor, auditBillingChange } from "./audit.ts";
import { cancelContract, contractPendingOn } from "./contracts.ts";
import { BillingError } from "./errors.ts";
import { reverseInvoiceCredits } from "./grants.ts";
import { evaluateStanding } from "./holds.ts";
import { type InvoiceRow, lockInvoice } from "./invoices.ts";
import { settlePendingContract } from "./upgrades.ts";

const { billingInvoice, billingInvoiceLine, billingPayment } = schema;

export type PaymentInput = {
  amountCents: bigint;
  /** `card`, `us_bank_account`, `wire`, `check`, … */
  method: string;
  reference?: string | null;
  /** The provider's id: a payment reported twice is recorded once. */
  providerPaymentId?: string | null;
  receivedAt: Date;
  recordedByUserId?: string | null;
  note?: string | null;
};

/**
 * Records a payment on a locked invoice. Fully paid: the invoice is `paid`, an upgrade waiting
 * on it takes effect and the account's standing is re-evaluated. Returns the invoice.
 */
export async function recordPayment(
  tx: Transaction,
  invoice: InvoiceRow,
  payment: PaymentInput,
  now: Date,
  opts: { systemOrganizationId?: string | null } = {},
): Promise<InvoiceRow> {
  if (invoice.status !== "open") return invoice;
  if (payment.providerPaymentId) {
    const inserted = await tx
      .insert(billingPayment)
      .values({ ...paymentValues(invoice, payment) })
      .onConflictDoNothing({ target: billingPayment.providerPaymentId })
      .returning({ id: billingPayment.id });
    if (!inserted.length) return invoice;
  } else {
    await tx.insert(billingPayment).values(paymentValues(invoice, payment));
  }
  const paid = invoice.amountPaidCents + payment.amountCents;
  // What's due already accounts for credit notes on the open invoice.
  const due = invoice.amountDueCents - payment.amountCents;
  const settled = due <= 0n;
  const [row] = await tx
    .update(billingInvoice)
    .set({
      amountPaidCents: paid,
      amountDueCents: settled ? 0n : due,
      ...(settled
        ? {
            status: "paid" as const,
            paidAt: now,
            paymentState: null,
            paymentError: null,
            nextCollectionAt: null,
            syncAction: null,
            nextSyncAt: null,
          }
        : {}),
    })
    .where(eq(billingInvoice.id, invoice.id))
    .returning();
  if (!row) throw new Error(`Invoice ${invoice.id} disappeared.`);
  if (settled) await afterSettled(tx, row, now, opts.systemOrganizationId);
  return row;
}

function paymentValues(invoice: InvoiceRow, payment: PaymentInput) {
  return {
    organizationId: invoice.organizationId,
    invoiceId: invoice.id,
    amountCents: payment.amountCents,
    method: payment.method,
    reference: payment.reference ?? null,
    providerPaymentId: payment.providerPaymentId ?? null,
    receivedAt: payment.receivedAt,
    recordedByUserId: payment.recordedByUserId ?? null,
    note: payment.note ?? null,
  };
}

/** An invoice was settled (paid now, or finalized at zero): settle what waited on it. */
export async function afterSettled(
  tx: Transaction,
  invoice: InvoiceRow,
  now: Date,
  systemOrganizationId?: string | null,
): Promise<void> {
  await settlePendingContract(tx, invoice, now);
  await evaluateStanding(tx, invoice.accountId, now, systemOrganizationId);
}

/** Voids an unpaid invoice: its charges can be billed again, its credits are given back. */
type VoidInvoiceInput = {
  organizationId: string;
  invoiceId: string;
  actor: AdminActor | null;
  reason: string;
  now?: Date;
};

export async function voidInvoice(input: VoidInvoiceInput): Promise<InvoiceRow> {
  return db.transaction((tx) => voidInvoiceInTransaction(tx, input));
}

/** Voids an invoice as part of an existing billing change. */
export async function voidInvoiceInTransaction(
  tx: Transaction,
  input: VoidInvoiceInput,
): Promise<InvoiceRow> {
  const now = input.now ?? new Date();
  const invoice = await lockInvoice(tx, input.invoiceId);
  if (!invoice || invoice.organizationId !== input.organizationId) {
    throw new BillingError("not_found", "That invoice doesn't exist.");
  }
  if (invoice.status !== "open" && invoice.status !== "draft") {
    throw new BillingError("invoice_state", `A ${invoice.status} invoice can't be voided.`);
  }
  if (invoice.amountPaidCents > 0n) {
    throw new BillingError(
      "invoice_state",
      "A partly paid invoice can't be voided; issue a credit note.",
    );
  }
  if (invoice.paymentState === "processing") {
    // A debit that may still settle: its outcome comes first.
    throw new BillingError("invoice_state", "A payment for this invoice is still being processed.");
  }
  const [row] = await tx
    .update(billingInvoice)
    .set({
      status: "void",
      voidedAt: now,
      amountDueCents: 0n,
      nextCollectionAt: null,
      paymentState: null,
      syncAction: invoice.providerInvoiceId ? "void" : null,
      nextSyncAt: invoice.providerInvoiceId ? now : null,
    })
    .where(eq(billingInvoice.id, invoice.id))
    .returning();
  if (!row) throw new Error(`Invoice ${invoice.id} disappeared.`);
  await tx
    .update(billingInvoiceLine)
    .set({ chargeKey: null })
    .where(eq(billingInvoiceLine.invoiceId, invoice.id));
  await reverseInvoiceCredits(tx, invoice.organizationId, invoice.id, now);
  const pending = await contractPendingOn(invoice.id, tx);
  if (pending) await cancelContract(tx, pending.id, now);
  await evaluateStanding(tx, invoice.accountId, now);
  if (input.actor) {
    await auditBillingChange(tx, {
      actor: input.actor,
      action: "billing.invoice_voided",
      organizationId: invoice.organizationId,
      reason: input.reason,
      metadata: { invoiceId: invoice.id, number: invoice.number },
    });
  }
  return row;
}

/** Writes an unpaid invoice off: it stops counting as overdue (no more collection). */
export async function markInvoiceUncollectible(input: {
  organizationId: string;
  invoiceId: string;
  actor: AdminActor;
  reason: string;
  now?: Date;
}): Promise<InvoiceRow> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const invoice = await lockInvoice(tx, input.invoiceId);
    if (!invoice || invoice.organizationId !== input.organizationId) {
      throw new BillingError("not_found", "That invoice doesn't exist.");
    }
    if (invoice.status !== "open") {
      throw new BillingError("invoice_state", `A ${invoice.status} invoice can't be written off.`);
    }
    const [row] = await tx
      .update(billingInvoice)
      .set({
        status: "uncollectible",
        nextCollectionAt: null,
        syncAction: invoice.providerInvoiceId ? "mark_uncollectible" : null,
        nextSyncAt: invoice.providerInvoiceId ? now : null,
      })
      .where(eq(billingInvoice.id, invoice.id))
      .returning();
    if (!row) throw new Error(`Invoice ${invoice.id} disappeared.`);
    const pending = await contractPendingOn(invoice.id, tx);
    if (pending) await cancelContract(tx, pending.id, now);
    await evaluateStanding(tx, invoice.accountId, now);
    await auditBillingChange(tx, {
      actor: input.actor,
      action: "billing.invoice_uncollectible",
      organizationId: invoice.organizationId,
      reason: input.reason,
      metadata: { invoiceId: invoice.id, number: invoice.number },
    });
    return row;
  });
}

/** A payment received outside the provider (wire, check), recorded by an admin. */
export async function recordManualPayment(input: {
  organizationId: string;
  invoiceId: string;
  payment: Omit<PaymentInput, "providerPaymentId" | "recordedByUserId">;
  actor: AdminActor;
  reason: string;
  now?: Date;
}): Promise<InvoiceRow> {
  const now = input.now ?? new Date();
  if (input.payment.amountCents <= 0n) {
    throw new BillingError("invalid_change", "A payment must be positive.");
  }
  return db.transaction(async (tx) => {
    const invoice = await lockInvoice(tx, input.invoiceId);
    if (!invoice || invoice.organizationId !== input.organizationId) {
      throw new BillingError("not_found", "That invoice doesn't exist.");
    }
    if (invoice.status !== "open") {
      throw new BillingError("invoice_state", `A ${invoice.status} invoice can't take a payment.`);
    }
    if (invoice.provider === "stripe") {
      throw new BillingError(
        "invalid_change",
        "Manual payments aren't supported for Stripe invoices. Record the payment through Stripe.",
      );
    }
    if (input.payment.amountCents > invoice.amountDueCents) {
      throw new BillingError("invalid_change", "That's more than the invoice's amount due.");
    }
    const row = await recordPayment(
      tx,
      invoice,
      { ...input.payment, recordedByUserId: input.actor.userId },
      now,
    );
    await auditBillingChange(tx, {
      actor: input.actor,
      action: "billing.invoice_paid",
      organizationId: invoice.organizationId,
      reason: input.reason,
      metadata: {
        invoiceId: invoice.id,
        number: invoice.number,
        amountCents: input.payment.amountCents.toString(),
        method: input.payment.method,
        reference: input.payment.reference ?? null,
      },
    });
    return row;
  });
}

/** Re-queues an invoice for the provider (after a sync failure) or another collection attempt. */
export async function resyncInvoice(input: {
  organizationId: string;
  invoiceId: string;
  actor: AdminActor;
  reason: string;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  await db.transaction(async (tx) => {
    const invoice = await lockInvoice(tx, input.invoiceId);
    if (!invoice || invoice.organizationId !== input.organizationId) {
      throw new BillingError("not_found", "That invoice doesn't exist.");
    }
    if (invoice.status !== "open") {
      throw new BillingError("invoice_state", `A ${invoice.status} invoice has nothing to retry.`);
    }
    await tx
      .update(billingInvoice)
      .set({
        syncAction: invoice.providerInvoiceId ? "collect" : "push",
        nextSyncAt: now,
        syncError: null,
      })
      .where(eq(billingInvoice.id, invoice.id));
    await auditBillingChange(tx, {
      actor: input.actor,
      action: "billing.invoice_resynced",
      organizationId: invoice.organizationId,
      reason: input.reason,
      metadata: { invoiceId: invoice.id, number: invoice.number },
    });
  });
}

/** Locks the account then re-evaluates its standing (after events that may have changed it). */
export async function reevaluateAccount(
  organizationId: string,
  defaultProvider: "fake" | "stripe" | "manual",
  now: Date,
  systemOrganizationId?: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const account = await lockBillingAccount(tx, organizationId, defaultProvider);
    await evaluateStanding(tx, account.id, now, systemOrganizationId);
  });
}

export async function invoicesById(ids: string[]): Promise<InvoiceRow[]> {
  if (!ids.length) return [];
  return db
    .select()
    .from(billingInvoice)
    .where(and(inArray(billingInvoice.id, ids)));
}

/** An invoice's payments, oldest first. */
export async function listPayments(organizationId: string, invoiceId: string) {
  return db
    .select()
    .from(billingPayment)
    .where(
      and(
        eq(billingPayment.organizationId, organizationId),
        eq(billingPayment.invoiceId, invoiceId),
      ),
    )
    .orderBy(asc(billingPayment.receivedAt));
}
