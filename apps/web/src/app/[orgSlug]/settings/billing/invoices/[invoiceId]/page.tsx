import { getInvoice, listPayments } from "@coss/billing";
import { isId } from "@coss/db/id";
import { Button } from "@coss/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceLinesTable } from "@/components/billing/invoice-lines";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";
import { Panel, PanelBody } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { SpecItem, SpecList } from "@/components/spec-list";
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
      <SectionHeader
        actions={
          <div className="flex gap-2 print:hidden">
            <Button
              render={<Link href={`/${organization.slug}/settings/billing`} />}
              size="sm"
              variant="ghost"
            >
              Back to billing
            </Button>
            {invoice.pdfUrl ? (
              <Button
                render={<a href={invoice.pdfUrl} rel="noreferrer" target="_blank" />}
                size="sm"
                variant="outline"
              >
                Download PDF
              </Button>
            ) : null}
            {invoice.hostedUrl && invoice.status === "open" && invoice.provider !== "manual" ? (
              <Button
                render={<a href={invoice.hostedUrl} rel="noreferrer" target="_blank" />}
                size="sm"
              >
                Pay invoice
              </Button>
            ) : null}
          </div>
        }
        description={`${invoice.organizationName} · billing period ${formatPeriodRange(invoice.periodStart, invoice.periodEnd)}.`}
        meta={
          <InvoiceStatusBadge
            overdue={overdue}
            paymentState={invoice.paymentState}
            status={invoice.status}
          />
        }
        title={
          <>
            Invoice <span className="font-mono">{invoice.number}</span>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Lines">
          <InvoiceLinesTable lines={invoice.lines} variant="card" />
          {invoice.memo ? (
            <p className="px-5 py-3 text-muted-foreground text-sm">{invoice.memo}</p>
          ) : null}
        </Panel>
        <Panel title="Summary">
          <PanelBody flush>
            <SpecList>
              <SpecItem label="Issued">{formatDate(invoice.finalizedAt)}</SpecItem>
              {invoice.status === "open" ? (
                <SpecItem label="Due">{formatDate(invoice.dueAt)}</SpecItem>
              ) : null}
              {invoice.paidAt ? (
                <SpecItem label="Paid on">{formatDate(invoice.paidAt)}</SpecItem>
              ) : null}
              {invoice.taxCents > 0n ? (
                <SpecItem label="Tax" mono>
                  {formatCents(invoice.taxCents)}
                </SpecItem>
              ) : null}
              <SpecItem label="Total" mono>
                {formatCents(invoice.totalCents)}
              </SpecItem>
              <SpecItem label="Paid" mono>
                {formatCents(invoice.amountPaidCents)}
              </SpecItem>
              <SpecItem
                label={<span className="font-medium text-foreground">Amount due</span>}
                mono
              >
                <span className="font-medium">{formatCents(invoice.amountDueCents)}</span>
              </SpecItem>
            </SpecList>
          </PanelBody>
        </Panel>
      </div>

      {payments.length ? (
        <Panel title="Payments">
          <PanelBody flush>
            <SpecList>
              {payments.map((payment) => (
                <SpecItem
                  key={payment.id}
                  label={`${formatDate(payment.receivedAt)} · ${payment.method.replaceAll("_", " ")}${payment.reference ? ` (${payment.reference})` : ""}`}
                  mono
                >
                  {formatCents(payment.amountCents)}
                </SpecItem>
              ))}
            </SpecList>
          </PanelBody>
        </Panel>
      ) : null}

      {invoice.provider === "manual" && invoice.status === "open" ? (
        <Panel
          description={`Pay by bank transfer and include invoice number ${invoice.number} as the reference. Your account manager has our bank details; contact billing if you need them again.`}
          title="How to pay"
        />
      ) : null}
    </div>
  );
}
