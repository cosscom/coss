import { describe, expect, test } from "bun:test";
import { PLAN_KEYS } from "@coss/billing/catalog";
import { renderBillingComponents } from "../src/lib/billing-text";

describe("renderBillingComponents", () => {
  test("renders the plans and the usage rates from the catalog", () => {
    const text = renderBillingComponents("<PlanTable />\n\n<UsageRates />");
    expect(text).toContain(
      "| Price | Free | $25.00/month | $250.00/month | From $2,000.00/month, annual commitment |",
    );
    expect(text).toContain(
      "| Email | $0.40 per 1,000 recipients for the first 1,000,000; $0.30 per 1,000 recipients from 1,000,001 to 10,000,000; $0.22 per 1,000 recipients beyond 10,000,000 | |",
    );
    expect(text).toContain(
      "| SMS (US) | $0.0135 per segment | Committed volume, Enterprise only |",
    );
    expect(text).toContain("| Video | $1.50 per 1,000 participant-minutes | |");
    expect(text).toContain("| Scheduling | $0.10 per booking | |");
    expect(text.split("\n")[0]?.split("|").length).toBe(PLAN_KEYS.length + 3);
  });
});
