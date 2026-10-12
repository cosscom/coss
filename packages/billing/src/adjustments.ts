/**
 * Adjustments platform admins make by hand: one-off invoices (onboarding fees, true-ups agreed
 * outside a contract) and credit notes reducing a finalized invoice, refunded to the payment
 * method or kept as credit for later invoices.
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, inArray, isNotNull, lte, sql, sum } from "drizzle-orm";
import { lockBillingAccount, organizationLabel, type ProviderName } from "./accounts.ts";
import { type AdminActor, auditBillingChange } from "./audit.ts";
import type { DraftLine } from "./engine/types.ts";
import { BillingError } from "./errors.ts";
import {
  createInvoice,
  finalizeInvoice,
  type InvoiceRow,
  lockInvoice,
  nextCounter,
} from "./invoices.ts";
import { afterSettled, recordProviderPayment } from "./payments.ts";
import { type BillingProviders, providerFor } from "./providers/provider.ts";
import { floorHour, periodOf } from "./time.ts";

const { billingCreditGrant, billingCreditNote, billingInvoice } = schema;

export type CreditNoteRow = typeof billingCreditNote.$inferSelect;

/** An invoice of custom lines (positive charges, negative adjustments), finalized at once. */
export async function createOneOffInvoice(input: {
  organizationId: string;
  lines: { description: string; amountCents: bigint }[];
  memo: string | null;
  defaultProvider: ProviderName;
  actor: AdminActor;
  reason: string;
  now?: Date;
}): Promise<InvoiceRow> {
  const now = input.now ?? new Date();
  if (!input.lines.length) throw new BillingError("invalid_change", "Add at least one line.");
  if (input.lines.some((line) => !line.description.trim() || line.amountCents === 0n)) {
    throw new BillingError("invalid_change", "Every line needs a description and an amount.");
  }
  const total = input.lines.reduce((sum, line) => sum + line.amountCents, 0n);
  if (total <= 0n)
    throw new BillingError("invalid_change", "The invoice's total must be positive.");
  return db.transaction(async (tx) => {
    const account = await lockBillingAccount(tx, input.organizationId, input.defaultProvider);
    const organization = await organizationLabel(input.organizationId, tx);
    if (!organization) throw new BillingError("not_found", "The organization no longer exists.");
    const period = { start: floorHour(now), end: periodOf(now).end };
    const lines: DraftLine[] = input.lines.map((line) => ({
      kind: "adjustment",
      description: line.description.trim(),
      amountCents: line.amountCents,
      period,
      contractId: null,
    }));
    const invoice = await createInvoice(tx, {
      account,
      organization,
      kind: "one_off",
      period,
      lines,
      memo: input.memo,
      createdByUserId: input.actor.userId,
    });
    const finalized = await finalizeInvoice(tx, invoice, account, now);
    await auditBillingChange(tx, {
      actor: input.actor,
      action: "billing.invoice_created",
      organizationId: input.organizationId,
      reason: input.reason,
      metadata: { invoiceId: finalized.id, number: finalized.number, totalCents: total.toString() },
    });
    return finalized;
  });
}

/**
 * Reduces a finalized invoice. An open one owes less (settled when nothing is left); a paid one
 * gets `refundCents` back on its payment method and the rest as credit for later invoices.
 */
export async function createCreditNote(input: {
  organizationId: string;
  invoiceId: string;
  amountCents: bigint;
  refundCents: bigint;
  memo: string;
  actor: AdminActor;
  reason: string;
  now?: Date;
}): Promise<CreditNoteRow> {
  const now = input.now ?? new Date();
  if (input.amountCents <= 0n)
    throw new BillingError("invalid_change", "A credit note must be positive.");
  if (input.refundCents < 0n || input.refundCents > input.amountCents) {
    throw new BillingError(
      "invalid_change",
      "The refund must be between zero and the credit note's amount.",
    );
  }
  return db.transaction(async (tx) => {
    const invoice = await lockInvoice(tx, input.invoiceId);
    if (invoice?.organizationId !== input.organizationId) {
      throw new BillingError("not_found", "That invoice doesn't exist.");
    }
    if (invoice.status !== "open" && invoice.status !== "paid") {
      throw new BillingError(
        "invoice_state",
        `A ${invoice.status} invoice can't take a credit note.`,
      );
    }
    if (invoice.provider === "stripe" && !invoice.providerInvoiceId) {
      // Its lines would reach Stripe without the reduction: wait until it's issued there.
      throw new BillingError(
        "invoice_state",
        "The invoice hasn't been issued at Stripe yet. Try again in a minute.",
      );
    }
    if (invoice.paymentState === "processing") {
      throw new BillingError(
        "invoice_state",
        "Wait for the payment to settle before crediting it.",
      );
    }
    if (invoice.status === "open" && input.amountCents > invoice.amountDueCents) {
      throw new BillingError(
        "invalid_change",
        "An open invoice can only be credited up to its remaining balance.",
      );
    }
    const [prior] = await tx
      .select({
        amount: sum(billingCreditNote.amountCents),
        refunded: sum(billingCreditNote.refundCents),
      })
      .from(billingCreditNote)
      .where(eq(billingCreditNote.invoiceId, invoice.id));
    const credited = BigInt(prior?.amount ?? 0);
    const refunded = BigInt(prior?.refunded ?? 0);
    if (credited + input.amountCents > invoice.totalCents) {
      throw new BillingError(
        "invalid_change",
        "That's more than what's left of the invoice to credit.",
      );
    }
    if (
      input.refundCents > 0n &&
      (invoice.status !== "paid" || refunded + input.refundCents > invoice.amountPaidCents)
    ) {
      throw new BillingError("invalid_change", "Only what was paid can be refunded.");
    }
    const number = `CN-${String(await nextCounter(tx, "credit_note")).padStart(6, "0")}`;
    const [note] = await tx
      .insert(billingCreditNote)
      .values({
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
        number,
        amountCents: input.amountCents,
        refundCents: input.refundCents,
        memo: input.memo,
        reason: input.reason,
        status: invoice.providerInvoiceId ? "pending" : "issued",
        nextSyncAt: invoice.providerInvoiceId ? now : null,
        createdByUserId: input.actor.userId,
      })
      .returning();
    if (!note) throw new Error("Credit note insert returned nothing.");

    if (invoice.status === "open") {
      const due = invoice.amountDueCents - input.amountCents;
      const [row] = await tx
        .update(billingInvoice)
        .set(
          due > 0n
            ? { amountDueCents: due }
            : {
                amountDueCents: 0n,
                status: "paid",
                paidAt: now,
                nextCollectionAt: null,
                paymentState: null,
                // Nothing left to collect (Stripe settles a fully credited invoice itself).
                syncAction: null,
                nextSyncAt: null,
              },
        )
        .where(eq(billingInvoice.id, invoice.id))
        .returning();
      if (row && due <= 0n) await afterSettled(tx, row, now);
    } else if (input.amountCents > input.refundCents) {
      // What isn't refunded pays for later invoices.
      await tx.insert(billingCreditGrant).values({
        organizationId: invoice.organizationId,
        kind: "amount",
        amount: input.amountCents - input.refundCents,
        appliesTo: "any",
        source: "refund",
        description: `Credit note ${number}`,
        reason: input.reason,
        effectiveAt: now,
        expiresAt: null,
        createdByUserId: input.actor.userId,
      });
    }
    await auditBillingChange(tx, {
      actor: input.actor,
      action: "billing.credit_note_created",
      organizationId: invoice.organizationId,
      reason: input.reason,
      metadata: {
        invoiceId: invoice.id,
        creditNoteId: note.id,
        number,
        amountCents: input.amountCents.toString(),
        refundCents: input.refundCents.toString(),
      },
    });
    return note;
  });
}

