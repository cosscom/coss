import { describe, expect, test } from "bun:test";
import { withPlanRules } from "../src/overrides.ts";

describe("withPlanRules", () => {
  test("plan rules set overridable buckets; admin overrides win; failures fall back", async () => {
    const plan = { limit: 2, periodMs: 1000, burst: 50 };
    const admin = { limit: 500, periodMs: 86_400_000 };
    const source = withPlanRules(
      async () => ({
        "email.recipients.second": plan,
        "email.recipients.day": { limit: 3000, periodMs: 86_400_000 },
        "not.a.bucket": plan,
      }),
      async () => ({ "email.recipients.day": admin }),
    );
    expect(await source("org_1")).toEqual({
      "email.recipients.second": plan,
      "email.recipients.day": admin,
    });
    const failing = withPlanRules(
      async () => {
        throw new Error("database down");
      },
      async () => ({}),
    );
    expect(await failing("org_1")).toEqual({});
  });
});
