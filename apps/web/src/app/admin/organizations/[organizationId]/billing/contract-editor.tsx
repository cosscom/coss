"use client";

import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
  LIMIT_KEYS,
  LIMIT_LABELS,
  type LimitKey,
  METER_KEYS,
  METERS,
  type MeterKey,
  PLAN_KEYS,
  PLANS,
  type PlanKey,
} from "@coss/billing/catalog";
import { formatCents, parseDollarsToCents, parseDollarsToNanos } from "@coss/billing/money";
import { Button } from "@coss/ui/components/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@coss/ui/components/card";
import { Checkbox } from "@coss/ui/components/checkbox";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { Input } from "@coss/ui/components/input";
import { Label } from "@coss/ui/components/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@coss/ui/components/select";
import { Textarea } from "@coss/ui/components/textarea";
import { useActionState, useMemo, useState } from "react";
import { FormError } from "@/components/form-error";
import { createContractAction, simulateContractAction } from "./actions";

type Option = { value: string; label: string };

/** Stable React keys for rows added and removed in the editor. */
let rowCount = 0;
const uid = () => `row-${++rowCount}`;

function Choice(props: { value: string; onChange: (value: string) => void; items: Option[] }) {
  return (
    <Select
      items={props.items}
      onValueChange={(value) => props.onChange(String(value))}
      value={props.value}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {props.items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

type TierRow = { uid: string; upTo: string; price: string };
type RateState = {
  mode: "list" | "discount" | "custom";
  discount: string;
  pricing: "graduated" | "volume";
  window: "period" | "term";
  /** Empty: every dimension value; else e.g. `country=US`. */
  dimension: string;
  tiers: TierRow[];
};
type DiscountRow = {
  uid: string;
  scope: string;
  percent: string;
  until: string;
  description: string;
};
type CommitmentRow = {
  uid: string;
  id: string;
  kind: "minimum_spend" | "prepaid_spend" | "prepaid_units";
  amount: string;
  units: string;
  unitPrice: string;
  meter: MeterKey;
  dimension: string;
  period: "month" | "quarter" | "year" | "term";
  schedule: "upfront" | "monthly" | "quarterly";
  counts: "usage" | "usage_and_fees";
  rollover: boolean;
};
type AddOnRow = {
  uid: string;
  key: string;
  name: string;
  price: string;
  quantity: string;
  interval: string;
  timing: string;
};

type EditorState = {
  plan: PlanKey;
  feeMode: "plan" | "none" | "custom";
  feeAmount: string;
  feeInterval: "month" | "quarter" | "year";
  feeTiming: "advance" | "arrears";
  credit: "default" | "month" | "interval" | "none";
  overage: "default" | "billed" | "blocked";
  included: Record<MeterKey, string>;
  caps: Record<MeterKey, string>;
  rates: Record<MeterKey, RateState>;
  discounts: DiscountRow[];
  commitments: CommitmentRow[];
  addOns: AddOnRow[];
  features: Record<FeatureKey, "default" | "on" | "off">;
  limits: Record<LimitKey, string>;
  sendPerSecond: string;
  sendBurst: string;
  sendPerDay: string;
};

const perMeter = <T,>(value: () => T) =>
  Object.fromEntries(METER_KEYS.map((meter) => [meter, value()])) as Record<MeterKey, T>;

function initialState(plan: PlanKey): EditorState {
  return {
    plan,
    feeMode: plan === "enterprise" ? "custom" : "plan",
    feeAmount: plan === "enterprise" ? "2000" : "",
    feeInterval: "month",
    feeTiming: "advance",
    credit: "default",
    overage: "default",
    included: perMeter(() => ""),
    caps: perMeter(() => ""),
    rates: perMeter(() => ({
      mode: "list",
      discount: "",
      pricing: "graduated",
      window: "period",
      dimension: "",
      tiers: [{ uid: uid(), upTo: "", price: "" }],
    })),
    discounts: [],
    commitments: [],
    addOns: [],
    features: Object.fromEntries(
      FEATURE_KEYS.map((key) => [key, "default"]),
    ) as EditorState["features"],
    limits: Object.fromEntries(LIMIT_KEYS.map((key) => [key, ""])) as EditorState["limits"],
    sendPerSecond: "",
    sendBurst: "",
    sendPerDay: "",
  };
}

/** Dollars per `per` units → nanos per unit (as a string), or an error. */
function unitNanos(text: string, per: number, label: string): string {
  const nanos = parseDollarsToNanos(text);
  if (nanos === null || nanos % BigInt(per) !== 0n) {
    throw new Error(`${label}: enter a price like 0.40 (per ${per.toLocaleString("en-US")}).`);
  }
  return (nanos / BigInt(per)).toString();
}

function cents(text: string, label: string): string {
  const value = parseDollarsToCents(text);
  if (value === null) throw new Error(`${label}: enter dollars, like 2,000 or 0.50.`);
  return value.toString();
}

function wholeNumber(text: string, label: string): number {
  const value = Number(text.replaceAll(",", ""));
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label}: enter a whole number.`);
  return value;
}

/** The terms JSON the form describes (what `billing_contract.terms` stores). */
function buildTerms(state: EditorState): Record<string, unknown> {
  const terms: Record<string, unknown> = { version: 1, plan: state.plan };
  if (state.feeMode === "none") terms.fee = null;
  if (state.feeMode === "custom") {
    terms.fee = {
      amountCents: cents(state.feeAmount, "Fee"),
      interval: state.feeInterval,
      timing: state.feeTiming,
    };
  }
  if (state.credit === "none") terms.feeCredit = { spendable: false, pool: "month" };
  if (state.credit === "month" || state.credit === "interval") {
    terms.feeCredit = { spendable: true, pool: state.credit };
  }
  if (state.overage !== "default") terms.overage = state.overage;
  const included = Object.fromEntries(
    METER_KEYS.filter((meter) => state.included[meter].trim()).map((meter) => [
      meter,
      wholeNumber(state.included[meter], `${METERS[meter].label} included`),
    ]),
  );
  if (Object.keys(included).length) terms.includedUnits = included;
  const caps = Object.fromEntries(
    METER_KEYS.filter((meter) => state.caps[meter].trim()).map((meter) => [
      meter,
      state.caps[meter].trim() === "none"
        ? null
        : wholeNumber(state.caps[meter], `${METERS[meter].label} cap`),
    ]),
  );
  if (Object.keys(caps).length) terms.usageCaps = caps;

  const rates: Record<string, unknown> = {};
  for (const meter of METER_KEYS) {
    const rate = state.rates[meter];
    const per = METERS[meter].displayPer;
    if (rate.mode === "discount") {
      rates[meter] = { discountPercent: Number(rate.discount) };
    } else if (rate.mode === "custom") {
      const tiers = rate.tiers.map((tier, index) => ({
        upTo:
          index === rate.tiers.length - 1
            ? null
            : wholeNumber(tier.upTo, `${METERS[meter].label} tier ${index + 1} limit`),
        unitNanos: unitNanos(tier.price, per, `${METERS[meter].label} tier ${index + 1} price`),
      }));
      const value = {
        mode: rate.pricing,
        tiers,
        ...(rate.window === "term" ? { tierWindow: "term" } : {}),
      };
      rates[meter] = rate.dimension.trim()
        ? { byDimension: { [rate.dimension.trim()]: value } }
        : { default: value };
    }
  }
  if (Object.keys(rates).length) terms.rates = rates;

  if (state.discounts.length) {
    terms.discounts = state.discounts.map((row) => ({
      scope: row.scope,
      percent: Number(row.percent),
      ...(row.until ? { until: `${row.until}T00:00:00Z` } : {}),
      ...(row.description.trim() ? { description: row.description.trim() } : {}),
    }));
  }
  if (state.commitments.length) {
    terms.commitments = state.commitments.map((row) => {
      if (row.kind === "minimum_spend") {
        return {
          id: row.id,
          kind: row.kind,
          amountCents: cents(row.amount, `Commitment ${row.id}`),
          period: row.period,
          counts: row.counts,
        };
      }
      if (row.kind === "prepaid_spend") {
        return {
          id: row.id,
          kind: row.kind,
          amountCents: cents(row.amount, `Commitment ${row.id}`),
          period: row.period,
          schedule: row.schedule,
          rollover: row.rollover,
        };
      }
      return {
        id: row.id,
        kind: row.kind,
        meter: row.meter,
        ...(row.dimension.trim() ? { dimension: row.dimension.trim() } : {}),
        units: wholeNumber(row.units, `Commitment ${row.id} units`),
        unitNanos: unitNanos(
          row.unitPrice,
          METERS[row.meter].displayPer,
          `Commitment ${row.id} price`,
        ),
        period: row.period,
        schedule: row.schedule,
        rollover: row.rollover,
      };
    });
  }
  if (state.addOns.length) {
    terms.addOns = state.addOns.map((row) => ({
      key: row.key,
      name: row.name,
      unitAmountCents: cents(row.price, `Add-on ${row.name}`),
      quantity: wholeNumber(row.quantity || "1", `Add-on ${row.name} quantity`),
      interval: row.interval,
      timing: row.timing,
    }));
  }

  const features = Object.fromEntries(
    FEATURE_KEYS.filter((key) => state.features[key] !== "default").map((key) => [
      key,
      state.features[key] === "on",
    ]),
  );
  const limits = Object.fromEntries(
    LIMIT_KEYS.filter((key) => state.limits[key].trim()).map((key) => [
      key,
      state.limits[key].trim() === "unlimited"
        ? null
        : wholeNumber(state.limits[key], LIMIT_LABELS[key]),
    ]),
  );
  const rateLimits: Record<string, unknown> = {};
  if (state.sendPerSecond.trim()) {
    rateLimits["email.recipients.second"] = {
      limit: wholeNumber(state.sendPerSecond, "Recipients per second"),
      periodMs: 1000,
      ...(state.sendBurst.trim() ? { burst: wholeNumber(state.sendBurst, "Burst") } : {}),
    };
  }
  if (state.sendPerDay.trim()) {
    rateLimits["email.recipients.day"] = {
      limit: wholeNumber(state.sendPerDay, "Recipients per day"),
      periodMs: 86_400_000,
    };
  }
  const entitlements = {
    ...(Object.keys(features).length ? { features } : {}),
    ...(Object.keys(limits).length ? { limits } : {}),
    ...(Object.keys(rateLimits).length ? { rateLimits } : {}),
  };
  if (Object.keys(entitlements).length) terms.entitlements = entitlements;
  return terms;
}

/** The next 36 month starts, `YYYY-MM`. */
function monthOptions(includeNow: boolean): Option[] {
  const now = new Date();
  const options: Option[] = includeNow ? [{ value: "now", label: "Now (this hour)" }] : [];
  for (let i = 1; i <= 36; i++) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    options.push({
      value: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" }),
    });
  }
  return options;
}

const PLAN_OPTIONS = PLAN_KEYS.map((key) => ({ value: key, label: PLANS[key].name }));
const METER_OPTIONS = METER_KEYS.map((meter) => ({ value: meter, label: METERS[meter].label }));

/**
 * The new-contract editor (platform admins): a plan as the base, everything a deal overrides
 * (fee, credit, rates and tiers, discounts, commitments, add-ons, entitlements), and its term.
 * Simulate rates the organization's real usage under the draft before saving it.
 */
export function ContractEditor(props: { organizationId: string; currentPlan: PlanKey }) {
  const [state, setState] = useState<EditorState>(() => initialState(props.currentPlan));
  const [advanced, setAdvanced] = useState(false);
  const [json, setJson] = useState("");
  const [created, createAction, creating] = useActionState(createContractAction, null);
  const [simulation, simulateAction, simulating] = useActionState(simulateContractAction, null);
  const built = useMemo(() => {
    try {
      return { json: JSON.stringify(buildTerms(state), null, 2), error: null };
    } catch (error) {
      return { json: "", error: error instanceof Error ? error.message : String(error) };
    }
  }, [state]);
  const terms = advanced ? json : built.json;
  const update = (patch: Partial<EditorState>) =>
    setState((previous) => ({ ...previous, ...patch }));
  const setRate = (meter: MeterKey, patch: Partial<RateState>) =>
    setState((previous) => ({
      ...previous,
      rates: { ...previous.rates, [meter]: { ...previous.rates[meter], ...patch } },
    }));
  const setRow = <K extends "discounts" | "commitments" | "addOns">(
    key: K,
    index: number,
    patch: Partial<EditorState[K][number]>,
  ) =>
    setState((previous) => ({
      ...previous,
      [key]: previous[key].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  const removeRow = (key: "discounts" | "commitments" | "addOns", index: number) =>
    setState((previous) => ({ ...previous, [key]: previous[key].filter((_, i) => i !== index) }));

  return (
    <form action={createAction} className="flex flex-col gap-6">
      <input name="organizationId" type="hidden" value={props.organizationId} />
      <input name="terms" type="hidden" value={terms} />

      <Card>
        <CardHeader>
          <CardTitle>Plan and fee</CardTitle>
          <CardDescription>
            The plan sets entitlements and list prices; everything below overrides it.
          </CardDescription>
        </CardHeader>
        <CardPanel className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Base plan</FieldLabel>
            <Choice
              items={PLAN_OPTIONS}
              onChange={(value) => setState(initialState(value as PlanKey))}
              value={state.plan}
            />
          </Field>
          <Field>
            <FieldLabel>Fee</FieldLabel>
            <Choice
              items={[
                {
                  value: "plan",
                  label: `The plan's (${formatCents(PLANS[state.plan].feeCents)}/month)`,
                },
                { value: "custom", label: "Custom" },
                { value: "none", label: "No fee" },
              ]}
              onChange={(value) => update({ feeMode: value as EditorState["feeMode"] })}
              value={state.feeMode}
            />
          </Field>
          {state.feeMode === "custom" ? (
            <>
              <Field>
                <FieldLabel>Fee amount (USD)</FieldLabel>
                <Input
                  onChange={(event) => update({ feeAmount: event.target.value })}
                  value={state.feeAmount}
                />
              </Field>
              <Field>
                <FieldLabel>Billed</FieldLabel>
                <div className="flex gap-2">
                  <Choice
                    items={[
                      { value: "month", label: "Monthly" },
                      { value: "quarter", label: "Quarterly" },
                      { value: "year", label: "Yearly" },
                    ]}
                    onChange={(value) =>
                      update({ feeInterval: value as EditorState["feeInterval"] })
                    }
                    value={state.feeInterval}
                  />
                  <Choice
                    items={[
                      { value: "advance", label: "In advance" },
                      { value: "arrears", label: "In arrears" },
                    ]}
                    onChange={(value) => update({ feeTiming: value as EditorState["feeTiming"] })}
                    value={state.feeTiming}
                  />
                </div>
              </Field>
            </>
          ) : null}
          <Field>
            <FieldLabel>Fee as usage credit</FieldLabel>
            <Choice
              items={[
                { value: "default", label: "Spendable, per month (default)" },
                { value: "interval", label: "Spendable, pooled over the fee's interval" },
                { value: "month", label: "Spendable, per month" },
                { value: "none", label: "Not spendable (a platform fee)" },
              ]}
              onChange={(value) => update({ credit: value as EditorState["credit"] })}
              value={state.credit}
            />
          </Field>
          <Field>
            <FieldLabel>Usage beyond included units</FieldLabel>
            <Choice
              items={[
                { value: "default", label: `The plan's (${PLANS[state.plan].overage})` },
                { value: "billed", label: "Billed" },
                { value: "blocked", label: "Blocked (hard cap)" },
              ]}
              onChange={(value) => update({ overage: value as EditorState["overage"] })}
              value={state.overage}
            />
          </Field>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage pricing</CardTitle>
          <CardDescription>
            Per product: list prices, a discount on them, or the deal's own tiers (prices per{" "}
            {"the product's display unit"}; leave the last tier's limit empty).
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-6">
          {METER_KEYS.map((meter) => {
            const rate = state.rates[meter];
            const definition = METERS[meter];
            return (
              <div className="flex flex-col gap-3" key={meter}>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Field>
                    <FieldLabel>{definition.label}</FieldLabel>
                    <Choice
                      items={[
                        { value: "list", label: "List prices" },
                        { value: "discount", label: "Discount" },
                        { value: "custom", label: "Custom tiers" },
                      ]}
                      onChange={(value) => setRate(meter, { mode: value as RateState["mode"] })}
                      value={rate.mode}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Included per month</FieldLabel>
                    <Input
                      onChange={(event) =>
                        update({ included: { ...state.included, [meter]: event.target.value } })
                      }
                      placeholder={String(
                        (PLANS[state.plan].includedUnits as Partial<Record<MeterKey, number>>)[
                          meter
                        ] ?? 0,
                      )}
                      value={state.included[meter]}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Hard cap per month</FieldLabel>
                    <Input
                      onChange={(event) =>
                        update({ caps: { ...state.caps, [meter]: event.target.value } })
                      }
                      placeholder="Default"
                      value={state.caps[meter]}
                    />
                    <FieldDescription>A number, or "none".</FieldDescription>
                  </Field>
                  {rate.mode === "discount" ? (
                    <Field>
                      <FieldLabel>Discount (%)</FieldLabel>
                      <Input
                        onChange={(event) => setRate(meter, { discount: event.target.value })}
                        value={rate.discount}
                      />
                    </Field>
                  ) : null}
                </div>
                {rate.mode === "custom" ? (
                  <div className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Choice
                        items={[
                          { value: "graduated", label: "Graduated" },
                          { value: "volume", label: "Volume (all units)" },
                        ]}
                        onChange={(value) =>
                          setRate(meter, { pricing: value as RateState["pricing"] })
                        }
                        value={rate.pricing}
                      />
                      <Choice
                        items={[
                          { value: "period", label: "Tiers per month" },
                          { value: "term", label: "Tiers over the term" },
                        ]}
                        onChange={(value) =>
                          setRate(meter, { window: value as RateState["window"] })
                        }
                        value={rate.window}
                      />
                      <Input
                        onChange={(event) => setRate(meter, { dimension: event.target.value })}
                        placeholder={
                          definition.dimensions.length ? "country=US (all if empty)" : "All usage"
                        }
                        value={rate.dimension}
                      />
                    </div>
                    {rate.tiers.map((tier, index) => (
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={tier.uid}>
                        <Input
                          disabled={index === rate.tiers.length - 1}
                          onChange={(event) =>
                            setRate(meter, {
                              tiers: rate.tiers.map((row, i) =>
                                i === index ? { ...row, upTo: event.target.value } : row,
                              ),
                            })
                          }
                          placeholder={
                            index === rate.tiers.length - 1 ? "No limit" : "Up to (units)"
                          }
                          value={index === rate.tiers.length - 1 ? "" : tier.upTo}
                        />
                        <Input
                          onChange={(event) =>
                            setRate(meter, {
                              tiers: rate.tiers.map((row, i) =>
                                i === index ? { ...row, price: event.target.value } : row,
                              ),
                            })
                          }
                          placeholder={`$ per ${definition.displayPer.toLocaleString("en-US")} ${definition.units}`}
                          value={tier.price}
                        />
                        <Button
                          disabled={rate.tiers.length === 1}
                          onClick={() =>
                            setRate(meter, { tiers: rate.tiers.filter((_, i) => i !== index) })
                          }
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <div>
                      <Button
                        onClick={() =>
                          setRate(meter, {
                            tiers: [{ uid: uid(), upTo: "", price: "" }, ...rate.tiers],
                          })
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Add a tier
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commitments</CardTitle>
          <CardDescription>
            Minimum spend (the shortfall is invoiced at the period's end), prepaid spend (drawn down
            as credit) or prepaid units of one product (committed volume, e.g. SMS).
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          {state.commitments.map((row, index) => (
            <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4" key={row.uid}>
              <Input
                onChange={(event) => setRow("commitments", index, { id: event.target.value })}
                placeholder="id, e.g. annual-min"
                value={row.id}
              />
              <Choice
                items={[
                  { value: "minimum_spend", label: "Minimum spend" },
                  { value: "prepaid_spend", label: "Prepaid spend" },
                  { value: "prepaid_units", label: "Prepaid units" },
                ]}
                onChange={(value) =>
                  setRow("commitments", index, { kind: value as CommitmentRow["kind"] })
                }
                value={row.kind}
              />
              <Choice
                items={[
                  { value: "month", label: "Per month" },
                  { value: "quarter", label: "Per quarter" },
                  { value: "year", label: "Per year" },
                  { value: "term", label: "Over the term" },
                ]}
                onChange={(value) =>
                  setRow("commitments", index, { period: value as CommitmentRow["period"] })
                }
                value={row.period}
              />
              {row.kind === "prepaid_units" ? (
                <>
                  <Choice
                    items={METER_OPTIONS}
                    onChange={(value) => setRow("commitments", index, { meter: value as MeterKey })}
                    value={row.meter}
                  />
                  <Input
                    onChange={(event) =>
                      setRow("commitments", index, { dimension: event.target.value })
                    }
                    placeholder="country=US (optional)"
                    value={row.dimension}
                  />
                  <Input
                    onChange={(event) =>
                      setRow("commitments", index, { units: event.target.value })
                    }
                    placeholder="Units"
                    value={row.units}
                  />
                  <Input
                    onChange={(event) =>
                      setRow("commitments", index, { unitPrice: event.target.value })
                    }
                    placeholder={`$ per ${METERS[row.meter].displayPer.toLocaleString("en-US")}`}
                    value={row.unitPrice}
                  />
                </>
              ) : (
                <Input
                  onChange={(event) => setRow("commitments", index, { amount: event.target.value })}
                  placeholder="Amount (USD)"
                  value={row.amount}
                />
              )}
              {row.kind === "minimum_spend" ? (
                <Choice
                  items={[
                    { value: "usage", label: "Counts usage" },
                    { value: "usage_and_fees", label: "Counts usage and fees" },
                  ]}
                  onChange={(value) =>
                    setRow("commitments", index, { counts: value as CommitmentRow["counts"] })
                  }
                  value={row.counts}
                />
              ) : (
                <>
                  <Choice
                    items={[
                      { value: "upfront", label: "Invoiced upfront" },
                      { value: "monthly", label: "Monthly installments" },
                      { value: "quarterly", label: "Quarterly installments" },
                    ]}
                    onChange={(value) =>
                      setRow("commitments", index, { schedule: value as CommitmentRow["schedule"] })
                    }
                    value={row.schedule}
                  />
                  <Label className="flex items-center gap-2">
                    <Checkbox
                      checked={row.rollover}
                      onCheckedChange={(checked) =>
                        setRow("commitments", index, { rollover: checked === true })
                      }
                    />
                    Unused balance rolls over
                  </Label>
                </>
              )}
              <Button
                onClick={() => removeRow("commitments", index)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          ))}
          <div>
            <Button
              onClick={() =>
                update({
                  commitments: [
                    ...state.commitments,
                    {
                      uid: uid(),
                      id: `commit-${state.commitments.length + 1}`,
                      kind: "minimum_spend",
                      amount: "",
                      units: "",
                      unitPrice: "",
                      meter: "email.recipients",
                      dimension: "",
                      period: "year",
                      schedule: "upfront",
                      counts: "usage",
                      rollover: false,
                    },
                  ],
                })
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Add a commitment
            </Button>
          </div>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Discounts and add-ons</CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          {state.discounts.map((row, index) => (
            <div className="grid gap-2 sm:grid-cols-5" key={row.uid}>
              <Choice
                items={[
                  { value: "usage", label: "All usage" },
                  { value: "fees", label: "Fees" },
                  { value: "add_ons", label: "Add-ons" },
                  ...METER_OPTIONS,
                ]}
                onChange={(value) => setRow("discounts", index, { scope: value })}
                value={row.scope}
              />
              <Input
                onChange={(event) => setRow("discounts", index, { percent: event.target.value })}
                placeholder="%"
                value={row.percent}
              />
              <Input
                onChange={(event) => setRow("discounts", index, { until: event.target.value })}
                type="date"
                value={row.until}
              />
              <Input
                onChange={(event) =>
                  setRow("discounts", index, { description: event.target.value })
                }
                placeholder="Shown on invoices"
                value={row.description}
              />
              <Button
                onClick={() => removeRow("discounts", index)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          ))}
          {state.addOns.map((row, index) => (
            <div className="grid gap-2 sm:grid-cols-6" key={row.uid}>
              <Input
                onChange={(event) => setRow("addOns", index, { key: event.target.value })}
                placeholder="key"
                value={row.key}
              />
              <Input
                onChange={(event) => setRow("addOns", index, { name: event.target.value })}
                placeholder="Name"
                value={row.name}
              />
              <Input
                onChange={(event) => setRow("addOns", index, { price: event.target.value })}
                placeholder="Price (USD)"
                value={row.price}
              />
              <Input
                onChange={(event) => setRow("addOns", index, { quantity: event.target.value })}
                placeholder="Quantity"
                value={row.quantity}
              />
              <Choice
                items={[
                  { value: "month", label: "Monthly" },
                  { value: "quarter", label: "Quarterly" },
                  { value: "year", label: "Yearly" },
                ]}
                onChange={(value) => setRow("addOns", index, { interval: value })}
                value={row.interval}
              />
              <Button
                onClick={() => removeRow("addOns", index)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              onClick={() =>
                update({
                  discounts: [
                    ...state.discounts,
                    { uid: uid(), scope: "usage", percent: "", until: "", description: "" },
                  ],
                })
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Add a discount
            </Button>
            <Button
              onClick={() =>
                update({
                  addOns: [
                    ...state.addOns,
                    {
                      uid: uid(),
                      key: `addon-${state.addOns.length + 1}`,
                      name: "",
                      price: "",
                      quantity: "1",
                      interval: "month",
                      timing: "advance",
                    },
                  ],
                })
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Add an add-on
            </Button>
          </div>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entitlements</CardTitle>
          <CardDescription>Leave as default to keep the plan's.</CardDescription>
        </CardHeader>
        <CardPanel className="grid gap-4 sm:grid-cols-3">
          {FEATURE_KEYS.map((feature) => (
            <Field key={feature}>
              <FieldLabel>{FEATURE_LABELS[feature]}</FieldLabel>
              <Choice
                items={[
                  {
                    value: "default",
                    label: `Plan default (${PLANS[state.plan].entitlements.features[feature] ? "on" : "off"})`,
                  },
                  { value: "on", label: "On" },
                  { value: "off", label: "Off" },
                ]}
                onChange={(value) =>
                  update({
                    features: { ...state.features, [feature]: value as "default" | "on" | "off" },
                  })
                }
                value={state.features[feature]}
              />
            </Field>
          ))}
          {LIMIT_KEYS.map((limit) => (
            <Field key={limit}>
              <FieldLabel>{LIMIT_LABELS[limit]}</FieldLabel>
              <Input
                onChange={(event) =>
                  update({ limits: { ...state.limits, [limit]: event.target.value } })
                }
                placeholder={String(PLANS[state.plan].entitlements.limits[limit] ?? "unlimited")}
                value={state.limits[limit]}
              />
            </Field>
          ))}
          <Field>
            <FieldLabel>Recipients per second (burst)</FieldLabel>
            <div className="flex gap-2">
              <Input
                onChange={(event) => update({ sendPerSecond: event.target.value })}
                placeholder={String(
                  PLANS[state.plan].entitlements.rateLimits["email.recipients.second"].limit,
                )}
                value={state.sendPerSecond}
              />
              <Input
                onChange={(event) => update({ sendBurst: event.target.value })}
                placeholder={String(
                  PLANS[state.plan].entitlements.rateLimits["email.recipients.second"].burst ?? "",
                )}
                value={state.sendBurst}
              />
            </div>
          </Field>
          <Field>
            <FieldLabel>Recipients per day</FieldLabel>
            <Input
              onChange={(event) => update({ sendPerDay: event.target.value })}
              placeholder={String(
                PLANS[state.plan].entitlements.rateLimits["email.recipients.day"].limit,
              )}
              value={state.sendPerDay}
            />
          </Field>
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terms (JSON)</CardTitle>
          <CardDescription>
            What the contract stores. Edit it directly for anything the form doesn't cover.
          </CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-3">
          <Label className="flex items-center gap-2">
            <Checkbox
              checked={advanced}
              onCheckedChange={(checked) => {
                if (checked === true) setJson(built.json);
                setAdvanced(checked === true);
              }}
            />
            Edit the JSON directly (the form above is then ignored)
          </Label>
          {built.error && !advanced ? <FormError message={built.error} /> : null}
          <Textarea
            className="font-mono text-xs"
            onChange={(event) => setJson(event.target.value)}
            readOnly={!advanced}
            rows={12}
            value={advanced ? json : built.json}
          />
        </CardPanel>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Term and approval</CardTitle>
        </CardHeader>
        <CardPanel className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Kind</FieldLabel>
            <Select
              defaultValue="sales"
              items={[
                { value: "sales", label: "Sales contract" },
                { value: "internal", label: "Internal (never invoiced)" },
                { value: "self_serve", label: "Self-serve plan" },
              ]}
              name="kind"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="sales">Sales contract</SelectItem>
                <SelectItem value="internal">Internal (never invoiced)</SelectItem>
                <SelectItem value="self_serve">Self-serve plan</SelectItem>
              </SelectPopup>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Takes effect</FieldLabel>
            <Select defaultValue="now" items={monthOptions(true)} name="effectiveFrom">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {monthOptions(true).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <FieldDescription>
              Now (invoiced for the rest of the month) or the first of a month.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Term ends</FieldLabel>
            <Select
              defaultValue=""
              items={[{ value: "", label: "Month to month" }, ...monthOptions(false)]}
              name="termEnd"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="">Month to month</SelectItem>
                {monthOptions(false).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>
          <Label className="flex items-center gap-2 self-end">
            <Checkbox name="autoRenew" />
            Renews automatically at the term's end
          </Label>
          <Field>
            <FieldLabel>Reference</FieldLabel>
            <Input name="reference" placeholder="Order form or CRM link" />
          </Field>
          <Field>
            <FieldLabel>Note (internal)</FieldLabel>
            <Input name="note" />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Reason</FieldLabel>
            <Textarea maxLength={500} name="reason" required rows={2} />
            <FieldDescription>
              Kept in the admin audit log; never shown to the customer.
            </FieldDescription>
          </Field>
          {created?.ok ? <p className="text-muted-foreground text-sm">Contract created.</p> : null}
          {created && !created.ok ? <FormError message={created.error} /> : null}
          {simulation && !simulation.ok ? <FormError message={simulation.error} /> : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button
              disabled={!terms}
              formAction={simulateAction}
              formNoValidate
              loading={simulating}
              type="submit"
              variant="outline"
            >
              Simulate
            </Button>
            <Button disabled={!terms} loading={creating} type="submit">
              Create contract
            </Button>
          </div>
        </CardPanel>
      </Card>

      {simulation?.ok
        ? simulation.data.map((result) => (
            <Card key={result.period}>
              <CardHeader>
                <CardTitle>{result.period}</CardTitle>
                <CardDescription>
                  With these terms: {formatCents(BigInt(result.simulated.totalCents))} (fee
                  included, before existing credits). Actually:{" "}
                  {formatCents(BigInt(result.actual.totalCents))} (usage and arrears only).
                </CardDescription>
              </CardHeader>
              <CardPanel className="grid gap-4 sm:grid-cols-2 text-sm">
                {(["simulated", "actual"] as const).map((side) => (
                  <ul className="flex flex-col gap-1" key={side}>
                    <li className="font-medium">
                      {side === "simulated" ? "Simulated" : "Current"}
                    </li>
                    {result[side].lines.map((line) => (
                      <li
                        className="flex justify-between gap-2"
                        key={`${line.kind}:${line.description}:${line.amountCents}`}
                      >
                        <span>{line.description}</span>
                        <span className="tabular-nums">
                          {formatCents(BigInt(line.amountCents))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
                {result.simulated.warnings.map((warning) => (
                  <p className="text-warning-foreground sm:col-span-2" key={warning}>
                    {warning}
                  </p>
                ))}
              </CardPanel>
            </Card>
          ))
        : null}
    </form>
  );
}
