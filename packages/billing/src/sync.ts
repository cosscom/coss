/**
 * The provider outbox: finalized invoices are pushed to their provider, then collected (charged,
 * or sent with net terms); voids and write-offs are mirrored. Run by the worker; also called
 * directly to collect an upgrade's invoice while the customer waits.
 */
import { db, schema, type Transaction } from "@coss/db";
import { and, asc, eq, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { getBillingAccount, organizationLabel } from "./accounts.ts";
import { announce } from "./announce.ts";
import { contractPendingOn } from "./contracts.ts";
import { evaluateStanding } from "./holds.ts";
import { type InvoiceRow, invoiceLines, lockInvoice } from "./invoices.ts";
import { enqueueBillingNotification } from "./notifications.ts";
import { toInvoiceSummary } from "./objects.ts";
import { recordPayment, recordProviderPayment } from "./payments.ts";
import {
  type BillingProviders,
  type CollectResult,
  type ProviderInvoice,
  providerFor,
} from "./providers/provider.ts";

const { billingAccount, billingInvoice } = schema;

const MINUTE = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE;
export const SYNC_LEASE_MS = 5 * MINUTE;
/** Days after a failed charge that it is retried (then the account's grace period runs out). */
export const RETRY_DAYS = [3, 5, 7] as const;
/**
 * How often an upgrade's invoice waiting for a payment method looks again (the customer may finish
 * Checkout without coming back to the dashboard; its event records the method).
 */
export const PAYMENT_METHOD_RECHECK_MS = 15 * MINUTE;
export const NO_PAYMENT_METHOD_ERROR = "No payment method on file.";

export type BillingSyncDeps = {
  providers: BillingProviders;
  /** Origin of the dashboard: the manual provider's invoices link to it. */
  dashboardUrl: string;
  systemOrganizationId?: string | null;
};

function backoffMs(attempt: number): number {
  return Math.min(2 ** (attempt - 1) * MINUTE, 60 * MINUTE);
}

/** Runs due outbox actions, oldest first. Returns how many were claimed. */
export async function runDueBillingSync(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } },
  deps: BillingSyncDeps,
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = and(
    isNotNull(billingInvoice.syncAction),
    isNotNull(billingInvoice.nextSyncAt),
    lte(billingInvoice.nextSyncAt, now),
  );
  const candidates = await db
    .select({ id: billingInvoice.id })
    .from(billingInvoice)
    .where(
      and(
        due,
        opts.scope ? inArray(billingInvoice.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(billingInvoice.nextSyncAt))
    .limit(opts.limit ?? 20);
  let claimed = 0;
  for (const candidate of candidates) {
    const [row] = await db
      .update(billingInvoice)
      .set({
        syncAttempts: sql`${billingInvoice.syncAttempts} + 1`,
        nextSyncAt: new Date(now.getTime() + SYNC_LEASE_MS),
      })
      .where(and(due, eq(billingInvoice.id, candidate.id)))
      .returning();
    if (!row) continue;
    claimed++;
    await syncInvoice(row, deps, now);
  }
  return claimed;
}

/**
 * Pushes and collects one invoice right away (an upgrade the customer is waiting on, e.g. back
 * from adding a card in Checkout). A charge that already ended (failed, or waiting for 3-D
 * Secure) is tried again: the customer is here, perhaps with a new payment method. Returns the
 * collection's outcome (`null` when there was nothing to collect).
 */
export async function collectInvoiceNow(
  invoiceId: string,
  deps: BillingSyncDeps,
  now: Date = new Date(),
): Promise<CollectResult | null> {
  await db
    .update(billingInvoice)
    .set({ syncAction: "collect", nextSyncAt: now, nextCollectionAt: null, syncError: null })
    .where(
      and(
        eq(billingInvoice.id, invoiceId),
        isNull(billingInvoice.syncAction),
        eq(billingInvoice.status, "open"),
        eq(billingInvoice.collectionMethod, "charge_automatically"),
        isNotNull(billingInvoice.providerInvoiceId),
        inArray(billingInvoice.paymentState, ["failed", "requires_action"]),
      ),
    );
  let result: CollectResult | null = null;
  for (let step = 0; step < 2; step++) {
    const [row] = await db
      .update(billingInvoice)
      .set({
        syncAttempts: sql`${billingInvoice.syncAttempts} + 1`,
        nextSyncAt: new Date(now.getTime() + SYNC_LEASE_MS),
      })
      .where(and(eq(billingInvoice.id, invoiceId), isNotNull(billingInvoice.syncAction)))
      .returning();
    if (!row) break;
    result = (await syncInvoice(row, deps, now)) ?? result;
    if (row.syncAction === "collect") break;
  }
  return result;
}

async function providerInput(invoice: InvoiceRow): Promise<ProviderInvoice> {
  const [lines, account] = await Promise.all([
    invoiceLines(invoice.id),
    getBillingAccount(invoice.organizationId),
  ]);
  return { invoice, lines, account: account?.id === invoice.accountId ? account : null };
}

async function syncInvoice(
  invoice: InvoiceRow,
  deps: BillingSyncDeps,
  now: Date,
): Promise<CollectResult | null> {
  const provider = providerFor(deps.providers, invoice.provider);
  try {
    const input = await providerInput(invoice);
    switch (invoice.syncAction) {
      case "push": {
        if (!invoice.providerCustomerId && input.account) {
          const organization = await organizationLabel(invoice.organizationId);
          const customerId = organization
            ? await provider.ensureCustomer(input.account, organization)
            : null;
          if (customerId) {
            await db
              .update(billingAccount)
              .set({ providerCustomerId: customerId })
              .where(eq(billingAccount.id, input.account.id));
            input.invoice = { ...invoice, providerCustomerId: customerId };
            input.account = { ...input.account, providerCustomerId: customerId };
          }
        }
        const pushed = await provider.pushInvoice(input);
        const hostedUrl =
          pushed.hostedUrl ??
          new URL(
            `/${invoice.organizationSlug}/settings/billing/invoices/${invoice.id}`,
            deps.dashboardUrl,
          ).toString();
        await db.transaction(async (tx) => {
          const current = await lockInvoice(tx, invoice.id);
          if (!current) return;
          // A duplicate push must not restart a collection that already completed.
          if (
            current.providerInvoiceId === pushed.providerInvoiceId &&
            current.syncAction !== "push"
          )
            return;
          const action =
            current.status === "void"
              ? "void"
              : current.status === "uncollectible"
                ? "mark_uncollectible"
                : current.status === "open"
                  ? "collect"
                  : null;
          const taxed = pushed.totalCents !== undefined && pushed.totalCents !== current.totalCents;
          await tx
            .update(billingInvoice)
            .set({
              providerCustomerId: input.invoice.providerCustomerId,
              providerInvoiceId: pushed.providerInvoiceId,
              hostedUrl,
              pdfUrl: pushed.pdfUrl,
              ...(taxed && pushed.totalCents !== undefined
                ? {
                    taxCents: pushed.taxCents ?? pushed.totalCents - current.totalCents,
                    totalCents: pushed.totalCents,
                    ...(current.status === "open"
                      ? {
                          amountDueCents:
                            current.amountDueCents + pushed.totalCents - current.totalCents,
                        }
                      : {}),
                  }
                : {}),
              syncAction: action,
              nextSyncAt: action ? now : null,
              syncAttempts: 0,
              syncError: null,
            })
            .where(eq(billingInvoice.id, current.id));
        });
        return null;
      }
      case "collect": {
        return await db.transaction(async (tx) => {
          // Credit creation takes this same lock. Keep it through collection and recording
          // the result so a credit cannot be classified against a stale unpaid balance.
          const current = await lockInvoice(tx, invoice.id);
          if (current?.status !== "open" || current.syncAction !== "collect") return null;
          const [unissued] = await tx
            .select({ id: schema.billingCreditNote.id })
            .from(schema.billingCreditNote)
            .where(
              and(
                eq(schema.billingCreditNote.invoiceId, current.id),
                ne(schema.billingCreditNote.status, "issued"),
              ),
            )
            .limit(1);
          if (unissued) {
            await tx
              .update(billingInvoice)
              .set({
                nextSyncAt: new Date(now.getTime() + MINUTE),
                syncError: "Waiting for invoice credit notes to reach the provider.",
              })
              .where(eq(billingInvoice.id, current.id));
            return null;
          }
          const result = await provider.collect({ ...input, invoice: current });
          await applyCollectionInTransaction(tx, current, result, deps, now);
          return result;
        });
      }
      case "void":
      case "mark_uncollectible": {
        if (invoice.syncAction === "void") await provider.voidInvoice(input);
        else await provider.markUncollectible(input);
        // The provider may already be paid and treat cancellation as a no-op. Reconcile
        // before clearing the outbox: terminal invoices aren't scanned for lost webhooks.
        const state = await provider.fetchInvoice(input);
        await db.transaction(async (tx) => {
          const current = await lockInvoice(tx, invoice.id);
          if (!current) return;
          if (state?.status === "paid")
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
              deps,
            );
          await tx
            .update(billingInvoice)
            .set({ syncAction: null, nextSyncAt: null, syncAttempts: 0, syncError: null })
            .where(eq(billingInvoice.id, invoice.id));
        });
        return null;
      }
      default:
        await settleSync(invoice.id, now);
        return null;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[billing] ${invoice.syncAction} of invoice ${invoice.id} failed:`, error);
    await db
      .update(billingInvoice)
      .set({
        nextSyncAt: new Date(now.getTime() + backoffMs(invoice.syncAttempts)),
        syncError: message.slice(0, 500),
      })
      .where(eq(billingInvoice.id, invoice.id));
    return null;
  }
}

async function settleSync(invoiceId: string, _now: Date): Promise<void> {
  await db
    .update(billingInvoice)
    .set({ syncAction: null, nextSyncAt: null, syncAttempts: 0, syncError: null })
    .where(eq(billingInvoice.id, invoiceId));
}

/** Records what a collection attempt did, and schedules what comes next. */
export async function applyCollection(
  invoice: InvoiceRow,
  result: CollectResult,
  deps: Pick<BillingSyncDeps, "systemOrganizationId">,
  now: Date,
): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await lockInvoice(tx, invoice.id);
    // Another event or collection attempt may already have moved this payment forward.
    if (
      !current ||
      current.paymentState !== invoice.paymentState ||
      current.collectionAttempts !== invoice.collectionAttempts
    )
      return;
    await applyCollectionInTransaction(tx, current, result, deps, now);
  });
}

async function applyCollectionInTransaction(
  tx: Transaction,
  invoice: InvoiceRow,
  outcome: CollectResult,
  deps: Pick<BillingSyncDeps, "systemOrganizationId">,
  now: Date,
): Promise<void> {
  const current = await lockInvoice(tx, invoice.id);
  if (current?.status !== "open") return;
  let result = outcome;
  if (result.state === "no_payment_method") {
    // An upgrade's customer is sent to Checkout to add one while this runs: wait for it (no
    // failure, no notification, no retry spent). Coming back collects at once
    // (`collectInvoiceNow`); an upgrade nobody pays for is given up after a day.
    if (await contractPendingOn(current.id, tx)) {
      await tx
        .update(billingInvoice)
        .set({
          syncAction: "collect",
          nextSyncAt: new Date(now.getTime() + PAYMENT_METHOD_RECHECK_MS),
          syncAttempts: 0,
          syncError: "Waiting for a payment method.",
        })
        .where(eq(billingInvoice.id, current.id));
      return;
    }
    // Anything else is dunned like a declined charge: the customer must add one.
    result = { state: "failed", error: NO_PAYMENT_METHOD_ERROR };
  }
  const done = { syncAction: null, nextSyncAt: null, syncAttempts: 0, syncError: null };
  switch (result.state) {
    case "paid":
      await tx.update(billingInvoice).set(done).where(eq(billingInvoice.id, current.id));
      await (current.provider === "stripe" ? recordProviderPayment : recordPayment)(
        tx,
        { ...current, ...done },
        {
          amountCents: result.amountCents,
          method: result.method,
          providerPaymentId: result.paymentId,
          receivedAt: now,
        },
        now,
        { systemOrganizationId: deps.systemOrganizationId },
      );
      return;
    case "processing":
      await tx
        .update(billingInvoice)
        .set({ ...done, paymentState: "processing", paymentError: null, nextCollectionAt: null })
        .where(eq(billingInvoice.id, current.id));
      return;
    case "requires_action":
      await tx
        .update(billingInvoice)
        .set({
          ...done,
          paymentState: "requires_action",
          hostedUrl: result.hostedUrl ?? current.hostedUrl,
          nextCollectionAt: nextRetry(current, now),
          collectionAttempts: current.collectionAttempts + 1,
        })
        .where(eq(billingInvoice.id, current.id));
      await enqueueBillingNotification(tx, {
        organizationId: current.organizationId,
        kind: "payment_action_required",
        dedupeKey: `action:${current.id}:${current.collectionAttempts}`,
        payload: { invoiceId: current.id },
        now,
      });
      return;
    case "failed":
      await tx
        .update(billingInvoice)
        .set({
          ...done,
          paymentState: "failed",
          paymentError: result.error.slice(0, 500),
          nextCollectionAt: nextRetry(current, now),
          collectionAttempts: current.collectionAttempts + 1,
        })
        .where(eq(billingInvoice.id, current.id));
      await enqueueBillingNotification(tx, {
        organizationId: current.organizationId,
        kind: "payment_failed",
        dedupeKey: `failed:${current.id}:${current.collectionAttempts}`,
        payload: { invoiceId: current.id, error: result.error.slice(0, 200) },
        now,
      });
      await announce(
        tx,
        current.organizationId,
        {
          type: "billing.invoice_payment_failed",
          data: {
            invoice: toInvoiceSummary(current),
            failure: { message: result.error.slice(0, 200) },
          },
        },
        now,
      );
      await evaluateStanding(tx, current.accountId, now, deps.systemOrganizationId);
      return;
    case "sent": {
      const reminder = current.dueAt
        ? new Date(Math.max(now.getTime(), current.dueAt.getTime() - 3 * DAY_MS))
        : null;
      await tx
        .update(billingInvoice)
        .set({ ...done, nextCollectionAt: reminder })
        .where(eq(billingInvoice.id, current.id));
      if (current.provider === "manual") {
        await enqueueBillingNotification(tx, {
          organizationId: current.organizationId,
          kind: "invoice_issued",
          dedupeKey: `issued:${current.id}`,
          payload: { invoiceId: current.id },
          now,
        });
      }
      return;
    }
  }
}

/** When to try a failed charge again (`null`: the schedule is over; the grace period decides). */
function nextRetry(invoice: InvoiceRow, now: Date): Date | null {
  const days = RETRY_DAYS[invoice.collectionAttempts];
  return days === undefined ? null : new Date(now.getTime() + days * DAY_MS);
}
