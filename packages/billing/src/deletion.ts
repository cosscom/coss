/**
 * Billing's part of deleting an organization (the worker's `releaseProviderResources`): its
 * running month is invoiced up to now (`final`, once), its contracts end, and nothing is
 * deleted at the provider (the customer stays so the final invoice can still be collected; the
 * invoices outlive the organization). Idempotent: deletions retry.
 */
import { db, schema } from "@coss/db";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getBillingAccount, lockBillingAccount, organizationLabel } from "./accounts.ts";
import { createInvoice, finalizeInvoice } from "./invoices.ts";
import { closeBillingPeriod, composeMonth, snapshot } from "./periods.ts";
import { floorHour, periodOf, previousPeriod } from "./time.ts";

const { billingContract, billingInvoice } = schema;

/** Open invoices that block an owner from deleting their organization. */
export async function unpaidInvoiceCount(organizationId: string): Promise<number> {
  const rows = await db
    .select({ id: billingInvoice.id })
    .from(billingInvoice)
    .where(
      and(eq(billingInvoice.organizationId, organizationId), eq(billingInvoice.status, "open")),
    );
  return rows.length;
}

export async function finalizeOrganizationBilling(
  organizationId: string,
  opts: { now?: Date; assertLease?: () => Promise<void> } = {},
): Promise<void> {
  const now = opts.now ?? new Date();
  const existing = await getBillingAccount(organizationId);
  if (!existing) return;
  await opts.assertLease?.();
  // A month that ended but isn't closed yet (its settle window, a backlog) is closed first: the
  // account goes with the organization, so nothing would close it later.
  await closeBillingPeriod({
    account: existing,
    period: previousPeriod(periodOf(now)),
    now,
    inOrder: false,
  });
  await opts.assertLease?.();
  await db.transaction(async (tx) => {
    const account = await lockBillingAccount(tx, organizationId, existing.provider);
    const [already] = await tx
      .select({ id: billingInvoice.id })
      .from(billingInvoice)
      .where(and(eq(billingInvoice.accountId, account.id), eq(billingInvoice.kind, "final")))
      .limit(1);
    const end = floorHour(now);
    if (!already) {
      const period = periodOf(now);
      const organization = await organizationLabel(organizationId, tx);
      const { composition, segments } = await composeMonth(
        { organizationId, period, withAdvance: false, usageUntil: now },
        tx,
      );
      const billable = composition.lines.some((line) => line.amountCents !== 0n);
      if (organization && billable) {
        const invoice = await createInvoice(tx, {
          account,
          organization,
          kind: "final",
          period: { start: period.start, end: end > period.start ? end : period.end },
          lines: composition.lines,
          applications: composition.applications,
          termsSnapshot: snapshot(segments),
          memo: "Final invoice: the organization was deleted.",
        });
        await finalizeInvoice(tx, invoice, account, now);
      }
    }
    // Every contract ends now (none is billed again).
    await tx
      .update(billingContract)
      .set({ effectiveUntil: end })
      .where(
        and(
          eq(billingContract.organizationId, organizationId),
          eq(billingContract.status, "confirmed"),
          or(isNull(billingContract.effectiveUntil), gt(billingContract.effectiveUntil, end)),
        ),
      );
  });
}
