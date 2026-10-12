import { expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { billingObject } from "../src/api.ts";
import { createCreditGrant } from "../src/grants.ts";
import { createTestContract, recordTestUsage } from "../src/testing.ts";

for (const quantity of [0, 100_000]) {
  for (const credit of [0, 500, 10_000]) {
    test(`estimate includes discounted arrears fees with ${quantity} recipients and ${credit} cents credit`, async () => {
      const tenant = await createTestTenant();
      const organizationId = tenant.organization.id;
      const start = new Date("2026-10-01T00:00:00Z");
      await createTestContract(
        organizationId,
        {
          version: 1,
          plan: "pro",
          fee: { amountCents: "2500", interval: "month", timing: "arrears" },
          discounts: [{ scope: "fees", percent: 50 }],
        },
        { effectiveFrom: start, kind: "sales" },
      );
      if (quantity) {
        await recordTestUsage({
          organizationId,
          environmentId: tenant.production.id,
          meter: "email.recipients",
          quantity,
          at: start,
        });
      }
      if (credit) {
        await createCreditGrant({
          grant: {
            organizationId,
            kind: "amount",
            amount: BigInt(credit),
            appliesTo: "any",
            source: "sla",
            description: "Service credit",
            effectiveAt: start,
            expiresAt: null,
          },
          actor: { userId: tenant.owner.id, email: tenant.owner.email },
          reason: "Service credit",
        });
      }
      const billing = await billingObject(organizationId, new Date("2026-10-15T00:00:00Z"));
      const usage = quantity ? 4_000 : 0;
      const applied = Math.min(credit, usage + 1_250);
      expect(billing.estimate).toEqual({
        usage,
        discount: 1_250,
        credit: applied,
        total: usage + 1_250 - applied,
      });
      expect(billing.credit_remaining).toBe(credit - applied);
    });
  }
}
