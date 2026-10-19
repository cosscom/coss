import { describe, expect, test } from "bun:test";
import { addMember, createTestTenant, createTestUser } from "@coss/tenancy/testing";
import { checkOrganizationSpend } from "../src/alerts.ts";
import {
  type Budget,
  deleteBudget,
  evaluateBudgets,
  listBudgetHolds,
  listBudgets,
  normalizeThresholds,
  overBudget,
  setBudget,
} from "../src/budgets.ts";
import { BillingError } from "../src/errors.ts";
import { budgetHoldFor } from "../src/metering.ts";
import { listBillingNotifications } from "../src/notifications.ts";
import type { SpendLine } from "../src/spend.ts";
import { createTestContract, recordTestUsage } from "../src/testing.ts";

const OCT_1 = new Date("2026-10-01T00:00:00Z");
const OCT_2 = new Date("2026-10-02T09:00:00Z");
const OCT_15 = new Date("2026-10-15T00:00:00Z");
const NOV_2 = new Date("2026-11-02T00:00:00Z");

async function expectBillingError(promise: Promise<unknown>, code: BillingError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(BillingError);
  expect((error as BillingError).code).toBe(code);
}

function budget(overrides: Partial<Budget>): Budget {
  return {
    id: "bbud_1",
    organizationId: "org_1",
    scope: "member_default",
    userId: null,
    projectId: null,
    apiKeyId: null,
    amountCents: 1000n,
    alertThresholds: [80, 100],
    createdByUserId: null,
    createdAt: OCT_1,
    updatedAt: OCT_1,
    ...overrides,
  };
}

function line(source: Partial<SpendLine>, cents: bigint): SpendLine {
  return {
    projectId: "proj_1",
    environmentId: "env_1",
    apiKeyId: "",
    userId: "",
    day: OCT_2,
    meter: "email.recipients",
    dimension: "",
    quantity: 1,
    cents,
    ...source,
  };
}

describe("evaluateBudgets", () => {
  test("members get their own budget, else the default; exempt members have none", () => {
    const statuses = evaluateBudgets(
      [
        budget({ id: "default", amountCents: 1000n }),
        budget({ id: "ada", scope: "user", userId: "ada", amountCents: 5000n }),
        budget({ id: "bob", scope: "user", userId: "bob", amountCents: null }),
        budget({ id: "proj", scope: "project", projectId: "proj_1", amountCents: 100n }),
        budget({ id: "key", scope: "api_key", apiKeyId: "key_1", amountCents: 0n }),
      ],
      [
        line({ userId: "ada", apiKeyId: "key_ada" }, 2000n),
        line({ userId: "bob", apiKeyId: "key_bob" }, 2000n),
        line({ userId: "cy", apiKeyId: "key_cy" }, 2000n),
        line({ apiKeyId: "key_1" }, 1n),
      ],
    );
    const of = (scope: string, id: string) =>
      statuses.find((status) => status.scope === scope && status.targetId === id);
    expect(of("user", "ada")).toMatchObject({ amountCents: 5000n, spentCents: 2000n });
    expect(of("user", "bob")).toMatchObject({ amountCents: null, fromDefault: false });
    expect(of("user", "cy")).toMatchObject({ amountCents: 1000n, fromDefault: true });
    expect(overBudget(of("user", "cy") ?? { amountCents: null, spentCents: 0n })).toBe(true);
    expect(of("project", "proj_1")).toMatchObject({ spentCents: 6001n });
    // A $0 budget allows nothing billable.
    expect(of("api_key", "key_1")).toMatchObject({ amountCents: 0n, spentCents: 1n });
    expect(statuses.filter((status) => status.scope === "user")).toHaveLength(3);
  });

  test("thresholds are whole percentages, deduplicated and sorted", () => {
    expect(normalizeThresholds([100, 50, 50])).toEqual([50, 100]);
    expect(() => normalizeThresholds([0])).toThrow(BillingError);
    expect(() => normalizeThresholds([10, 20, 30, 40, 50, 60])).toThrow(BillingError);
  });
});

