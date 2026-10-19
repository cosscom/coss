/**
 * The SMS simulator: numbers whose outcome is known in advance in sandbox environments (coss.com's
 * fake SMS provider), never added to the suppression list. `coss sms send --simulate` sends to
 * them.
 *
 * Must match `SMS_SIMULATOR` in `packages/sms/src/schemas.ts` (the CLI can't import workspace
 * packages): change both together.
 */
export const SIMULATED_SMS_OUTCOMES = {
  /** Delivered. */
  delivered: "+15005550006",
  /** Failed: `invalid_number`. */
  invalid: "+15005550001",
  /** Undelivered: `carrier_filtered`. */
  filtered: "+15005550004",
  /** Failed: `opted_out`. */
  "opted-out": "+15005550009",
  /** Delivered, then a simulated reply arrives in the environment's received messages. */
  reply: "+15005550008",
} as const;

export type SimulatedSmsOutcome = keyof typeof SIMULATED_SMS_OUTCOMES;

export function isSimulatedSmsOutcome(value: string): value is SimulatedSmsOutcome {
  return Object.hasOwn(SIMULATED_SMS_OUTCOMES, value);
}
