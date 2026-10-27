import { describe, expect, test } from "bun:test";
import { filterCategories, groupEventTypes } from "../src/lib/event-categories";

const TYPES = [
  "email.sent",
  "email.bounced",
  "domain.dmarc_report_received",
  "sms.sent",
  "risk.assessment.review",
  "ping",
];

describe("groupEventTypes", () => {
  test("groups by the prefix before the first dot, in list order", () => {
    expect(groupEventTypes(TYPES, { email: "Email", sms: "SMS" })).toEqual([
      { key: "email", label: "Email", types: ["email.sent", "email.bounced"] },
      { key: "domain", label: "domain", types: ["domain.dmarc_report_received"] },
      { key: "sms", label: "SMS", types: ["sms.sent"] },
      { key: "risk", label: "risk", types: ["risk.assessment.review"] },
      { key: "", label: "Other", types: ["ping"] },
    ]);
  });

  test("prefixes named like Object properties keep their own names", () => {
    const categories = groupEventTypes(["constructor.created", "toString.sent"], {
      email: "Email",
    });
    expect(categories.map((category) => category.label)).toEqual(["constructor", "toString"]);
    expect(filterCategories(categories, "created")[0]?.types).toEqual(["constructor.created"]);
  });
});

describe("filterCategories", () => {
  const categories = groupEventTypes(TYPES, { email: "Email", sms: "SMS" });

  test("an empty query keeps everything", () => {
    expect(filterCategories(categories, "  ")).toBe(categories);
  });

  test("matches type names case-insensitively", () => {
    expect(filterCategories(categories, "SENT")).toEqual([
      { key: "email", label: "Email", types: ["email.sent"] },
      { key: "sms", label: "SMS", types: ["sms.sent"] },
    ]);
  });

  test("a matching category name keeps all of its types", () => {
    expect(filterCategories(categories, "sms")).toEqual([
      { key: "sms", label: "SMS", types: ["sms.sent"] },
    ]);
    expect(filterCategories(categories, "email")[0]?.types).toEqual([
      "email.sent",
      "email.bounced",
    ]);
  });

  test("no match leaves nothing", () => {
    expect(filterCategories(categories, "nope")).toEqual([]);
  });
});
