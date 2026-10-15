import { getInvoice, listPayments } from "@coss/billing";
import { isId } from "@coss/db/id";
import { Button } from "@coss/ui/components/button";
import { cn } from "@coss/ui/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { InvoiceLinesTable } from "@/components/billing/invoice-lines";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";
import { SectionHeader } from "@/components/section-header";
import { SettingsNote, SettingsPage, SettingsRow, SettingsSection } from "@/components/settings";
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
        className="max-w-4xl"
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

      <SettingsPage className="print:gap-4">
        <SettingsSection title="Lines">
          {/* The shared lines table, its outer cells padded like the section's rows. */}
          <div className="border-t [&_td:first-child]:ps-5 [&_td:last-child]:pe-5 [&_th:first-child]:ps-5 [&_th:last-child]:pe-5">
            <InvoiceLinesTable lines={invoice.lines} />
          </div>
          {invoice.memo ? <SettingsNote>{invoice.memo}</SettingsNote> : null}
        </SettingsSection>

        <SettingsSection title="Summary">
          <SettingsRow label="Issued">{formatDate(invoice.finalizedAt)}</SettingsRow>
          {invoice.status === "open" ? (
            <SettingsRow label="Due">{formatDate(invoice.dueAt)}</SettingsRow>
          ) : null}
          {invoice.paidAt ? (
            <SettingsRow label="Paid on">{formatDate(invoice.paidAt)}</SettingsRow>
          ) : null}
          {invoice.taxCents > 0n ? (
            <SettingsRow label="Tax">
              <Amount>{formatCents(invoice.taxCents)}</Amount>
            </SettingsRow>
          ) : null}
          <SettingsRow label="Total">
            <Amount>{formatCents(invoice.totalCents)}</Amount>
          </SettingsRow>
          <SettingsRow label="Paid">
            <Amount>{formatCents(invoice.amountPaidCents)}</Amount>
          </SettingsRow>
          <SettingsRow className="bg-muted/40" label="Amount due">
            <Amount className="font-medium">{formatCents(invoice.amountDueCents)}</Amount>
          </SettingsRow>
        </SettingsSection>

        {payments.length ? (
          <SettingsSection title="Payments">
            {payments.map((payment) => (
              <SettingsRow
                key={payment.id}
                label={
                  <span className="font-normal">
                    {formatDate(payment.receivedAt)} · {payment.method.replaceAll("_", " ")}
                    {payment.reference ? ` (${payment.reference})` : ""}
                  </span>
                }
              >
                <Amount>{formatCents(payment.amountCents)}</Amount>
              </SettingsRow>
            ))}
          </SettingsSection>
        ) : null}

        {invoice.provider === "manual" && invoice.status === "open" ? (
          <SettingsSection title="How to pay">
            <SettingsNote>
              Pay by bank transfer and include invoice number {invoice.number} as the reference.
              Your account manager has our bank details; contact billing if you need them again.
            </SettingsNote>
          </SettingsSection>
        ) : null}
      </SettingsPage>
    </div>
  );
}

function Amount(props: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("font-mono text-[0.8125rem] tabular-nums", props.className)}>
      {props.children}
    </span>
  );
}
