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
  /**
   * `commitment`: only usable under a contract with a commitment covering this meter (US SMS is
   * sold as committed volume, through Enterprise contracts only).
   */
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
  "sms.segments": {
    product: "sms",
    label: "SMS",
    unit: "segment",
    units: "segments",
    displayPer: 1,
    dimensions: ["country"],
    requires: "commitment",
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

/** "country=US" → "US"; "" → "". */
export function formatDimension(key: string): string {
  return key
    .split("&")
    .filter(Boolean)
    .map((pair) => pair.slice(pair.indexOf("=") + 1))
    .join(", ");
}