export async function listCreditNotes(organizationId: string): Promise<CreditNoteRow[]> {
  return db
    .select()
    .from(billingCreditNote)
    .where(eq(billingCreditNote.organizationId, organizationId))
    .orderBy(asc(billingCreditNote.createdAt));
}

/** Mirrors pending credit notes (and their refunds) at the provider. Returns how many were tried. */
export async function runDueCreditNoteSync(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } },
  deps: { providers: BillingProviders },
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select({ note: billingCreditNote, invoice: billingInvoice })
    .from(billingCreditNote)
    .innerJoin(billingInvoice, eq(billingInvoice.id, billingCreditNote.invoiceId))
    .where(
      and(
        eq(billingCreditNote.status, "pending"),
        opts.scope
          ? inArray(billingCreditNote.organizationId, opts.scope.organizationIds)
          : undefined,
        isNotNull(billingCreditNote.nextSyncAt),
        lte(billingCreditNote.nextSyncAt, now),
      ),
    )
    .orderBy(asc(billingCreditNote.nextSyncAt))
    .limit(opts.limit ?? 20);
  for (const { note, invoice } of due) {
    const claimed = await db
      .update(billingCreditNote)
      .set({
        syncAttempts: sql`${billingCreditNote.syncAttempts} + 1`,
        nextSyncAt: new Date(now.getTime() + 5 * 60_000),
      })
      .where(and(eq(billingCreditNote.id, note.id), lte(billingCreditNote.nextSyncAt, now)))
      .returning({ id: billingCreditNote.id });
    if (!claimed.length) continue;
    try {
      const provider = providerFor(deps.providers, invoice.provider);
      const created = await provider.createCreditNote(
        { invoice, lines: [], account: null },
        {
          id: note.id,
          amountCents: note.amountCents,
          refundCents: note.refundCents,
          memo: note.memo,
        },
      );
      const state = await provider.fetchInvoice({ invoice, lines: [], account: null });
      await db.transaction(async (tx) => {
        const current = await lockInvoice(tx, invoice.id);
        if (current && state?.status === "paid")
          await recordProviderPayment(
            tx,
            current,
            {
              amountCents: state.paidCents,
              method: state.method ?? invoice.provider,
              providerPaymentId: state.paymentId,
              receivedAt: now,
            },
            now,
          );
        await tx
          .update(billingCreditNote)
          .set({
            status: "issued",
            providerCreditNoteId: created.providerCreditNoteId,
            nextSyncAt: null,
            syncError: null,
          })
          .where(eq(billingCreditNote.id, note.id));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[billing] credit note ${note.id} failed:`, error);
      const attempts = note.syncAttempts + 1;
      await db
        .update(billingCreditNote)
        .set(
          attempts >= 10
            ? { status: "failed", nextSyncAt: null, syncError: message }
            : {
                nextSyncAt: new Date(now.getTime() + Math.min(2 ** attempts, 60) * 60_000),
                syncError: message,
              },
        )
        .where(eq(billingCreditNote.id, note.id));
    }
  }
  return due.length;
}

/** Invoices needing attention across organizations (admin overview). */
export async function invoicesNeedingAttention(limit = 50) {
  return db
    .select()
    .from(billingInvoice)
    .where(
      and(
        inArray(billingInvoice.status, ["open"]),
        sql`(${billingInvoice.syncError} is not null or ${billingInvoice.paymentState} in ('failed', 'requires_action', 'disputed') or ${billingInvoice.dueAt} < now())`,
      ),
    )
    .orderBy(asc(billingInvoice.dueAt))
    .limit(limit);
}
