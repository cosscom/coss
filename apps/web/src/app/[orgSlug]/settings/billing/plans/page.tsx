import {
  billingStateAt,
  FEATURE_KEYS,
  FEATURE_LABELS,
  formatCents,
  LIMIT_KEYS,
  LIMIT_LABELS,
  METER_KEYS,
  METERS,
  nextPeriod,
  PLAN_KEYS,
  PLANS,
  periodOf,
  rateCardAt,
  scheduledManagedContract,
} from "@coss/billing";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
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
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatMeterRates } from "@/lib/billing-format";
import { requireOrgMember } from "@/lib/session";
import { DowngradeButton, UpgradeButton } from "../billing-forms";

export const metadata: Metadata = { title: "Plans" };

const SALES_EMAIL = "sales@coss.com";

function price(plan: (typeof PLANS)[keyof typeof PLANS]): string {
  if (plan.feeCents === 0n) return "$0";
  return `${plan.selfServe ? "" : "From "}${formatCents(plan.feeCents).replace(/\.00$/, "")}/month`;
}

export default async function PlansPage({
  params,
}: PageProps<"/[orgSlug]/settings/billing/plans">) {
  const { orgSlug } = await params;
  const { organization, can } = await requireOrgMember(orgSlug);
  if (!can({ billing: ["read"] })) notFound();
  const canManage = can({ billing: ["update"] });
  const now = new Date();
  const [state, managedNext] = await Promise.all([
    billingStateAt(organization.id, now),
    scheduledManagedContract(organization.id, now),
  ]);
  const current = PLANS[state.terms.plan];
  // Self-serve changes are refused under a sales contract and while one is scheduled.
  const selfServe = (!state.contract || state.contract.kind === "self_serve") && !managedNext;
  const changesOn = nextPeriod(periodOf(now)).start;
  const rates = rateCardAt(now).rates;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description={
          <>
            Every plan's monthly fee is credit you can spend on any product's usage.{" "}
            <Link className="underline" href={`/${organization.slug}/settings/billing`}>
              Back to billing
            </Link>
          </>
        }
        title="Plans"
      />

      {selfServe ? null : (
        <p className="text-muted-foreground text-sm">
          {managedNext && (!state.contract || state.contract.kind === "self_serve")
            ? `A contract with your account manager starts on ${formatDate(managedNext.effectiveFrom)}. Contact them to change your plan.`
            : "Your plan is managed by your contract. Contact your account manager to change it."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_KEYS.map((key) => {
          const plan = PLANS[key];
          const isCurrent = key === current.key;
          const higher = plan.rank > current.rank;
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {isCurrent ? <Badge variant="success">Current</Badge> : null}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardPanel className="flex flex-col gap-4">
                <p className="font-heading font-semibold text-2xl">{price(plan)}</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
                {!canManage || !selfServe || isCurrent ? null : !plan.selfServe ? (
                  <Button
                    render={<a href={`mailto:${SALES_EMAIL}?subject=COSS%20Enterprise`} />}
                    size="sm"
                    variant="outline"
                  >
                    Contact sales
                  </Button>
                ) : higher ? (
                  <UpgradeButton
                    label={`Upgrade to ${plan.name}`}
                    orgSlug={organization.slug}
                    plan={key}
                  />
                ) : (
                  <DowngradeButton
                    description={`You keep ${current.name} until ${formatDate(changesOn)}, then move to ${plan.name}. ${key === "free" ? "Free stops at 3,000 emails a month." : ""}`}
                    label={key === "free" ? "Cancel plan" : `Switch to ${plan.name}`}
                    orgSlug={organization.slug}
                    plan={key}
                    title={key === "free" ? `Cancel ${current.name}?` : `Switch to ${plan.name}?`}
                  />
                )}
              </CardPanel>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What each plan includes</CardTitle>
        </CardHeader>
        <CardPanel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                {PLAN_KEYS.map((key) => (
                  <TableHead key={key}>{PLANS[key].name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {LIMIT_KEYS.map((limit) => (
                <TableRow key={limit}>
                  <TableCell>{LIMIT_LABELS[limit]}</TableCell>
                  {PLAN_KEYS.map((key) => {
                    const value = PLANS[key].entitlements.limits[limit];
                    return (
                      <TableCell key={key}>
                        {value === null ? "Unlimited" : value.toLocaleString("en-US")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {FEATURE_KEYS.map((feature) => (
                <TableRow key={feature}>
                  <TableCell>{FEATURE_LABELS[feature]}</TableCell>
                  {PLAN_KEYS.map((key) => (
                    <TableCell key={key}>
                      {PLANS[key].entitlements.features[feature] ? "Yes" : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                <TableCell>Recipients per second</TableCell>
                {PLAN_KEYS.map((key) => (
                  <TableCell key={key}>
                    {PLANS[key].entitlements.rateLimits["email.recipients.second"].limit}
                    {PLANS[key].selfServe ? "" : "+"}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage prices</CardTitle>
          <CardDescription>
            Billed monthly beyond your plan's credit. Volume tiers apply to each month's usage.
          </CardDescription>
        </CardHeader>
        <CardPanel>
          <Table>
            <TableBody>
              {METER_KEYS.map((meter) => (
                <TableRow key={meter}>
                  <TableCell className="font-medium">{METERS[meter].label}</TableCell>
                  <TableCell>
                    {formatMeterRates(meter, rates[meter]).join("; ")}
                    {METERS[meter].requires === "commitment"
                      ? " (committed volume, Enterprise contracts only)"
                      : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardPanel>
      </Card>
    </div>
  );
}
