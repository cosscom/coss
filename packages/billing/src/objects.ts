/** Billing rows as their `@coss/billing/wire` objects (the API and webhook payloads). */
import type { MeterKey } from "./catalog/meters.ts";
import { METER_KEYS } from "./catalog/meters.ts";
import type { Grant } from "./grants.ts";
import type { InvoiceLineRow, InvoiceRow } from "./invoices.ts";
import { NANOS_PER_DOLLAR } from "./money.ts";
import type { CreditObjectOutput, InvoiceObjectOutput, InvoiceSummaryOutput } from "./wire.ts";

export const iso = (value: Date | null) => (value ? value.toISOString() : null);
export const toNumber = (value: bigint) => Number(value);

/** Nanos as a dollar decimal string, e.g. 400,000 → "0.0004". */
export function nanosToDollars(nanos: bigint): string {
  const negative = nanos < 0n;
  const magnitude = negative ? -nanos : nanos;
  const whole = magnitude / NANOS_PER_DOLLAR;
  const fraction = (magnitude % NANOS_PER_DOLLAR).toString().padStart(9, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function toInvoiceSummary(invoice: InvoiceRow): InvoiceSummaryOutput {
  return {
    object: "invoice",
    id: invoice.id,
    number: invoice.number,
    kind: invoice.kind,
    // Drafts never leave coss.com: they are numbered (and listed) once finalized.
    status: invoice.status === "draft" ? "open" : invoice.status,
    currency: "usd",
    period: { start: invoice.periodStart.toISOString(), end: invoice.periodEnd.toISOString() },
    subtotal: toNumber(invoice.subtotalCents),
    discount: toNumber(invoice.discountCents),
    credit: toNumber(invoice.creditCents),
    tax: toNumber(invoice.taxCents),
    total: toNumber(invoice.totalCents),
    amount_paid: toNumber(invoice.amountPaidCents),
    amount_due: toNumber(invoice.amountDueCents),
    collection_method: invoice.collectionMethod,
    due_at: iso(invoice.dueAt),
    finalized_at: iso(invoice.finalizedAt),
    paid_at: iso(invoice.paidAt),
    voided_at: iso(invoice.voidedAt),
    hosted_url: invoice.hostedUrl,
    pdf_url: invoice.pdfUrl,
  };
}

function toInvoiceLine(line: InvoiceLineRow): InvoiceObjectOutput["lines"][number] {
  return {
    object: "invoice_line",
    id: line.id,
    kind: line.kind,
    description: line.description,
    meter:
      line.meter && (METER_KEYS as readonly string[]).includes(line.meter)
        ? (line.meter as MeterKey)
        : null,
    dimension: line.dimension || null,
    quantity: line.quantity,
    included_quantity: line.coveredUnits,
    unit_price: line.unitNanos === null ? null : nanosToDollars(line.unitNanos),
    amount: toNumber(line.amountCents),
    period: { start: line.periodStart.toISOString(), end: line.periodEnd.toISOString() },
  };
}

export function toInvoiceObject(invoice: InvoiceRow, lines: InvoiceLineRow[]): InvoiceObjectOutput {
  return { ...toInvoiceSummary(invoice), lines: lines.map(toInvoiceLine) };
}

export function toCreditObject(grant: Grant): CreditObjectOutput {
  const meters = (values: string[] | null) =>
    values
      ? (values.filter((value) => (METER_KEYS as readonly string[]).includes(value)) as MeterKey[])
      : null;
  return {
    object: "credit",
    id: grant.id,
    kind: grant.kind,
    amount: toNumber(grant.amount),
    remaining: toNumber(grant.remaining > 0n ? grant.remaining : 0n),
    meter: grant.meter ? (meters([grant.meter])?.[0] ?? null) : null,
    meters: meters(grant.scope),
    applies_to: grant.appliesTo,
    source: grant.source,
    description: grant.description,
    effective_at: grant.effectiveAt.toISOString(),
    expires_at: iso(grant.expiresAt),
    voided_at: iso(grant.voidedAt),
    created_at: grant.createdAt.toISOString(),
  };
}
