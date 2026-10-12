import {
  billingOverview,
  collectInvoiceNow,
  completePaymentSetup,
  listGrants,
  listInvoices,
  METERS,
  type MeterKey,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodType,
  PLANS,
  paymentMethodCompliant,
  pendingContract,
  periodOf,
  reservedThisPeriod,
  usageByDay,
  usageByEnvironment,
} from "@coss/billing";
import { listEnvironments, listProjects } from "@coss/tenancy";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Progress } from "@coss/ui/components/progress";
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
import { notFound, redirect } from "next/navigation";
import { stringParam } from "@/components/admin/list-controls";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";
import { PageHeader } from "@/components/page-header";
import { env } from "@/env";
import { recordAudit } from "@/lib/audit";
import { billingRuntime, systemOrganizationId } from "@/lib/billing";
import {
  centsInput,
  formatCents,
  formatDate,
  formatPeriodRange,
  formatQuantity,
} from "@/lib/billing-format";
import { requireOrgMember } from "@/lib/session";
import {
  CancelScheduledChangeButton,
  PaymentMethodButtons,
  SpendControlsForm,
} from "./billing-forms";

export const metadata: Metadata = { title: "Billing" };

const NOTICES: Record<string, { variant: "success" | "warning" | "error" | "info"; text: string }> =
  {
    upgraded: { variant: "success", text: "Your plan was upgraded. Thanks!" },
    processing: {
      variant: "info",
      text: "Your payment is processing. Your plan changes as soon as it clears.",
    },
    requires_action: {
      variant: "warning",
      text: "Your bank needs you to confirm the payment: open the invoice below to finish.",
    },
    payment_failed: {
      variant: "error",
      text: "The payment failed. Try another payment method, then upgrade again.",
    },
    payment_method_added: { variant: "success", text: "Your payment method was saved." },
  };

/**
 * The customer came back from the provider's setup page (`?setup=`): save the method and, when an
 * upgrade waited for it (`?upgrade=`, the org's own pending upgrade invoice), charge it now.
 */
async function finishSetup(
  context: Awaited<ReturnType<typeof requireOrgMember>>,
  sessionId: string,
  upgradeInvoiceId: string,
): Promise<string> {
  const runtime = billingRuntime();
  const organizationId = context.organization.id;
  const account = await completePaymentSetup({
    organizationId,
    defaultProvider: runtime.defaultProvider,
    providers: runtime.providers,
    sessionId,
  });
  if (account.paymentMethod) {
    await recordAudit(context.session, {
      organizationId,
      action: "billing.payment_method_added",
      metadata: { type: account.paymentMethod.type },
    });
  }
  const pending = upgradeInvoiceId ? await pendingContract(organizationId) : null;
  if (!pending || pending.pendingInvoiceId !== upgradeInvoiceId) return "payment_method_added";
  if (!account.paymentMethod) return "payment_failed";
  const collected = await collectInvoiceNow(upgradeInvoiceId, {
    providers: runtime.providers,
    dashboardUrl: env.BETTER_AUTH_URL,
    systemOrganizationId: await systemOrganizationId(),
  });
  switch (collected?.state) {
    case "paid":
      return "upgraded";
    case "failed":
      return "payment_failed";
    case "requires_action":
      return "requires_action";
    default:
      return "processing";
  }
}

async function environmentLabels(organizationId: string): Promise<Map<string, string>> {
  const projects = await listProjects({ organizationId });
  const labels = new Map<string, string>();
  for (const project of projects) {
    for (const environment of await listEnvironments({ organizationId, projectId: project.id })) {
      labels.set(environment.id, `${project.name} / ${environment.name}`);
    }
  }
  return labels;
}

