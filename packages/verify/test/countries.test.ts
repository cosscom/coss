import { describe, expect, test } from "bun:test";
import { dimensionKey, RATE_CARDS, rateFor } from "@coss/billing/catalog";
import { DEFAULT_VERIFY_SETTINGS } from "../src/schemas.ts";

describe("DEFAULT_VERIFY_SETTINGS", () => {
  // Shared-number codes are billed as `verify.sms` by country, and SMS refuses unpriced countries.
  test("every default country has a verify.sms price in the latest rate card", () => {
    const latest = RATE_CARDS.at(-1);
    const unpriced = DEFAULT_VERIFY_SETTINGS.allowedCountries.filter(
      (country) => !rateFor(latest?.rates["verify.sms"], dimensionKey({ country })),
    );
    expect(unpriced).toEqual([]);
  });
});
