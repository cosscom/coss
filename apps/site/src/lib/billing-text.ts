import {
  ADD_ON_KEYS,
  ADD_ONS,
  type AddOnDefinition,
  addOnGranting,
  FEATURE_KEYS,
  FEATURE_LABELS,
  formatDimension,
  LIMIT_KEYS,
  LIMIT_LABELS,
  METER_KEYS,
  METERS,
  type MeterKey,
  PLAN_KEYS,
  PLANS,
  type Product,
  RATE_CARDS,
  type Rate,
} from "@coss/billing/catalog";
import { formatUnitPrice } from "@coss/billing/money";
import { formatPrice } from "./pricing";

/** The plans and their features, as rows (shared by the MDX table and the Markdown for /llms*.txt). */
export function planRows(): { label: string; values: string[] }[] {
  const plans = PLAN_KEYS.map((key) => PLANS[key]);
  const included = (key: (typeof PLAN_KEYS)[number]) => {
    const plan = PLANS[key];
    if (key === "enterprise") return "Per contract";
    const units = Object.entries(plan.includedUnits).map(
      ([meter, n]) =>
        `${n.toLocaleString("en-US")} ${METERS[meter as keyof typeof METERS].label.toLowerCase()} ${METERS[meter as keyof typeof METERS].units} a month`,
    );
    if (plan.feeCents > 0n) units.unshift(`${formatPrice(plan.feeCents)} of usage`);
    return units.join(", ") || "None";
  };
  return [
    {
      label: "Price",
      values: plans.map((plan) =>
        plan.key === "enterprise"
          ? `From ${formatPrice(plan.feeCents)}/month, annual commitment`
          : plan.feeCents === 0n
            ? "Free"
            : `${formatPrice(plan.feeCents)}/month`,
      ),
    },
    { label: "Included", values: PLAN_KEYS.map(included) },
    {
      label: "Usage beyond it",
      values: plans.map((plan) =>
        plan.key === "enterprise"
          ? "Contract rates"
          : plan.overage === "blocked"
            ? "Not available"
            : "Usage rates below",
      ),
    },
    {
      label: "Sending rate",
      values: plans.map((plan) => {
        if (plan.key === "enterprise") return "Custom";
        const { rateLimits } = plan.entitlements;
        const second = rateLimits["email.recipients.second"].limit.toLocaleString("en-US");
        const day = rateLimits["email.recipients.day"].limit.toLocaleString("en-US");
        return `${second} emails a second, ${day} a day`;
      }),
    },
    {
      label: "SMS rate",
      values: plans.map((plan) => {
        if (plan.key === "enterprise") return "Custom";
        const included: Partial<Record<MeterKey, number>> = plan.includedUnits;
        if (plan.overage === "blocked" && !included["sms.segments"]) {
          return "Sandbox only";
        }
        const { rateLimits } = plan.entitlements;
        const second = rateLimits["sms.segments.second"].limit.toLocaleString("en-US");
        const day = rateLimits["sms.segments.day"].limit.toLocaleString("en-US");
        return `${second} SMS segments a second, ${day} a day`;
      }),
    },
    {
      label: "Marketing rate",
      values: plans.map((plan) => {
        if (plan.key === "enterprise") return "Custom";
        const { limit } = plan.entitlements.rateLimits["email.marketing.recipients.second"];
        return `${limit.toLocaleString("en-US")} marketing emails a second`;
      }),
    },
    ...LIMIT_KEYS.map((key) => ({
      label: LIMIT_LABELS[key],
      values: plans.map((plan) =>
        plan.key === "enterprise" && key !== "members"
          ? "Custom"
          : (plan.entitlements.limits[key]?.toLocaleString("en-US") ?? "Unlimited"),
      ),
    })),
    ...FEATURE_KEYS.map((key) => ({
      label: FEATURE_LABELS[key],
      values: plans.map((plan) =>
        plan.entitlements.features[key]
          ? "Yes"
          : addOnGranting(key)?.plans.includes(plan.key)
            ? "Add-on"
            : "—",
      ),
    })),
  ];
}

function describeRate(rate: Rate, per: number, unit: string): string {
  const perLabel = per === 1 ? unit : `${per.toLocaleString("en-US")} ${unit}s`;
  const price = (unitNanos: bigint) => `${formatUnitPrice(unitNanos, per)} per ${perLabel}`;
  const [only] = rate.tiers;
  if (rate.tiers.length === 1 && only) return price(only.unitNanos);
  let from = 0;
  return rate.tiers
    .map((tier) => {
      const span =
        tier.upTo === null
          ? `beyond ${from.toLocaleString("en-US")}`
          : from === 0
            ? `for the first ${tier.upTo.toLocaleString("en-US")}`
            : `from ${(from + 1).toLocaleString("en-US")} to ${tier.upTo.toLocaleString("en-US")}`;
      from = tier.upTo ?? from;
      return `${price(tier.unitNanos)} ${span}`;
    })
    .join("; ");
}

