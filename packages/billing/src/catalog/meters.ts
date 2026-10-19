/** What coss.com meters: one meter per billable unit of a product. */

export const PRODUCTS = ["email", "sms", "video", "scheduling"] as const;
export type Product = (typeof PRODUCTS)[number];

export type MeterDefinition = {
  product: Product;
  label: string;
  /** Singular and plural unit names, e.g. "recipient" / "recipients". */
  unit: string;
  units: string;
  /** Prices are shown per this many units ("$0.40 per 1,000 recipients"). */
  displayPer: number;
  /** Dimensions usage is recorded with and rates can vary by, e.g. `country` for SMS. */
  dimensions: readonly string[];
  /** `commitment`: only usable under a contract with a commitment covering this meter. */
  requires: "plan" | "commitment";
};

export const METERS = {
  "email.recipients": {
    product: "email",
    label: "Email",
    unit: "recipient",
    units: "recipients",
    displayPer: 1000,
    dimensions: [],
    requires: "plan",
  },
  // Email sent through an organization's dedicated IPs (the Dedicated IPs add-on), on top of
  // `email.recipients`.
  "email.dedicated_ip": {
    product: "email",
    label: "Email via dedicated IPs",
    unit: "recipient",
    units: "recipients",
    displayPer: 1000,
    dimensions: [],
    requires: "plan",
  },
  // Priced by destination country; a country without a rate can't be sent to.
  "sms.segments": {
    product: "sms",
    label: "SMS",
    unit: "segment",
    units: "segments",
    displayPer: 1,
    dimensions: ["country"],
    requires: "plan",
  },
  // Replies and opt-outs received on an organization's numbers, by the number's country.
  "sms.received_segments": {
    product: "sms",
    label: "SMS received",
    unit: "segment",
    units: "segments",
    displayPer: 1,
    dimensions: ["country"],
    requires: "plan",
  },
  // Phone numbers, per month held (`type=local` or `type=toll_free`), passed through at cost.
  "sms.numbers": {
    product: "sms",
    label: "SMS phone numbers",
    unit: "number-month",
    units: "number-months",
    displayPer: 1,
    dimensions: ["type"],
    requires: "plan",
  },
  // Carrier registration fees (US A2P 10DLC brands and campaigns), passed through at cost.
  "sms.registrations": {
    product: "sms",
    label: "SMS registration fees",
    unit: "fee",
    units: "fees",
    displayPer: 1,
    dimensions: ["fee"],
    requires: "plan",
  },
  "video.participant_minutes": {
    product: "video",
    label: "Video",
    unit: "participant-minute",
    units: "participant-minutes",
    displayPer: 1000,
    dimensions: [],
    requires: "plan",
  },
  "scheduling.bookings": {
    product: "scheduling",
    label: "Scheduling",
    unit: "booking",
    units: "bookings",
    displayPer: 1,
    dimensions: [],
    requires: "plan",
  },
} as const satisfies Record<string, MeterDefinition>;

export type MeterKey = keyof typeof METERS;
export const METER_KEYS = Object.keys(METERS) as [MeterKey, ...MeterKey[]];

export function isMeterKey(value: string): value is MeterKey {
  return Object.hasOwn(METERS, value);
}

/**
 * The canonical form of a usage dimension: `""` for none, else sorted `name=value` pairs joined
 * by `&` (`country=US`). Rates and usage rows are keyed by it.
 */
export function dimensionKey(dimensions: Readonly<Record<string, string>> | undefined): string {
  if (!dimensions) return "";
  return Object.keys(dimensions)
    .sort()
    .map((name) => `${name}=${dimensions[name]}`)
    .join("&");
}

/** How dimension values other than country codes read on invoices and price lists. */
const DIMENSION_VALUE_LABELS: Readonly<Record<string, string>> = {
  local: "local",
  toll_free: "toll-free",
  brand: "brand registration",
  brand_vetting: "brand vetting",
  campaign_vetting: "campaign vetting",
  campaign_monthly: "campaign, monthly",
  campaign_monthly_low_volume: "low-volume campaign, monthly",
};

/** "country=US" → "US"; "type=toll_free" → "toll-free"; "" → "". */
export function formatDimension(key: string): string {
  return key
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const value = pair.slice(pair.indexOf("=") + 1);
      return DIMENSION_VALUE_LABELS[value] ?? value;
    })
    .join(", ");
}
