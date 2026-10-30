import { describe, expect, test } from "bun:test";
import { PLAN_KEYS } from "@coss/billing/catalog";
import { renderBillingComponents } from "../src/lib/billing-text";

describe("renderBillingComponents", () => {
  test("renders the plans and the usage rates from the catalog", () => {
    const text = renderBillingComponents("<PlanTable />\n\n<UsageRates />");
    expect(text).toContain(
      "| Price | Free | $25/month | $250/month | From $2,000/month, annual commitment |",
    );
    expect(text).toContain(
      "| Sending rate | 2 emails a second, 3,000 a day | 14 emails a second, 100,000 a day | 50 emails a second, 1,000,000 a day | Custom |",
    );
    expect(text).toContain(
      "| Marketing rate | 2 marketing emails a second | 10 marketing emails a second | 50 marketing emails a second | Custom |",
    );
    expect(text).toContain(
      "| Email | $0.40 per 1,000 recipients for the first 1,000,000; $0.30 per 1,000 recipients from 1,000,001 to 10,000,000; $0.22 per 1,000 recipients beyond 10,000,000 | |",
    );
    expect(text).toContain("| SMS (US) | $0.0135 per segment | |");
    expect(text).toContain(
      "| SMS (other countries) | $0.0208 to $0.1134 per segment | By country: coss.com/pricing#sms |",
    );
    expect(text).toContain("| SMS received (US) | $0.0104 per segment | |");
    expect(text).toContain("| SMS phone numbers (toll-free) | $2.15 per number-month | |");
    expect(text).toContain(
      "| SMS registration fees (campaign vetting) | $15.00 | Passed through at cost |",
    );
    expect(text).toContain(
      "| SMS rate | Sandbox only | 10 SMS segments a second, 10,000 a day | 30 SMS segments a second, 100,000 a day | Custom |",
    );
    expect(text).toContain("| Video | $1.50 per 1,000 participant-minutes | |");
    expect(text).toContain("| Scheduling | $0.10 per booking | |");
    expect(text.split("\n")[0]?.split("|").length).toBe(PLAN_KEYS.length + 3);
  });

  test("renders add-ons, and where a plan can have one", () => {
    const text = renderBillingComponents("<PlanTable />\n\n<UsageRates />\n\n<AddOns />");
    expect(text).toContain("| Dedicated IPs | — | — | Add-on | Add-on |");
    expect(text).toContain("| Dedicated IPs | $50/month | Scale, Enterprise |");
    expect(text).toContain(
      "| Email via dedicated IPs | $0.10 per 1,000 recipients | With the Dedicated IPs add-on, on top of Email |",
    );
  });

  test("renders one product's rates", () => {
    const text = renderBillingComponents('<UsageRates product="sms" />');
    expect(text).toContain("| SMS (US) | $0.0135 per segment | |");
    expect(text).toContain("| SMS phone numbers (toll-free) | $2.15 per number-month | |");
    expect(text).not.toContain("| Email |");
    expect(text).not.toContain("<UsageRates");
  });
});
