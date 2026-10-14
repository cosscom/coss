import { getInvoice, listPayments } from "@coss/billing";
import { isId } from "@coss/db/id";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceLinesTable } from "@/components/billing/invoice-lines";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";
import { PageHeader } from "@/components/page-header";
import { formatCents, formatDate, formatPeriodRange } from "@/lib/billing-format";
import { requireOrgMember } from "@/lib/session";

export const metadata: Metadata = { title: "Invoice" };

/** A printable invoice: the provider's hosted page has the same lines (and accepts payment). */
export default async function InvoicePage({
  params,
}: PageProps<"/[orgSlug]/settings/billing/invoices/[invoiceId]">) {
  const { orgSlug, invoiceId } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ billing: ["read"] }) || !isId("inv", invoiceId)) notFound();
  const invoice = await getInvoice(organization.id, invoiceId);
  if (!invoice?.number) notFound();
  const payments = await listPayments(organization.id, invoice.id);
  const overdue = Boolean(invoice.dueAt && invoice.dueAt < new Date());

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <PageHeader
        actions={
          <div className="flex gap-2 print:hidden">
            {invoice.hostedUrl && invoice.status === "open" && invoice.provider !== "manual" ? (
              <Button
                render={<a href={invoice.hostedUrl} rel="noreferrer" target="_blank" />}
                size="sm"
              >
                Pay invoice
              </Button>
            ) : null}
            {invoice.pdfUrl ? (
              <Button
                render={<a href={invoice.pdfUrl} rel="noreferrer" target="_blank" />}
                size="sm"
                variant="outline"
              >
                Download PDF
              </Button>
            ) : null}
          </div>
        }
        description={
          <span className="print:hidden">
            <Link className="underline" href={`/${organization.slug}/settings/billing`}>
              Back to billing
            </Link>
          </span>
        }
        title={
          <span className="flex items-center gap-3">
            Invoice {invoice.number}
            <InvoiceStatusBadge
              overdue={overdue}
              paymentState={invoice.paymentState}
              status={invoice.status}
            />
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{invoice.organizationName}</CardTitle>
          <CardDescription>
            Billing period {formatPeriodRange(invoice.periodStart, invoice.periodEnd)}. Issued{" "}
            {formatDate(invoice.finalizedAt)}
            {invoice.status === "open" ? `, due ${formatDate(invoice.dueAt)}` : ""}
            {invoice.paidAt ? `, paid ${formatDate(invoice.paidAt)}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-4">
          <InvoiceLinesTable lines={invoice.lines} />
          <dl className="ms-auto grid w-full max-w-xs grid-cols-2 gap-1 text-sm">
            {invoice.taxCents > 0n ? (
              <>
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="text-right tabular-nums">{formatCents(invoice.taxCents)}</dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-right tabular-nums">{formatCents(invoice.totalCents)}</dd>
            <dt className="text-muted-foreground">Paid</dt>
            <dd className="text-right tabular-nums">{formatCents(invoice.amountPaidCents)}</dd>
            <dt className="font-medium">Amount due</dt>
            <dd className="text-right font-medium tabular-nums">
              {formatCents(invoice.amountDueCents)}
            </dd>
          </dl>
          {invoice.memo ? <p className="text-muted-foreground text-sm">{invoice.memo}</p> : null}
        </CardPanel>
      </Card>

      {payments.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardPanel>
            <ul className="flex flex-col gap-1 text-sm">
              {payments.map((payment) => (
                <li key={payment.id}>
                  {formatDate(payment.receivedAt)}: {formatCents(payment.amountCents)} by{" "}
                  {payment.method.replaceAll("_", " ")}
                  {payment.reference ? ` (${payment.reference})` : ""}
                </li>
              ))}
            </ul>
          </CardPanel>
        </Card>
      ) : null}

      {invoice.provider === "manual" && invoice.status === "open" ? (
        <Card>
          <CardHeader>
            <CardTitle>How to pay</CardTitle>
            <CardDescription>
              Pay by bank transfer and include invoice number {invoice.number} as the reference.
              Your account manager has our bank details; contact billing if you need them again.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