/** The list usage rates per meter (the current rate card), optionally of one product only. */
export function rateRows(only?: Product): { product: string; rate: string; note: string }[] {
  const card = RATE_CARDS.at(-1);
  if (!card) return [];
  return METER_KEYS.flatMap((meter) => {
    const definition = METERS[meter];
    if (only && definition.product !== only) return [];
    const rates = card.rates[meter];
    if (!rates) return [];
    const addOn = meter === "email.dedicated_ip" ? ADD_ONS.dedicated_ips : null;
    const note = addOn ? `With the ${addOn.name} add-on, on top of Email` : "";
    if (rates.default) {
      return [
        {
          product: definition.label,
          rate: describeRate(rates.default, definition.displayPer, definition.unit),
          note,
        },
      ];
    }
    const entries = Object.entries(rates.byDimension ?? {});
    const dimensions: readonly string[] = definition.dimensions;
    if (dimensions.includes("country")) {
      // Every country is listed on the pricing page; here the US and the range of the others.
      const us = rates.byDimension?.["country=US"];
      const others = entries
        .filter(([dimension]) => dimension !== "country=US")
        .flatMap(([, rate]) => rate.tiers.map((tier) => tier.unitNanos));
      const rows = us
        ? [
            {
              product: `${definition.label} (US)`,
              rate: describeRate(us, definition.displayPer, definition.unit),
              note: "",
            },
          ]
        : [];
      if (others.length) {
        const low = others.reduce((a, b) => (a < b ? a : b));
        const high = others.reduce((a, b) => (a > b ? a : b));
        rows.push({
          product: `${definition.label} (other countries)`,
          rate: `${formatUnitPrice(low)} to ${formatUnitPrice(high)} per ${definition.unit}`,
          note: "By country: coss.com/pricing#sms",
        });
      }
      return rows;
    }
    const fee = definition.unit === "fee";
    return entries.map(([dimension, rate]) => ({
      product: `${definition.label} (${formatDimension(dimension)})`,
      rate: fee
        ? formatUnitPrice(rate.tiers[0]?.unitNanos ?? 0n)
        : describeRate(rate, definition.displayPer, definition.unit),
      note: fee ? "Passed through at cost" : "",
    }));
  });
}

/** The add-ons sold on top of a plan. */
export function addOnRows(): { name: string; price: string; plans: string; description: string }[] {
  return ADD_ON_KEYS.map((key) => {
    const addOn: AddOnDefinition = ADD_ONS[key];
    return {
      name: addOn.name,
      price: `${formatPrice(addOn.unitAmountCents)}/${addOn.interval}`,
      plans: addOn.plans.map((plan) => PLANS[plan].name).join(", "),
      description: addOn.description,
    };
  });
}

/** The billing MDX components (`src/components/billing.tsx`) as Markdown, for /llms*.txt. */
export function renderBillingComponents(markdown: string): string {
  const plans = PLAN_KEYS.map((key) => PLANS[key].name);
  const planTable = [
    `| | ${plans.join(" | ")} |`,
    `| --- | ${plans.map(() => "---").join(" | ")} |`,
    ...planRows().map((row) => `| ${row.label} | ${row.values.join(" | ")} |`),
  ].join("\n");
  const rateTable = (only?: Product) =>
    [
      "| Product | Rate | |",
      "| --- | --- | --- |",
      ...rateRows(only).map(
        (row) => `| ${row.product} | ${row.rate} |${row.note ? ` ${row.note} ` : " "}|`,
      ),
    ].join("\n");
  const addOnTable = [
    "| Add-on | Price | Plans | |",
    "| --- | --- | --- | --- |",
    ...addOnRows().map(
      (row) => `| ${row.name} | ${row.price} | ${row.plans} | ${row.description} |`,
    ),
  ].join("\n");
  return markdown
    .replaceAll("<PlanTable />", planTable)
    .replaceAll("<UsageRates />", rateTable())
    .replace(/<UsageRates product="([a-z]+)" \/>/g, (_, product: Product) => rateTable(product))
    .replaceAll("<AddOns />", addOnTable);
}
