/**
 * Dunning, on COSS's schedule (whatever the provider): failed charges are retried
 * (`RETRY_DAYS`), invoices with net terms get reminders before and after their due date, and
 * accounts with overdue invoices become `past_due`, then `delinquent` (held) after their grace
 * days. System-level: spans organizations.
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, gt, inArray, isNotNull, lt, lte, ne, or } from "drizzle-orm";
import { evaluateStanding } from "./holds.ts";
import { enqueueBillingNotification } from "./notifications.ts";

const { billingAccount, billingInvoice } = schema;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Reminders after the due date, in days (the last one before the grace period runs out). */
const OVERDUE_REMINDER_DAYS = [1, 7] as const;

export async function runDueBillingCollection(opts: {
  now?: Date;
  limit?: number;
  scope?: { organizationIds: string[] };
  systemOrganizationId?: string | null;
}): Promise<number> {
  const now = opts.now ?? new Date();
  const limit = Math.max(1, opts.limit ?? 50);
  const scope = opts.scope
    ? inArray(billingInvoice.organizationId, opts.scope.organizationIds)
    : undefined;

  const due = await db
    .select()
    .from(billingInvoice)
    .where(
      and(
        eq(billingInvoice.status, "open"),
        isNotNull(billingInvoice.nextCollectionAt),
        lte(billingInvoice.nextCollectionAt, now),
        scope,
      ),
    )
    .orderBy(asc(billingInvoice.nextCollectionAt))
    .limit(limit);
  for (const invoice of due) {
    await db.transaction(async (tx) => {
      if (invoice.collectionMethod === "charge_automatically") {
        // Try the charge again through the outbox.
        await tx
          .update(billingInvoice)
          .set({ nextCollectionAt: null, syncAction: "collect", nextSyncAt: now })
          .where(and(eq(billingInvoice.id, invoice.id), eq(billingInvoice.status, "open")));
        return;
      }
      const overdue = invoice.dueAt !== null && invoice.dueAt <= now;
      const reminders = invoice.collectionAttempts;
      await enqueueBillingNotification(tx, {
        organizationId: invoice.organizationId,
        kind: "invoice_reminder",
        dedupeKey: `reminder:${invoice.id}:${reminders}`,
        payload: { invoiceId: invoice.id, overdue: overdue ? "true" : "false" },
        now,
      });
      const base = invoice.dueAt ?? now;
      const next =
        OVERDUE_REMINDER_DAYS.map((days) => new Date(base.getTime() + days * DAY_MS)).find(
          (reminder) => reminder > now,
        ) ?? null;
      await tx
        .update(billingInvoice)
        .set({
          collectionAttempts: reminders + 1,
          nextCollectionAt: next && next > now ? next : null,
        })
        .where(eq(billingInvoice.id, invoice.id));
    });
  }

  // Standing: accounts with something overdue, and accounts that may have recovered.
  let cursor: string | undefined;
  for (;;) {
    const accounts = await db
      .selectDistinct({ id: billingAccount.id })
      .from(billingAccount)
      .leftJoin(
        billingInvoice,
        and(
          eq(billingInvoice.accountId, billingAccount.id),
          eq(billingInvoice.status, "open"),
          lt(billingInvoice.dueAt, now),
        ),
      )
      .where(
        and(
          cursor ? gt(billingAccount.id, cursor) : undefined,
          or(ne(billingAccount.status, "active"), isNotNull(billingInvoice.id)),
          opts.scope
            ? inArray(billingAccount.organizationId, opts.scope.organizationIds)
            : undefined,
        ),
      )
      // Every account that may change standing, each run (few are ever past due).
      .orderBy(asc(billingAccount.id))
      .limit(limit);
    for (const account of accounts) {
      await db.transaction((tx) =>
        evaluateStanding(tx, account.id, now, opts.systemOrganizationId),
      );
    }
    if (accounts.length < limit) break;
    cursor = accounts.at(-1)?.id;
  }
  // Only the invoices fill a batch (accounts are re-evaluated every run).
  return due.length;
}
