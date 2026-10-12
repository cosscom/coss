/**
 * Invoices: created from the engine's lines, finalized (numbered, due), pushed to the account's
 * provider by the worker and collected on COSS's schedule. They outlive the organization.
 */
import { db, type Executor, schema, type Transaction } from "@coss/db";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { BillingAccount, OrganizationLabel } from "./accounts.ts";
import { announce } from "./announce.ts";
import type { DraftGrant, DraftLine, GrantApplication, LineKind } from "./engine/types.ts";
import { insertApplications, insertComposedGrants } from "./grants.ts";
import { toInvoiceSummary } from "./objects.ts";
import type { Interval } from "./time.ts";

const { billingCounter, billingInvoice, billingInvoiceLine } = schema;

export type InvoiceRow = typeof billingInvoice.$inferSelect;
export type InvoiceLineRow = typeof billingInvoiceLine.$inferSelect;
export type InvoiceWithLines = InvoiceRow & { lines: InvoiceLineRow[] };

const DAY_MS = 24 * 60 * 60 * 1000;

const CHARGE_KINDS: ReadonlySet<LineKind> = new Set([
  "plan_fee",
  "proration",
  "usage",
  "commitment_fee",
  "commitment_shortfall",
  "add_on",
  "adjustment",
]);

export function invoiceTotals(lines: readonly Pick<DraftLine, "kind" | "amountCents">[]) {
  let subtotalCents = 0n;
  let discountCents = 0n;
  let creditCents = 0n;
  for (const line of lines) {
    if (CHARGE_KINDS.has(line.kind)) subtotalCents += line.amountCents;
    else if (line.kind === "credit") creditCents -= line.amountCents;
    else discountCents -= line.amountCents;
  }
  return {
    subtotalCents,
    discountCents,
    creditCents,
    totalCents: subtotalCents - discountCents - creditCents,
  };
}

/** Keys among `keys` already charged by an invoice that wasn't voided. */
export async function existingChargeKeys(
  keys: string[],
  executor: Executor = db,
): Promise<Set<string>> {
  if (!keys.length) return new Set();
  const rows = await executor
    .select({ key: billingInvoiceLine.chargeKey })
    .from(billingInvoiceLine)
    .where(inArray(billingInvoiceLine.chargeKey, keys));
  return new Set(rows.flatMap((row) => (row.key ? [row.key] : [])));
}

export type NewInvoice = {
  account: BillingAccount;
  organization: OrganizationLabel;
  kind: InvoiceRow["kind"];
  period: Interval;
  lines: readonly DraftLine[];
  applications?: readonly GrantApplication[];
  grants?: readonly DraftGrant[];
  memo?: string | null;
  createdByUserId?: string | null;
  termsSnapshot?: Record<string, unknown> | null;
};

/** Stores a draft invoice with its lines, credit drawdowns and the grants it funds. */
export async function createInvoice(tx: Transaction, input: NewInvoice): Promise<InvoiceRow> {
  const totals = invoiceTotals(input.lines);
  const [invoice] = await tx
    .insert(billingInvoice)
    .values({
      organizationId: input.account.organizationId,
      accountId: input.account.id,
      organizationName: input.organization.name,
      organizationSlug: input.organization.slug,
      kind: input.kind,
      status: "draft",
      periodStart: input.period.start,
      periodEnd: input.period.end,
      ...totals,
      amountDueCents: totals.totalCents,
      collectionMethod: input.account.collectionMethod,
      provider: input.account.provider,
      providerCustomerId: input.account.providerCustomerId,
      billingEmail: input.account.billingEmail,
      memo: input.memo ?? null,
      createdByUserId: input.createdByUserId ?? null,
      termsSnapshot: input.termsSnapshot ?? null,
    })
    .returning();
  if (!invoice) throw new Error("Invoice insert returned nothing.");
  if (input.lines.length) {
    await tx.insert(billingInvoiceLine).values(
      input.lines.map((line, position) => ({
        invoiceId: invoice.id,
        organizationId: input.account.organizationId,
        position,
        kind: line.kind,
        description: line.description,
        meter: line.meter ?? null,
        dimension: line.dimension ?? null,
        quantity: line.quantity ?? null,
        coveredUnits: line.coveredUnits ?? null,
        unitNanos: line.unitNanos ?? null,
        amountCents: line.amountCents,
        periodStart: line.period.start,
        periodEnd: line.period.end,
        contractId: line.contractId,
        grantId: line.grantId ?? null,
        chargeKey: line.chargeKey ?? null,
        detail: line.detail ?? null,
      })),
    );
  }
  await insertApplications(tx, invoice.organizationId, invoice.id, input.applications ?? []);
  await insertComposedGrants(tx, invoice.organizationId, invoice.id, input.grants ?? []);
  return invoice;
}

/** Next value of a gapless counter (held by the row lock until the transaction ends). */
export async function nextCounter(tx: Transaction, name: string): Promise<number> {
  const [row] = await tx
    .insert(billingCounter)
    .values({ name, value: 1 })
    .onConflictDoUpdate({
      target: billingCounter.name,
      set: { value: sql`${billingCounter.value} + 1` },
    })
    .returning({ value: billingCounter.value });
  if (!row) throw new Error("Counter upsert returned nothing.");
  return row.value;
}