describe("budgets", () => {
  test("targets must belong to the organization; amounts are required but for members", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const organizationId = tenant.organization.id;
    const set = (input: Partial<Parameters<typeof setBudget>[0]>) =>
      setBudget({
        organizationId,
        scope: "member_default",
        targetId: null,
        amountCents: 1000n,
        actorUserId: tenant.owner.id,
        ...input,
      });
    await expectBillingError(set({ targetId: tenant.owner.id }), "invalid_change");
    await expectBillingError(set({ amountCents: null }), "invalid_change");
    await expectBillingError(set({ amountCents: -1n }), "invalid_change");
    await expectBillingError(set({ scope: "user", targetId: other.owner.id }), "not_found");
    await expectBillingError(set({ scope: "project", targetId: other.project.id }), "not_found");

    const first = await set({});
    const second = await set({ amountCents: 2500n, alertThresholds: [50] });
    expect(second.previous?.id).toBe(first.budget.id);
    expect(second.budget).toMatchObject({ amountCents: 2500n, alertThresholds: [50] });
    const exempt = await set({ scope: "user", targetId: tenant.owner.id, amountCents: null });
    expect(exempt.budget).toMatchObject({ scope: "user", userId: tenant.owner.id });
  });

  test("a member over budget is paused, told, and lifted by a higher budget or a new month", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const dev = await createTestUser();
    await addMember({ organizationId, userId: dev.id, role: "member" });
    await createTestContract(organizationId, { version: 1, plan: "pro" }, { effectiveFrom: OCT_1 });
    const usage = (quantity: number, userId: string | null, at = OCT_2) =>
      recordTestUsage({
        organizationId,
        environmentId: tenant.production.id,
        meter: "email.recipients",
        quantity,
        at,
        source: { projectId: tenant.project.id, apiKeyId: `key_${userId ?? "org"}`, userId },
      });
    // Shared org usage, and the member's experiments.
    await usage(100_000, null);
    await usage(50_000, dev.id);
    const { budget: memberDefault } = await setBudget({
      organizationId,
      scope: "member_default",
      targetId: null,
      amountCents: 500n,
      actorUserId: tenant.owner.id,
    });

    await checkOrganizationSpend(organizationId, OCT_15);
    const holds = await listBudgetHolds(organizationId);
    expect(holds).toEqual([
      expect.objectContaining({ scope: "user", targetId: dev.id, limitCents: 500n }),
    ]);
    expect(
      await budgetHoldFor({ organizationId, projectId: tenant.project.id, userId: dev.id }),
    ).toBe("user");
    // The organization's own keys aren't paused by a member's budget.
    expect(
      await budgetHoldFor({ organizationId, projectId: tenant.project.id, apiKeyId: "key_org" }),
    ).toBeNull();
    const notifications = await listBillingNotifications(organizationId);
    expect(notifications.map((row) => [row.kind, row.userId])).toEqual([
      ["budget_threshold", dev.id],
      ["budget_paused", dev.id],
    ]);

    // Checked again: nothing new.
    await checkOrganizationSpend(organizationId, OCT_15);
    expect(await listBillingNotifications(organizationId)).toHaveLength(2);

    // A budget of their own, above what they spent, lifts it at once.
    await setBudget({
      organizationId,
      scope: "user",
      targetId: dev.id,
      amountCents: 1_000_000n,
      actorUserId: tenant.owner.id,
    });
    await checkOrganizationSpend(organizationId, OCT_15);
    expect(await listBudgetHolds(organizationId)).toEqual([]);

    // Back on the default, paused again; the next month starts from nothing.
    await setBudget({
      organizationId,
      scope: "user",
      targetId: dev.id,
      amountCents: 500n,
      actorUserId: tenant.owner.id,
    });
    await checkOrganizationSpend(organizationId, OCT_15);
    expect(await listBudgetHolds(organizationId)).toHaveLength(1);
    await checkOrganizationSpend(organizationId, NOV_2);
    expect(await listBudgetHolds(organizationId)).toEqual([]);
    expect(memberDefault.scope).toBe("member_default");
  });

  test("project and key budgets; a deleted budget's hold is lifted", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    await createTestContract(organizationId, { version: 1, plan: "pro" }, { effectiveFrom: OCT_1 });
    await recordTestUsage({
      organizationId,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 100_000,
      at: OCT_2,
      source: { projectId: tenant.project.id, apiKeyId: "key_staging" },
    });
    await setBudget({
      organizationId,
      scope: "project",
      targetId: tenant.project.id,
      amountCents: 100n,
      actorUserId: tenant.owner.id,
    });
    await checkOrganizationSpend(organizationId, OCT_15);
    expect(await budgetHoldFor({ organizationId, projectId: tenant.project.id })).toBe("project");

    const [projectBudget] = await listBudgets(organizationId);
    await deleteBudget({ organizationId, budgetId: projectBudget?.id ?? "" });
    await checkOrganizationSpend(organizationId, OCT_15);
    expect(await listBudgetHolds(organizationId)).toEqual([]);
  });
});
