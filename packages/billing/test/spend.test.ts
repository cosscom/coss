import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { spendBreakdown, sumSpend } from "../src/spend.ts";
import { createTestContract, recordTestUsage } from "../src/testing.ts";

const OCT_1 = new Date("2026-10-01T00:00:00Z");
const OCT_2 = new Date("2026-10-02T09:00:00Z");
const OCT_3 = new Date("2026-10-03T15:00:00Z");
const NOW = new Date("2026-10-15T00:00:00Z");

describe("spendBreakdown", () => {
  test("shares the month's usage charges by source; the parts add up to them", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    await createTestContract(organizationId, { version: 1, plan: "pro" }, { effectiveFrom: OCT_1 });
    const usage = (at: Date, quantity: number, source?: { apiKeyId?: string; userId?: string }) =>
      recordTestUsage({
        organizationId,
        environmentId: tenant.production.id,
        meter: "email.recipients",
        quantity,
        at,
        ...(source ? { source: { projectId: tenant.project.id, ...source } } : {}),
      });
    // Before attribution existed: the environment's, keyless.
    await usage(OCT_1, 20_000);
    await usage(OCT_2, 50_000, { apiKeyId: "key_org" });
    await usage(OCT_2, 25_000, { apiKeyId: "key_alice", userId: "user_alice" });
    await usage(OCT_3, 5_000, { apiKeyId: "key_alice", userId: "user_alice" });

    const spend = await spendBreakdown(organizationId, NOW);
    expect(spend.totalCents).toBe(spend.estimate.usageCents);
    expect(spend.totalCents).toBeGreaterThan(0n);

    const byUser = sumSpend(spend.lines, (line) => line.userId);
    const alice = byUser.get("user_alice");
    expect(alice?.quantities["email.recipients"]).toBe(30_000);
    // 30,000 of 100,000 recipients: 30% of the charge, give or take a cent of rounding.
    const share = Number(alice?.cents ?? 0n) / Number(spend.totalCents);
    expect(share).toBeCloseTo(0.3, 3);

    const byKey = sumSpend(spend.lines, (line) => line.apiKeyId);
    expect(byKey.get("key_org")?.quantities["email.recipients"]).toBe(50_000);
    expect(byKey.get("")?.quantities["email.recipients"]).toBe(20_000);

    // Every source has its project, also usage that predates attribution.
    const byProject = sumSpend(spend.lines, (line) => line.projectId);
    expect([...byProject.keys()]).toEqual([tenant.project.id]);

    const byDay = sumSpend(spend.lines, (line) => line.day?.toISOString() ?? "");
    expect(byDay.get("2026-10-02T00:00:00.000Z")?.quantities["email.recipients"]).toBe(75_000);
  });

  test("Free usage within the allowance costs nothing, wherever it came from", async () => {
    const tenant = await createTestTenant();
    await recordTestUsage({
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 100,
      at: OCT_2,
      source: { projectId: tenant.project.id, apiKeyId: "key_a", userId: "user_a" },
    });
    const spend = await spendBreakdown(tenant.organization.id, NOW);
    expect(spend.totalCents).toBe(0n);
    expect(spend.lines).toHaveLength(1);
    expect(spend.lines[0]).toMatchObject({ userId: "user_a", quantity: 100, cents: 0n });
  });
});
