import {
  billingAttention,
  invoicesNeedingAttention,
  PLANS,
  type PlanKey,
  providerEventBacklog,
} from "@coss/billing";
import { Badge } from "@coss/ui/components/badge";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@coss/ui/components/table";
import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";
import { PageHeader } from "@/components/page-header";
import { formatCents, formatDate } from "@/lib/billing-format";
import { formatDateTime } from "@/lib/format";
import { requirePlatformAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Billing" };

function OrgLink(props: { id: string; label?: string }) {
  return (
    <Link className="hover:underline" href={`/admin/organizations/${props.id}/billing`}>
      {props.label ?? props.id}
    </Link>
  );
}

/** Accounts and invoices that need a look, across organizations. */
export default async function AdminBillingPage() {
  await requirePlatformAdmin();
  const now = new Date();
  const [{ standing, holds, pending, ending }, invoices, events] = await Promise.all([
    billingAttention(now),
    invoicesNeedingAttention(),
    providerEventBacklog(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description="Overdue and held accounts, invoices that failed to sync or collect, upgrades waiting for payment and terms ending soon."
        title="Billing"
      />

      <Card>
        <CardHeader>
          <CardTitle>Invoices needing attention</CardTitle>
          <CardDescription>Overdue, failing to collect or sync, or disputed.</CardDescription>
        </CardHeader>
        <CardPanel>
          {invoices.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Problem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <OrgLink id={invoice.organizationId} label={invoice.organizationName} />
                    </TableCell>
                    <TableCell>{invoice.number}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge
                        overdue={Boolean(invoice.dueAt && invoice.dueAt < now)}
                        paymentState={invoice.paymentState}
                        status={invoice.status}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(invoice.amountDueCents)}
                    </TableCell>
                    <TableCell>{formatDate(invoice.dueAt)}</TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">
                      {invoice.syncError ??
                        invoice.paymentError ??
                        invoice.paymentState ??
                        "overdue"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">Nothing needs attention.</p>
          )}
        </CardPanel>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accounts past due</CardTitle>
          </CardHeader>
          <CardPanel>
            {standing.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {standing.map((account) => (
                  <li key={account.id}>
                    <OrgLink id={account.organizationId} />{" "}
                    <Badge variant={account.status === "delinquent" ? "error" : "warning"}>
                      {account.status.replace("_", " ")}
                    </Badge>{" "}
                    since {formatDate(account.pastDueSince)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">None.</p>
            )}
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing holds</CardTitle>
          </CardHeader>
          <CardPanel>
            {holds.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {holds.map((hold) => (
                  <li key={`${hold.organizationId}:${hold.reason}`}>
                    <OrgLink id={hold.organizationId} /> · {hold.reason.replace("_", " ")} since{" "}
                    {formatDateTime(hold.createdAt)}
                    {hold.note ? (
                      <span className="block text-muted-foreground">{hold.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">None.</p>
            )}
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upgrades waiting for payment</CardTitle>
          </CardHeader>
          <CardPanel>
            {pending.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {pending.map((contract) => (
                  <li key={contract.id}>
                    <OrgLink id={contract.organizationId} /> →{" "}
                    {PLANS[contract.plan as PlanKey]?.name ?? contract.plan} (expires{" "}
                    {formatDateTime(contract.pendingExpiresAt)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">None.</p>
            )}
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms ending within 60 days</CardTitle>
          </CardHeader>
          <CardPanel>
            {ending.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {ending.map((contract) => (
                  <li key={contract.id}>
                    <OrgLink id={contract.organizationId} /> ·{" "}
                    {PLANS[contract.plan as PlanKey]?.name ?? contract.plan} ends{" "}
                    {formatDate(contract.termEnd)}
                    {contract.autoRenew ? " (renews)" : ""}
                    {contract.reference ? ` · ${contract.reference}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">None.</p>
            )}
          </CardPanel>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment provider events</CardTitle>
          <CardDescription>Received but not yet applied, or failed.</CardDescription>
        </CardHeader>
        <CardPanel>
          {events.length ? (
            <ul className="flex flex-col gap-1 text-sm">
              {events.map((event) => (
                <li key={event.id}>
                  {formatDateTime(event.createdAt)} · {event.provider} {event.type} (
                  {event.providerEventId}) · {event.status}
                  {event.lastError ? ` · ${event.lastError}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">All caught up.</p>
          )}
        </CardPanel>
      </Card>
    </div>
  );
}
