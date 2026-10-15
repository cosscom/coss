import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { recordTestUsage } from "../src/testing.ts";
import { platformUsageByDay } from "../src/usage.ts";

describe("platformUsageByDay", () => {
  test("sums one meter per UTC day across organizations, one organization's apart", async () => {
    const customer = await createTestTenant();
    const other = await createTestTenant();
    const coss = await createTestTenant();
    const day1 = new Date("2026-03-02T10:00:00Z");
    const day2 = new Date("2026-03-03T23:00:00Z");
    for (const [tenant, quantity, at] of [
      [customer, 5, day1],
      [other, 7, day1],
      [coss, 3, day1],
      [customer, 2, day2],
    ] as const) {
      await recordTestUsage({
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
        meter: "email.recipients",
        quantity,
        at,
      });
    }
    await recordTestUsage({
      organizationId: customer.organization.id,
      environmentId: customer.production.id,
      meter: "sms.segments",
      quantity: 100,
      at: day1,
    });
    const scope = {
      organizationIds: [customer.organization.id, other.organization.id, coss.organization.id],
    };
    const interval = {
      start: new Date("2026-03-01T00:00:00Z"),
      end: new Date("2026-04-01T00:00:00Z"),
    };

    expect(
      await platformUsageByDay({
        meter: "email.recipients",
        interval,
        apartFrom: coss.organization.id,
        scope,
      }),
    ).toEqual([
      { day: new Date("2026-03-02T00:00:00Z"), apart: false, quantity: 12 },
      { day: new Date("2026-03-02T00:00:00Z"), apart: true, quantity: 3 },
      { day: new Date("2026-03-03T00:00:00Z"), apart: false, quantity: 2 },
    ]);
    expect(await platformUsageByDay({ meter: "email.recipients", interval, scope })).toEqual([
      { day: new Date("2026-03-02T00:00:00Z"), apart: false, quantity: 15 },
      { day: new Date("2026-03-03T00:00:00Z"), apart: false, quantity: 2 },
    ]);
  });
});