export default async function BillingPage({
  params,
  searchParams,
}: PageProps<"/[orgSlug]/settings/billing">) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const context = await requireOrgMember(orgSlug);
  const { organization, can } = context;
  if (!can({ billing: ["read"] })) notFound();
  const canManage = can({ billing: ["update"] });
  const setup = stringParam(query.setup);
  if (setup && canManage) {
    const notice = await finishSetup(context, setup, stringParam(query.upgrade));
    redirect(`/${organization.slug}/settings/billing?notice=${notice}`);
  }
  const notice = NOTICES[stringParam(query.notice)];

  const now = new Date();
  const period = periodOf(now);
  const [overview, invoices, grants, byDay, byEnvironment, labels] = await Promise.all([
    billingOverview(organization.id, now),
    listInvoices(organization.id, { limit: 24 }),
    listGrants(organization.id),
    usageByDay(organization.id, period),
    usageByEnvironment(organization.id, period),
    environmentLabels(organization.id),
  ]);
  const { account, state, pending, estimate, holds } = overview;
  const plan = PLANS[state.terms.plan];
  const contract = state.contract;
  const selfServe = !contract || contract.kind === "self_serve";
  const provider = account?.provider ?? billingRuntime().defaultProvider;
  const capped = Object.entries(state.terms.usageCaps).filter(([, cap]) => cap > 0) as [
    MeterKey,
    number,
  ][];
  const reserved = await Promise.all(
    capped.map(([meter]) => reservedThisPeriod(organization.id, meter, now)),
  );
  const pendingInvoice = pending
    ? invoices.find((invoice) => invoice.id === pending.pendingInvoiceId)
    : undefined;

  // Usage this month, per meter (dimensions together), with the estimated charge.
  const meters = new Map<MeterKey, { quantity: number; covered: number; cents: bigint }>();
  for (const line of estimate.composition.lines) {
    if (!line.meter) continue;
    const row = meters.get(line.meter) ?? { quantity: 0, covered: 0, cents: 0n };
    if (line.kind === "usage") {
      row.quantity += line.quantity ?? 0;
      row.covered += line.coveredUnits ?? 0;
    }
    if (line.kind !== "credit") row.cents += line.amountCents;
    meters.set(line.meter, row);
  }
  const dailyEmail = byDay.filter((row) => row.meter === "email.recipients");
  const dailyMax = Math.max(1, ...dailyEmail.map((row) => row.quantity));
  const activeGrants = grants.filter(
    (grant) =>
      !grant.voidedAt && grant.remaining > 0n && (!grant.expiresAt || grant.expiresAt > now),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Button
            render={<Link href={`/${organization.slug}/settings/billing/plans`} />}
            size="sm"
            variant="outline"
          >
            Compare plans
          </Button>
        }
        description={
          <>
            Your plan, usage and invoices.{" "}
            <Link className="underline" href={`/${organization.slug}/settings`}>
              Back to settings
            </Link>
          </>
        }
        title="Billing"
      />

      {notice ? (
        <Alert variant={notice.variant}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}
      {holds.length ? (
        <Alert variant="error">
          <AlertTitle>Live sending is paused</AlertTitle>
          <AlertDescription>
            {holds.some((hold) => hold.reason === "delinquent")
              ? "An invoice is overdue. Pay it below and sending resumes right away."
              : holds.some((hold) => hold.reason === "spend_limit")
                ? "This month's usage reached your spend limit. Raise it below, or sending resumes next month."
                : "COSS paused live sending for billing reasons. Contact support."}{" "}
            Sandbox keys keep working.
          </AlertDescription>
        </Alert>
      ) : account?.status === "past_due" ? (
        <Alert variant="warning">
          <AlertDescription>
            An invoice is past due. Pay it within {account.graceDays} days of its due date to avoid
            a pause in live sending.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {plan.name} plan
            {contract && contract.kind !== "self_serve" ? (
              <Badge variant="info">Contract</Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            {state.terms.fee
              ? `${formatCents(state.terms.fee.amountCents)} per ${state.terms.fee.interval}${state.terms.feeCredit.spendable ? ", all of it spendable on usage" : ""}.`
              : plan.description}{" "}
            This billing period: {formatPeriodRange(period.start, period.end)}.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3 text-sm">
          {contract?.termEnd ? (
            <p className="text-muted-foreground">
              Committed term until {formatDate(contract.termEnd)}
              {contract.autoRenew ? ", renewing automatically" : ""}.
            </p>
          ) : null}
          {state.scheduled ? (
            <div className="flex flex-wrap items-center gap-3">
              <p>
                Changes to the {PLANS[state.scheduled.terms.plan].name} plan on{" "}
                {formatDate(state.scheduled.at)}.
              </p>
              {canManage &&
              selfServe &&
              (!state.scheduled.contract || state.scheduled.contract.kind === "self_serve") ? (
                <CancelScheduledChangeButton label="Keep my plan" orgSlug={organization.slug} />
              ) : null}
            </div>
          ) : null}
          {pending ? (
            <p>
              The upgrade to {PLANS[pending.terms.plan].name} is waiting for its payment
              {pendingInvoice?.hostedUrl ? (
                <>
                  {" "}
                  (
                  <a
                    className="underline"
                    href={pendingInvoice.hostedUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    pay the invoice
                  </a>
                  )
                </>
              ) : null}
              .
            </p>
          ) : null}
          {selfServe ? null : (
            <p className="text-muted-foreground">
              Your plan is managed by your contract. Contact your account manager to change it.
            </p>
          )}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage this month</CardTitle>
          <CardDescription>
            Live usage only (sandbox is free). Estimated so far:{" "}
            <span className="font-medium text-foreground">{formatCents(estimate.usageCents)}</span>{" "}
            of usage
            {estimate.totals.creditCents > 0n
              ? `, ${formatCents(estimate.totals.creditCents)} of it paid by credit`
              : ""}
            ; {formatCents(estimate.totals.totalCents)} to pay at the end of the month
            {state.terms.fee ? " (plus next month's fee)" : ""}.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-6">
          {capped.map(([meter, cap], index) => {
            const used = Math.min(reserved[index] ?? 0, cap);
            return (
              <div className="flex flex-col gap-1" key={meter}>
                <div className="flex justify-between text-sm">
                  <span>
                    {METERS[meter].label} {METERS[meter].units} included
                  </span>
                  <span className="tabular-nums">
                    {used.toLocaleString("en-US")} / {cap.toLocaleString("en-US")}
                  </span>
                </div>
                <Progress max={cap} value={used} />
              </div>
            );
          })}
          {meters.size ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Usage</TableHead>
                  <TableHead className="text-right">Included</TableHead>
                  <TableHead className="text-right">Charge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...meters].map(([meter, row]) => (
                  <TableRow key={meter}>
                    <TableCell>{METERS[meter].label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.quantity.toLocaleString("en-US")} {METERS[meter].units}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.covered ? row.covered.toLocaleString("en-US") : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(row.cents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No usage yet this month.</p>
          )}
          {dailyEmail.length ? (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-sm">Email recipients per day</p>
              <div
                className="flex h-24 items-end gap-1"
                role="img"
                aria-label="Email recipients per day"
              >
                {dailyEmail.map((row) => (
                  <div
                    className="flex-1 rounded-t-sm bg-primary/70"
                    key={row.day.toISOString()}
                    style={{ height: `${Math.max(2, (row.quantity / dailyMax) * 100)}%` }}
                    title={`${formatDate(row.day)}: ${row.quantity.toLocaleString("en-US")}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {byEnvironment.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Environment</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byEnvironment.map((row) => (
                  <TableRow key={`${row.environmentId}:${row.meter}`}>
                    <TableCell>{labels.get(row.environmentId) ?? "Deleted environment"}</TableCell>
                    <TableCell>{METERS[row.meter]?.label ?? row.meter}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQuantity(row.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardPanel>
      </Card>

      {activeGrants.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Credits</CardTitle>
            <CardDescription>Applied to usage before anything is charged.</CardDescription>
          </CardHeader>
          <CardPanel>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credit</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeGrants.map((grant) => (
                  <TableRow key={grant.id}>
                    <TableCell>{grant.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {grant.kind === "amount"
                        ? `${formatCents(grant.remaining)} of ${formatCents(grant.amount)}`
                        : `${grant.remaining.toLocaleString("en-US")} ${grant.meter && grant.meter in METERS ? METERS[grant.meter as MeterKey].units : "units"}`}
                    </TableCell>
                    <TableCell>{grant.expiresAt ? formatDate(grant.expiresAt) : "Never"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardPanel>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Payment method</CardTitle>
          <CardDescription>
            {provider === "manual"
              ? `Invoiced directly${account?.collectionMethod === "send_invoice" ? `, due ${account.netTermsDays} days after issue` : ""}. Contact billing to change how you pay.`
              : account?.collectionMethod === "send_invoice"
                ? `Invoices are emailed and due ${account.netTermsDays} days after issue.`
                : "Invoices are charged to your default payment method."}
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3 text-sm">
          {account?.paymentMethod ? (
            <p>
              {PAYMENT_METHOD_LABELS[account.paymentMethod.type as PaymentMethodType] ??
                account.paymentMethod.type}
              {account.paymentMethod.brand ? ` (${account.paymentMethod.brand})` : ""}
              {account.paymentMethod.last4 ? ` ending ${account.paymentMethod.last4}` : ""}
              {account.paymentMethod.expMonth && account.paymentMethod.expYear
                ? `, expires ${account.paymentMethod.expMonth}/${account.paymentMethod.expYear}`
                : ""}
            </p>
          ) : provider === "manual" ? null : (
            <p className="text-muted-foreground">No payment method yet.</p>
          )}
          {account && !paymentMethodCompliant(account) ? (
            <Alert variant="warning">
              <AlertDescription>
                Your contract requires paying by{" "}
                {account.requiredPaymentMethods
                  .map((type) => PAYMENT_METHOD_LABELS[type as PaymentMethodType] ?? type)
                  .join(" or ")}
                . Replace your payment method.
              </AlertDescription>
            </Alert>
          ) : null}
          {canManage && provider !== "manual" ? (
            <PaymentMethodButtons
              hasMethod={Boolean(account?.paymentMethod)}
              orgSlug={organization.slug}
              portal={provider === "stripe"}
            />
          ) : null}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardPanel>
          {invoices.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        className="underline"
                        href={`/${organization.slug}/settings/billing/invoices/${invoice.id}`}
                      >
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {formatPeriodRange(invoice.periodStart, invoice.periodEnd)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge
                        overdue={Boolean(invoice.dueAt && invoice.dueAt < now)}
                        paymentState={invoice.paymentState}
                        status={invoice.status}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(invoice.totalCents)}
                    </TableCell>
                    <TableCell>
                      {invoice.status === "open" ? formatDate(invoice.dueAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No invoices yet.</p>
          )}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spend controls</CardTitle>
          <CardDescription>
            {canManage
              ? "Limits and alerts for usage beyond your plan."
              : "Only owners can change these."}
          </CardDescription>
        </CardHeader>
        <CardPanel>
          <SpendControlsForm
            alertThresholds={(account?.alertThresholds ?? [80, 100]).join(", ")}
            billingEmail={account?.billingEmail ?? ""}
            disabled={!canManage}
            orgSlug={organization.slug}
            spendLimit={centsInput(account?.spendLimitCents)}
          />
        </CardPanel>
      </Card>
    </div>
  );
}
