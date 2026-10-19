/** Phone numbers: validation and the country a number belongs to (what SMS is priced by). */
import { parsePhoneNumberFromString } from "libphonenumber-js";

/** `+` and 7 to 15 digits, the first not 0: the only form the API accepts. */
export const E164 = /^\+[1-9]\d{6,14}$/;

/**
 * The mailbox simulator's numbers (`+1 500 555 0xxx`, the fake provider's, see
 * `providers/fake.ts`): never a real subscriber, always priced as the United States.
 */
export const SIMULATOR_PREFIX = "+1500555";

export function isSimulatorNumber(phoneNumber: string): boolean {
  return phoneNumber.startsWith(SIMULATOR_PREFIX);
}

export type ParsedPhoneNumber = { phoneNumber: string; country: string };

/** The E.164 number and its ISO 3166 country, or `null` when it isn't a valid number. */
export function parsePhoneNumber(value: string): ParsedPhoneNumber | null {
  if (!E164.test(value)) return null;
  if (isSimulatorNumber(value)) return { phoneNumber: value, country: "US" };
  const parsed = parsePhoneNumberFromString(value);
  if (!parsed?.isValid() || !parsed.country) return null;
  return { phoneNumber: parsed.number, country: parsed.country };
}
