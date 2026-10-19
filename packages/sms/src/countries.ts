/**
 * Destination countries. Every organization starts with the US and Canada; owners and admins
 * allow others. Some are where SMS pumping (traffic inflated to collect termination fees) mostly
 * ends up: those need a platform admin to unlock them first. Client-safe, no imports.
 */

export const DEFAULT_SMS_COUNTRIES: readonly string[] = ["US", "CA"];

/** Hand-kept list of frequent SMS pumping destinations (ISO 3166). */
export const HIGH_RISK_SMS_COUNTRIES: readonly string[] = [
  "AZ",
  "BD",
  "BY",
  "GN",
  "ID",
  "IQ",
  "KG",
  "KH",
  "LA",
  "LK",
  "MM",
  "NG",
  "PK",
  "TJ",
  "TM",
  "UZ",
  "VN",
];

/** Toll-free numbers can only send to these. */
export const TOLL_FREE_SMS_COUNTRIES: readonly string[] = ["US", "CA"];

export function isHighRiskSmsCountry(country: string): boolean {
  return HIGH_RISK_SMS_COUNTRIES.includes(country);
}
