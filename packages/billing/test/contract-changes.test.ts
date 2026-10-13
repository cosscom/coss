import { expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  createContract,
  endContract,
  runContractRenewals,
  scheduleDowngrade,
  startUpgrade,
} from "../src/changes.ts";
import { contractAt, getContract, listContracts } from "../src/contracts.ts";
import { createTestContract } from "../src/testing.ts";

const at = (iso: string) => new Date(iso);
const now = at("2026-11-10T12:00:00Z");

async function scheduleSalesContract(
  organizationId: string,
  actor: { userId: string; email: string },
) {
  const { contract } = await createContract({
    contract: {
      organizationId,
      kind: "sales",
      terms: {
        version: 1,
        plan: "enterprise",
        fee: { amountCents: "200000", interval: "month", timing: "advance" },
      },
      effectiveFrom: at("2026-12-01T00:00:00Z"),
    },
    defaultProvider: "fake",
    actor,
    reason: "Enterprise deal",
    now,
  });
  return contract;
}

test("self-serve plan changes are refused while a sales contract is scheduled, which stays", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const actor = { userId: tenant.owner.id, email: tenant.owner.email };
  await createTestContract(
    org,
    { version: 1, plan: "pro" },
    { effectiveFrom: at("2026-10-01T00:00:00Z") },
  );
  const sales = await scheduleSalesContract(org, actor);

  await expect(
    startUpgrade({
      organizationId: org,
      plan: "scale",
      userId: actor.userId,
      defaultProvider: "fake",
      now,
    }),
  ).rejects.toThrow("account manager");
  // Canceling to Free would end the Pro contract and cancel what is scheduled after it.
  await expect(
    scheduleDowngrade({
      organizationId: org,
      plan: "free",
      defaultProvider: "fake",
      preflight: async () => [],
      userId: actor.userId,
      now,
    }),
  ).rejects.toThrow("account manager");
  expect((await getContract(org, sales.id))?.status).toBe("confirmed");
  expect((await contractAt(org, at("2026-12-02T00:00:00Z")))?.id).toBe(sales.id);
});

test("an upgrade from Free is refused while a sales contract is scheduled", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const actor = { userId: tenant.owner.id, email: tenant.owner.email };
  const sales = await scheduleSalesContract(org, actor);
  await expect(
    startUpgrade({
      organizationId: org,
      plan: "pro",
      userId: actor.userId,
      defaultProvider: "fake",
      now,
    }),
  ).rejects.toThrow("account manager");
  expect((await getContract(org, sales.id))?.status).toBe("confirmed");
});

test("a self-serve contract set by support ends where a scheduled sales contract starts", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const actor = { userId: tenant.owner.id, email: tenant.owner.email };
  const sales = await scheduleSalesContract(org, actor);
  const { contract: pro } = await createContract({
    contract: {
      organizationId: org,
      kind: "self_serve",
      terms: { version: 1, plan: "pro" },
      effectiveFrom: null,
    },
    defaultProvider: "fake",
    actor,
    reason: "Support set the plan",
    now,
  });
  expect((await getContract(org, sales.id))?.status).toBe("confirmed");
  expect((await getContract(org, pro.id))?.effectiveUntil).toEqual(sales.effectiveFrom);
  expect((await contractAt(org, at("2026-11-20T00:00:00Z")))?.id).toBe(pro.id);
  expect((await contractAt(org, at("2026-12-02T00:00:00Z")))?.id).toBe(sales.id);
});

test("ending an auto-renewing contract cancels its scheduled renewal", async () => {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const actor = { userId: tenant.owner.id, email: tenant.owner.email };
  const { contract } = await createContract({
    contract: {
      organizationId: org,
      kind: "sales",
      terms: { version: 1, plan: "enterprise" },
      effectiveFrom: at("2026-11-01T00:00:00Z"),
      termEnd: at("2026-12-01T00:00:00Z"),
      autoRenew: true,
    },
    defaultProvider: "fake",
    actor,
    reason: "Monthly deal",
    now: at("2026-11-01T00:10:00Z"),
  });
  expect(
    await runContractRenewals({
      now: at("2026-11-25T00:00:00Z"),
      scope: { organizationIds: [org] },
    }),
  ).toBe(1);
  const renewal = (await listContracts(org)).find((c) => c.supersedesId === contract.id);
  expect(renewal?.status).toBe("confirmed");

  await endContract({
    organizationId: org,
    contractId: contract.id,
    at: null,
    defaultProvider: "fake",
    actor,
    reason: "Customer churned",
    now: at("2026-11-26T09:30:00Z"),
  });
  expect((await getContract(org, renewal?.id ?? ""))?.status).toBe("canceled");
  expect(await contractAt(org, at("2026-12-02T00:00:00Z"))).toBeNull();
});
