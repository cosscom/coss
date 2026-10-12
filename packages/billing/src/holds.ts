/**
 * Billing holds on live sending, and an account's standing: an invoice overdue makes it
 * `past_due`; overdue past its grace days makes it `delinquent` with a hold, lifted (with the
 * status) as soon as nothing is overdue. Holds never touch reputation suspensions.
 */
import { db, type Executor, schema, type Transaction } from "@coss/db";
import { and, asc, eq, lt } from "drizzle-orm";
import { announce } from "./announce.ts";
import { type AdminActor, auditBillingChange } from "./audit.ts";
import { enqueueBillingNotification } from "./notifications.ts";

const { billingAccount, billingHold, billingInvoice } = schema;

const DAY_MS = 24 * 60 * 60 * 1000;

export type HoldReason = (typeof billingHold.$inferSelect)["reason"];

export async function holdsOf(organizationId: string, executor: Executor = db) {
  return executor.select().from(billingHold).where(eq(billingHold.organizationId, organizationId));
}

/** Places a hold; returns whether it is new. */
export async function placeHold(
  tx: Executor,
  organizationId: string,
  reason: HoldReason,
  note: string | null,
): Promise<boolean> {
  const inserted = await tx
    .insert(billingHold)
    .values({ organizationId, reason, note })
    .onConflictDoNothing()
    .returning({ reason: billingHold.reason });
  if (!inserted.length) return false;
  await announce(tx, organizationId, { type: "billing.hold_placed", data: { reason } });
  return true;
}

/** Lifts a hold; returns whether there was one. */
export async function liftHold(
  tx: Executor,
  organizationId: string,
  reason: HoldReason,
): Promise<boolean> {
  const deleted = await tx
    .delete(billingHold)
    .where(and(eq(billingHold.organizationId, organizationId), eq(billingHold.reason, reason)))
    .returning({ reason: billingHold.reason });
  if (!deleted.length) return false;
  await announce(tx, organizationId, { type: "billing.hold_lifted", data: { reason } });
  return true;
}

/**
 * Recomputes an account's standing from its overdue invoices: `past_due` from the first one,
 * `delinquent` (with a hold) once past the grace days, unless an admin exempted it; `active`
 * (hold lifted) when none is overdue. Returns the new status.
 */
export async function evaluateStanding(
  tx: Transaction,
  accountId: string,
  now: Date,
  systemOrganizationId?: string | null,
): Promise<"active" | "past_due" | "delinquent"> {
  const [account] = await tx
    .select()
    .from(billingAccount)
    .where(eq(billingAccount.id, accountId))
    .for("update");
  if (!account) return "active";
  const [oldestOverdue] = await tx
    .select({ id: billingInvoice.id, dueAt: billingInvoice.dueAt, number: billingInvoice.number })
    .from(billingInvoice)
    .where(
      and(
        eq(billingInvoice.accountId, accountId),
        eq(billingInvoice.status, "open"),
        lt(billingInvoice.dueAt, now),
      ),
    )
    .orderBy(asc(billingInvoice.dueAt))
    .limit(1);

  if (!oldestOverdue?.dueAt) {
    if (account.status !== "active") {
      await tx
        .update(billingAccount)
        .set({ status: "active", pastDueSince: null })
        .where(eq(billingAccount.id, accountId));
    }
    if (await liftHold(tx, account.organizationId, "delinquent")) {
      await enqueueBillingNotification(tx, {
        organizationId: account.organizationId,
        kind: "hold_lifted",
        dedupeKey: `hold_lifted:${account.organizationId}:${now.toISOString()}`,
        payload: {},
      });
    }
    return "active";
  }

  const since = oldestOverdue.dueAt;
  const delinquent =
    since.getTime() + account.graceDays * DAY_MS <= now.getTime() &&
    !(account.holdExemptUntil && account.holdExemptUntil > now) &&
    account.organizationId !== systemOrganizationId;
  const status = delinquent ? "delinquent" : "past_due";
  if (account.status !== status || account.pastDueSince?.getTime() !== since.getTime()) {
    await tx
      .update(billingAccount)
      .set({ status, pastDueSince: since })
      .where(eq(billingAccount.id, accountId));
  }
  if (delinquent) {
    const placed = await placeHold(
      tx,
      account.organizationId,
      "delinquent",
      `Invoice ${oldestOverdue.number ?? oldestOverdue.id} overdue since ${since.toISOString()}`,
    );
    if (placed) {
      await enqueueBillingNotification(tx, {
        organizationId: account.organizationId,
        kind: "hold_placed",
        dedupeKey: `hold_placed:${account.organizationId}:${since.toISOString()}`,
        payload: { invoiceId: oldestOverdue.id, invoiceNumber: oldestOverdue.number },
      });
    }
  } else {
    await liftHold(tx, account.organizationId, "delinquent");
  }
  return status;
}

/** An admin's hold (or lifting one), audited. */
export async function setAdminHold(input: {
  organizationId: string;
  held: boolean;
  actor: AdminActor;
  reason: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const changed = input.held
      ? await placeHold(tx, input.organizationId, "admin", input.reason)
      : await liftHold(tx, input.organizationId, "admin");
    if (!changed) return;
    await auditBillingChange(tx, {
      actor: input.actor,
      action: input.held ? "billing.hold_placed" : "billing.hold_lifted",
      organizationId: input.organizationId,
      reason: input.reason,
    });
  });
}
