"use client";
import { PLANS, planDefinition } from "@coss/billing/catalog";
import { formatCents } from "@coss/billing/money";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import { Label } from "@coss/ui/components/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@coss/ui/components/number-field";
import { useId, useState } from "react";
import {
  ESTIMATED_PLANS,
  emailTierCharges,
  estimateEmailMonth,
  formatPrice,
  type MonthEstimate,
  suggestedPlan,
} from "@/lib/pricing";
import { SALES_EMAIL } from "@/lib/site";

const PRESETS = [10_000, 100_000, 1_000_000, 5_000_000, 25_000_000];
const MAX_EMAILS = 1_000_000_000;

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

function describe(estimate: MonthEstimate, emails: number): string {
  const plan = planDefinition(estimate.plan);
  // A capped plan's monthly allowance comes before its daily pace.
  if (estimate.totalCents === null) {
    const included = plan.includedUnits["email.recipients"] ?? 0;
    return `Stops at ${included.toLocaleString("en-US")} emails a month`;
  }
  if (estimate.dailyLimit !== null) {
    return `More than its ${estimate.dailyLimit.toLocaleString("en-US")} emails a day`;
  }
  if (plan.feeCents === 0n) return emails === 0 ? "Nothing sent" : "Within the free allowance";
  if (estimate.usageCents <= plan.feeCents) {
    return `The ${formatPrice(plan.feeCents)} fee covers ${formatPrice(estimate.usageCents)} of usage`;
  }
  return `${formatPrice(plan.feeCents)} fee + ${formatPrice(estimate.usageCents - plan.feeCents)} of usage beyond it`;
}

/** Monthly cost of an email volume on each self-serve plan, with the graduated bands. */
export function EmailEstimator() {
  const inputId = useId();
  const [emails, setEmails] = useState(100_000);
  const estimates = ESTIMATED_PLANS.map((plan) => estimateEmailMonth(plan, emails));
  const suggestion = suggestedPlan(estimates);
  const bands = emailTierCharges(emails);
  const usageCents = bands.reduce((total, band) => total + band.amountCents, 0n);

  return (
    <Card>
      <CardPanel className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Label htmlFor={inputId}>Emails a month</Label>
            <NumberField
              format={{ maximumFractionDigits: 0 }}
              id={inputId}
              largeStep={100_000}
              locale="en-US"
              max={MAX_EMAILS}
              min={0}
              onValueChange={(value) => setEmails(Math.round(value ?? 0))}
              size="lg"
              step={10_000}
              value={emails}
            >
              <NumberFieldGroup>
                <NumberFieldDecrement aria-label="Fewer emails" />
                <NumberFieldInput />
                <NumberFieldIncrement aria-label="More emails" />
              </NumberFieldGroup>
            </NumberField>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  aria-pressed={emails === preset}
                  key={preset}
                  onClick={() => setEmails(preset)}
                  size="xs"
                  variant={emails === preset ? "secondary" : "outline"}
                >
                  {compact(preset)}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium">At list rates (graduated)</p>
            {bands.length === 0 ? (
              <p className="text-muted-foreground">No usage.</p>
            ) : (
              <dl className="flex flex-col gap-1.5 text-muted-foreground">
                {bands.map((band) => (
                  <div className="flex justify-between gap-4" key={band.first}>
                    <dt>
                      {band.first.toLocaleString("en-US")}–{band.last.toLocaleString("en-US")} at{" "}
                      {band.pricePerThousand} per 1,000
                    </dt>
                    <dd className="text-foreground tabular-nums">
                      {formatCents(band.amountCents)}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t pt-1.5">
                  <dt>Usage</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {formatCents(usageCents)}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-medium text-sm">Your month on each plan</p>
          <ul aria-live="polite" className="flex flex-col gap-2">
            {estimates.map((estimate) => {
              const unavailable = estimate.totalCents === null || estimate.dailyLimit !== null;
              return (
                <li
                  className="flex items-center justify-between gap-4 rounded-xl border p-4 data-[suggested=true]:border-primary/48 data-[suggested=true]:bg-accent/40"
                  data-suggested={suggestion === estimate.plan}
                  key={estimate.plan}
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex items-center gap-2 font-medium">
                      {PLANS[estimate.plan].name}
                      {suggestion === estimate.plan && (
                        <Badge variant="secondary">Lowest cost</Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground text-sm">{describe(estimate, emails)}</p>
                  </div>
                  <p className="shrink-0 text-right">
                    {unavailable || estimate.totalCents === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <>
                        <span className="font-semibold text-xl tabular-nums">
                          {formatPrice(estimate.totalCents)}
                        </span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </>
                    )}
                  </p>
                </li>
              );
            })}
            <li
              className="flex items-center justify-between gap-4 rounded-xl border p-4 data-[suggested=true]:border-primary/48 data-[suggested=true]:bg-accent/40"
              data-suggested={suggestion === "enterprise"}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex items-center gap-2 font-medium">
                  Enterprise
                  {suggestion === "enterprise" && <Badge variant="secondary">Talk to us</Badge>}
                </p>
                <p className="text-muted-foreground text-sm">Volume rates and commitments</p>
              </div>
              <a
                className="shrink-0 font-medium text-sm underline-offset-4 hover:underline"
                href={`mailto:${SALES_EMAIL}`}
              >
                Contact sales
              </a>
            </li>
          </ul>
          <p className="text-muted-foreground text-xs">
            Estimates at list prices for email alone, before taxes. A paid plan&apos;s fee is
            credit, so a month costs the larger of the fee and your usage.
          </p>
        </div>
      </CardPanel>
    </Card>
  );
}
