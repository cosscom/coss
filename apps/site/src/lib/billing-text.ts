import {
  ADD_ON_KEYS,
  ADD_ONS,
  type AddOnDefinition,
  addOnGranting,
  FEATURE_KEYS,
  FEATURE_LABELS,
  LIMIT_KEYS,
  LIMIT_LABELS,
  METER_KEYS,
  METERS,
  PLAN_KEYS,
  PLANS,
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

/** The list usage rates per meter (the current rate card). */
export function rateRows(): { product: string; rate: string; note: string }[] {
  const card = RATE_CARDS.at(-1);
  if (!card) return [];
  return METER_KEYS.flatMap((meter) => {
    const definition = METERS[meter];
    const rates = card.rates[meter];
    if (!rates) return [];
    const addOn = meter === "email.dedicated_ip" ? ADD_ONS.dedicated_ips : null;
    const note =
      definition.requires === "commitment"
        ? "Committed volume, Enterprise only"
        : addOn
          ? `With the ${addOn.name} add-on, on top of Email`
          : "";
    if (rates.default) {
      return [
        {
          product: definition.label,
          rate: describeRate(rates.default, definition.displayPer, definition.unit),
          note,
        },
      ];
    }
    return Object.entries(rates.byDimension ?? {}).map(([dimension, rate]) => ({
      product: `${definition.label} (${dimension.split("=")[1]})`,
      rate: describeRate(rate, definition.displayPer, definition.unit),
      note,
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
  const rateTable = [
    "| Product | Rate | |",
    "| --- | --- | --- |",
    ...rateRows().map(
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
    .replaceAll("<UsageRates />", rateTable)
    .replaceAll("<AddOns />", addOnTable);
}
