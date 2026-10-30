import { describe, expect, test } from "bun:test";
import { dimensionKey, RATE_CARDS, rateFor } from "@coss/billing/catalog";
import { DEFAULT_SMS_COUNTRIES } from "../src/countries.ts";

describe("DEFAULT_SMS_COUNTRIES", () => {
  // Unpriced countries can't be sent to (the usage gate refuses them) and don't show on the
  // dashboard's countries card, so a default without a price is a default nobody can use.
  test("every default country has a price in the latest rate card", () => {
    const latest = RATE_CARDS.at(-1);
    const unpriced = DEFAULT_SMS_COUNTRIES.filter(
      (country) => !rateFor(latest?.rates["sms.segments"], dimensionKey({ country })),
    );
    expect(unpriced).toEqual([]);
  });
});