export function formatInvoiceNumber(value: number): string {
  return `COSS-${String(value).padStart(6, "0")}`;
}

/**
 * Numbers a draft and makes it payable: due now (charged automatically) or after the account's
 * net terms; a zero total is settled at once. The worker then pushes it to the provider.
 */
export async function finalizeInvoice(
  tx: Transaction,
  invoice: InvoiceRow,
  account: Pick<BillingAccount, "netTermsDays" | "collectionMethod">,
  now: Date,
): Promise<InvoiceRow> {
  const number = formatInvoiceNumber(await nextCounter(tx, "invoice"));
  const payable = invoice.amountDueCents > 0n;
  const dueAt =
    invoice.collectionMethod === "send_invoice"
      ? new Date(now.getTime() + account.netTermsDays * DAY_MS)
      : now;
  const [row] = await tx
    .update(billingInvoice)
    .set({
      number,
      status: payable ? "open" : "paid",
      finalizedAt: now,
      paidAt: payable ? null : now,
      dueAt,
      syncAction: payable ? "push" : null,
      nextSyncAt: payable ? now : null,
    })
    .where(and(eq(billingInvoice.id, invoice.id), eq(billingInvoice.status, "draft")))
    .returning();
  if (!row) throw new Error(`Invoice ${invoice.id} is no longer a draft.`);
  await announce(
    tx,
    row.organizationId,
    { type: "billing.invoice_finalized", data: { invoice: toInvoiceSummary(row) } },
    now,
  );
  return row;
}

export async function listInvoices(
  organizationId: string,
  opts: { limit?: number } = {},
  executor: Executor = db,
): Promise<InvoiceRow[]> {
  return executor
    .select()
    .from(billingInvoice)
    .where(and(eq(billingInvoice.organizationId, organizationId), isNotNull(billingInvoice.number)))
    .orderBy(desc(billingInvoice.createdAt))
    .limit(opts.limit ?? 50);
}

export async function invoiceLines(
  invoiceId: string,
  executor: Executor = db,
): Promise<InvoiceLineRow[]> {
  return executor
    .select()
    .from(billingInvoiceLine)
    .where(eq(billingInvoiceLine.invoiceId, invoiceId))
    .orderBy(asc(billingInvoiceLine.position));
}

/** An organization's invoice with its lines (`null` when it isn't theirs). */
export async function getInvoice(
  organizationId: string,
  invoiceId: string,
  executor: Executor = db,
): Promise<InvoiceWithLines | null> {
  const [invoice] = await executor
    .select()
    .from(billingInvoice)
    .where(and(eq(billingInvoice.organizationId, organizationId), eq(billingInvoice.id, invoiceId)))
    .limit(1);
  if (!invoice) return null;
  return { ...invoice, lines: await invoiceLines(invoice.id, executor) };
}

export async function lockInvoice(tx: Transaction, invoiceId: string): Promise<InvoiceRow | null> {
  // Every billing mutation takes the account before an invoice. Payments also update
  // contracts and standing, so taking these locks in reverse order can deadlock.
  const [owner] = await tx
    .select({ accountId: billingInvoice.accountId })
    .from(billingInvoice)
    .where(eq(billingInvoice.id, invoiceId));
  if (!owner) return null;
  await tx
    .select({ id: schema.billingAccount.id })
    .from(schema.billingAccount)
    .where(eq(schema.billingAccount.id, owner.accountId))
    .for("update");
  const [row] = await tx
    .select()
    .from(billingInvoice)
    .where(eq(billingInvoice.id, invoiceId))
    .for("update");
  return row ?? null;
}

/** Usage spend and fees a contract was invoiced per month (for commitments), from earlier lines. */
export async function spendHistory(
  contractIds: string[],
  executor: Executor = db,
): Promise<
  {
    contractId: string;
    month: Date;
    meter: string | null;
    kind: LineKind;
    amountCents: bigint;
    quantity: number | null;
    dimension: string | null;
  }[]
> {
  if (!contractIds.length) return [];
  const rows = await executor
    .select({
      contractId: billingInvoiceLine.contractId,
      month: sql<Date>`date_trunc('month', ${billingInvoiceLine.periodStart}, 'UTC')`.mapWith(
        (value: string | Date) => new Date(value),
      ),
      meter: billingInvoiceLine.meter,
      dimension: billingInvoiceLine.dimension,
      kind: billingInvoiceLine.kind,
      amountCents: billingInvoiceLine.amountCents,
      quantity: billingInvoiceLine.quantity,
    })
    .from(billingInvoiceLine)
    .innerJoin(billingInvoice, eq(billingInvoice.id, billingInvoiceLine.invoiceId))
    .where(
      and(
        inArray(billingInvoiceLine.contractId, contractIds),
        sql`${billingInvoice.status} <> 'void'`,
      ),
    );
  return rows.flatMap((row) => (row.contractId ? [{ ...row, contractId: row.contractId }] : []));
}
