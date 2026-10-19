/**
 * Writes a new dated SMS list-price file (`src/catalog/sms-prices-<date>.generated.ts`) from what
 * Twilio charges coss.com, marked up and rounded up to $0.0001. Add a `RATE_CARDS` entry that uses
 * it (effective from `--effective`): a price change is a new card. A file is only rewritten while
 * its date is still in the future: once a card uses it, its prices have rated usage.
 *
 *   TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… SMS_NEGOTIATED_COSTS='{…}' \
 *     bun run sms:update-prices --markup 25 --effective 2026-11-01 [--dry-run]
 *
 * Costs per segment come from Twilio's Pricing API (the account's `current_price`, the highest
 * of any carrier in a country), overridden by `SMS_NEGOTIATED_COSTS`: JSON
 * `{ "outbound": { "US": "0.0108" }, "inbound": { … } }` in dollars, carrier fees included. The
 * negotiated costs and the markup are confidential: pass them in, never commit them.
 * `--costs <file>` reads that JSON instead of calling Twilio (no other countries are priced).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { parseDollarsToNanos } from "../src/money.ts";

const { values } = parseArgs({
  options: {
    markup: { type: "string" },
    effective: { type: "string" },
    costs: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});
const markup = Number(values.markup);
const effective = values.effective ?? "";
if (!Number.isInteger(markup) || markup < 0 || !/^\d{4}-\d{2}-01$/.test(effective)) {
  console.error(
    "Usage: sms:update-prices --markup <percent> --effective <YYYY-MM-01> [--costs <file>] [--dry-run]",
  );
  process.exit(1);
}

type Direction = "outbound" | "inbound";
type Costs = Record<Direction, Map<string, bigint>>;

/** Rounds up to $0.0001 (100,000 nanos). */
const STEP = 100_000n;

function costsFromJson(text: string): Costs {
  const parsed = JSON.parse(text) as Partial<Record<Direction, Record<string, string>>>;
  const costs: Costs = { outbound: new Map(), inbound: new Map() };
  for (const direction of ["outbound", "inbound"] as const) {
    for (const [country, dollars] of Object.entries(parsed[direction] ?? {})) {
      const nanos = parseDollarsToNanos(String(dollars));
      if (!/^[A-Z]{2}$/.test(country) || nanos === null) {
        throw new Error(`Bad ${direction} cost for ${country}: ${dollars}`);
      }
      costs[direction].set(country, nanos);
    }
  }
  return costs;
}

type TwilioCountryPage = {
  countries: { iso_country: string }[];
  meta: { next_page_url: string | null };
};
type TwilioPrice = { number_type: string; current_price: string };
type TwilioCountry = {
  outbound_sms_prices: { prices: TwilioPrice[] }[];
  inbound_sms_prices: TwilioPrice[];
  price_unit: string;
};

async function twilio<T>(url: string): Promise<T> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required.");
  const response = await fetch(url, {
    headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
  });
  if (!response.ok) throw new Error(`GET ${url} → ${response.status}`);
  return (await response.json()) as T;
}

/** The highest price among the number types coss.com sends from (never short codes). */
function highest(prices: readonly TwilioPrice[]): bigint | null {
  let max: bigint | null = null;
  for (const price of prices) {
    if (price.number_type === "shortcode") continue;
    const nanos = parseDollarsToNanos(price.current_price);
    if (nanos !== null && (max === null || nanos > max)) max = nanos;
  }
  return max;
}

async function costsFromTwilio(): Promise<Costs> {
  const costs: Costs = { outbound: new Map(), inbound: new Map() };
  const isos: string[] = [];
  let next: string | null = "https://pricing.twilio.com/v1/Messaging/Countries?PageSize=1000";
  while (next) {
    const page: TwilioCountryPage = await twilio<TwilioCountryPage>(next);
    isos.push(...page.countries.map((country) => country.iso_country));
    next = page.meta.next_page_url;
  }
  for (const iso of isos) {
    const country = await twilio<TwilioCountry>(
      `https://pricing.twilio.com/v1/Messaging/Countries/${iso}`,
    );
    if (country.price_unit.toUpperCase() !== "USD")
      throw new Error(`${iso}: ${country.price_unit}`);
    const outbound = highest(country.outbound_sms_prices.flatMap((carrier) => carrier.prices));
    const inbound = highest(country.inbound_sms_prices);
    // A $0 outbound price is never what Twilio charges for a send: leave the country unpriced
    // rather than make it free. Receiving can be free, and is priced at $0 then.
    if (outbound === 0n) console.warn(`${iso}: Twilio lists a $0 outbound price; left unpriced.`);
    else if (outbound !== null) costs.outbound.set(iso, outbound);
    if (inbound !== null) costs.inbound.set(iso, inbound);
  }
  if (costs.outbound.size < 100) {
    throw new Error(`Only ${costs.outbound.size} countries: refusing to write.`);
  }
  return costs;
}

const costs = values.costs
  ? costsFromJson(readFileSync(values.costs, "utf8"))
  : await costsFromTwilio();
const negotiated = process.env.SMS_NEGOTIATED_COSTS;
if (negotiated) {
  const overrides = costsFromJson(negotiated);
  for (const direction of ["outbound", "inbound"] as const) {
    for (const [country, nanos] of overrides[direction]) costs[direction].set(country, nanos);
  }
}

function listPrice(cost: bigint): bigint {
  const marked = (cost * BigInt(100 + markup) + 99n) / 100n;
  return ((marked + STEP - 1n) / STEP) * STEP;
}

function entries(direction: Direction): string {
  return [...costs[direction]]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([country, cost]) =>
        `    ${country}: ${listPrice(cost).toLocaleString("en-US").replaceAll(",", "_")}n,`,
    )
    .join("\n");
}

const name = `SMS_PRICES_${effective.replaceAll("-", "_")}`;
const source = `// Generated by \`bun run sms:update-prices\`: SMS list prices from ${effective}, in nanos per
// segment by ISO country (outbound by destination, inbound by the receiving number's country).
// Don't edit; a price change is a new file and a new rate card.

export const ${name}: {
  outbound: Readonly<Record<string, bigint>>;
  inbound: Readonly<Record<string, bigint>>;
} = {
  outbound: {
${entries("outbound")}
  },
  inbound: {
${entries("inbound")}
  },
};
`;

if (values["dry-run"]) {
  for (const direction of ["outbound", "inbound"] as const) {
    for (const [country, cost] of [...costs[direction]].sort(([a], [b]) => a.localeCompare(b))) {
      const price = Number(listPrice(cost)) / 1e9;
      console.info(`${direction.padEnd(8)} ${country} $${price.toFixed(4)}`);
    }
  }
} else {
  const output = new URL(`../src/catalog/sms-prices-${effective}.generated.ts`, import.meta.url);
  if (existsSync(output) && effective <= new Date().toISOString().slice(0, 10)) {
    console.error(
      `${output.pathname} is in effect since ${effective}: its prices have rated usage. Write a new ` +
        "file with a later --effective date (and a new rate card) instead.",
    );
    process.exit(1);
  }
  writeFileSync(output, source);
  console.info(
    `Wrote ${costs.outbound.size} outbound and ${costs.inbound.size} inbound prices to ${output.pathname}.`,
  );
}
