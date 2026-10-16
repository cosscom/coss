import { describe, expect, test } from "bun:test";
import { db } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  cancelScheduledChange,
  createContract,
  scheduleAddOnRemoval,
  scheduleDowngrade,
  startAddOn,
  startUpgrade,
} from "../src/changes.ts";
import { organizationsBuyingAddOn, organizationsEntitledTo } from "../src/enforcement.ts";
import { invoiceLines } from "../src/invoices.ts";
import { runDueBillingPeriods } from "../src/periods.ts";
import { billingStateAt } from "../src/resolve.ts";
import { collectInvoiceNow } from "../src/sync.ts";
import { createTestContract, testBillingProviders } from "../src/testing.ts";
import { composeChange } from "../src/upgrades.ts";

const at = (iso: string) => new Date(iso);
const noBlockers = async () => [];

/** A tenant on Scale since `start`, its first invoice paid. */
async function onScale(start: Date) {
  const tenant = await createTestTenant();
  const org = tenant.organization.id;
  const deps = testBillingProviders();
  const syncDeps = { providers: deps.providers, dashboardUrl: "https://coss.test" };
  const { invoice } = await startUpgrade({
    organizationId: org,
    plan: "scale",
    userId: tenant.owner.id,
    defaultProvider: "fake",
    now: start,
  });
  await collectInvoiceNow(invoice?.id ?? "", syncDeps, start);
  return { tenant, org, deps, syncDeps, scope: { organizationIds: [org] } };
}

describe("self-serve add-ons", () => {
  test("adding Dedicated IPs charges only the add-on, and grants the feature once paid", async () => {
    const f = await onScale(at("2026-10-01T00:00:00Z"));
    const now = at("2026-10-12T09:30:00Z");
    const { contract, invoice } = await startAddOn({
      organizationId: f.org,
      key: "dedicated_ips",
      userId: f.tenant.owner.id,
      defaultProvider: "fake",
      preflight: noBlockers,
      now,
    });
    expect(contract.status).toBe("pending");
    // The Scale fee was paid for October: it carries over. 19 days 15 hours of 31 days of $50.
    const lines = await invoiceLines(invoice?.id ?? "");
    expect(lines.map((line) => [line.kind, line.amountCents])).toEqual([["add_on", 3_165n]]);
    expect(await organizationsBuyingAddOn("dedicated_ips", now)).toContain(f.org);
    expect(await organizationsEntitledTo("dedicatedIps", { now, scope: f.scope })).toEqual([]);

    await collectInvoiceNow(invoice?.id ?? "", f.syncDeps, now);
    const state = await billingStateAt(f.org, now);
    expect(state.terms.plan).toBe("scale");
    expect(state.terms.addOns.map((addOn) => addOn.key)).toEqual(["dedicated_ips"]);
    expect(state.terms.entitlements.features.dedicatedIps).toBe(true);
    expect(await organizationsEntitledTo("dedicatedIps", { now, scope: f.scope })).toEqual([f.org]);
    expect(await organizationsBuyingAddOn("dedicated_ips", now)).not.toContain(f.org);

    await expect(
      startAddOn({
        organizationId: f.org,
        key: "dedicated_ips",
        userId: f.tenant.owner.id,
        defaultProvider: "fake",
        preflight: noBlockers,
        now,
      }),
    ).rejects.toThrow("already have");
  });

  test("a later change in the month still sees the fee paid before the add-on", async () => {
    const f = await onScale(at("2026-10-01T00:00:00Z"));
    const bought = at("2026-10-12T09:30:00Z");
    const { contract, invoice } = await startAddOn({
      organizationId: f.org,
      key: "dedicated_ips",
      userId: f.tenant.owner.id,
      defaultProvider: "fake",
      preflight: noBlockers,
      now: bought,
    });
    await collectInvoiceNow(invoice?.id ?? "", f.syncDeps, bought);
    const withAddOn = (await billingStateAt(f.org, bought)).contract;
    expect(withAddOn?.id).toBe(contract.id);
    if (!withAddOn) throw new Error("no contract");

    // The add-on contract was never charged the Scale fee under its own key (it carried the
    // October fee over): an unchanged successor costs nothing, and a costlier one is credited
    // the unused Scale fee rather than charged it again.
    const later = at("2026-10-20T00:00:00Z");
    const same = {
      ...withAddOn,
      id: "bcon_test_same",
      effectiveFrom: later,
      supersedesId: withAddOn.id,
    };
    const unchanged = await db.transaction((tx) => composeChange(tx, withAddOn, same, later));
    expect(unchanged.lines).toEqual([]);

    const pricier = {
      ...same,
      id: "bcon_test_pricier",
      terms: {
        ...withAddOn.terms,
        fee: { amountCents: 100_000n, interval: "month" as const, timing: "advance" as const },
      },
    };
    const raised = await db.transaction((tx) => composeChange(tx, withAddOn, pricier, later));
    expect(raised.lines.map((line) => line.kind).sort()).toEqual(["plan_fee", "proration"]);
    expect(raised.lines.find((line) => line.kind === "proration")?.chargeKey).toStartWith(
      `unused:${withAddOn.id}:`,
    );
  });

  test("a change in the month's first hour carries the fee the month close charged", async () => {
    const f = await onScale(at("2026-09-10T00:00:00Z"));
    // October's Scale fee is charged by September's close, before the add-on is bought.
    await runDueBillingPeriods({ now: at("2026-10-01T00:20:00Z"), scope: f.scope });
    const bought = at("2026-10-01T00:40:00Z");
    const { contract, invoice } = await startAddOn({
      organizationId: f.org,
      key: "dedicated_ips",
      userId: f.tenant.owner.id,
      defaultProvider: "fake",
      preflight: noBlockers,
      now: bought,
    });
    expect(contract.effectiveFrom).toEqual(at("2026-10-01T00:00:00Z"));
    expect((await invoiceLines(invoice?.id ?? "")).map((line) => line.kind)).toEqual(["add_on"]);
    await collectInvoiceNow(invoice?.id ?? "", f.syncDeps, bought);
    const withAddOn = (await billingStateAt(f.org, bought)).contract;
    if (!withAddOn) throw new Error("no contract");

    const later = at("2026-10-20T00:00:00Z");
    const same = {
      ...withAddOn,
      id: "bcon_test_same",
      effectiveFrom: later,
      supersedesId: withAddOn.id,
    };
    const unchanged = await db.transaction((tx) => composeChange(tx, withAddOn, same, later));
    expect(unchanged.lines).toEqual([]);
  });

  test("refused on Pro, and when the preflight refuses", async () => {
    const tenant = await createTestTenant();
    const now = at("2026-10-12T09:30:00Z");
    await createTestContract(
      tenant.organization.id,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-10-01T00:00:00Z") },
    );
    const input = {
      organizationId: tenant.organization.id,
      key: "dedicated_ips" as const,
      userId: tenant.owner.id,
      defaultProvider: "fake" as const,
      preflight: noBlockers,
      now,
    };
    await expect(startAddOn(input)).rejects.toThrow("Scale and Enterprise");

    const f = await onScale(at("2026-10-01T00:00:00Z"));
    await expect(
      startAddOn({
        ...input,
        organizationId: f.org,
        preflight: async () => ["Fully booked."],
      }),
    ).rejects.toThrow("Fully booked.");
  });

  test("removal waits for the month's end and can be undone; a downgrade needs it first", async () => {
    const f = await onScale(at("2026-10-01T00:00:00Z"));
    const now = at("2026-10-12T09:30:00Z");
    const { invoice } = await startAddOn({
      organizationId: f.org,
      key: "dedicated_ips",
      userId: f.tenant.owner.id,
      defaultProvider: "fake",
      preflight: noBlockers,
      now,
    });
    await collectInvoiceNow(invoice?.id ?? "", f.syncDeps, now);

    const downgrade = {
      organizationId: f.org,
      plan: "pro" as const,
      defaultProvider: "fake" as const,
      preflight: noBlockers,
      userId: f.tenant.owner.id,
      now,
    };
    await expect(scheduleDowngrade(downgrade)).rejects.toThrow("Dedicated IPs add-on first");

    const removal = {
      organizationId: f.org,
      key: "dedicated_ips" as const,
      defaultProvider: "fake" as const,
      userId: f.tenant.owner.id,
      now,
    };
    expect((await scheduleAddOnRemoval(removal)).at).toEqual(at("2026-11-01T00:00:00Z"));
    expect((await billingStateAt(f.org, now)).terms.entitlements.features.dedicatedIps).toBe(true);
    const november = await billingStateAt(f.org, at("2026-11-01T00:00:00Z"));
    expect(november.terms.plan).toBe("scale");
    expect(november.terms.addOns).toEqual([]);
    await expect(scheduleAddOnRemoval(removal)).rejects.toThrow("isn't part of your plan");

    await cancelScheduledChange({ organizationId: f.org, defaultProvider: "fake", now });
    expect(
      (await billingStateAt(f.org, at("2026-11-01T00:00:00Z"))).terms.addOns.map((a) => a.key),
    ).toEqual(["dedicated_ips"]);

    // Removed first, the downgrade goes through (and keeps it removed).
    await scheduleAddOnRemoval(removal);
    await scheduleDowngrade(downgrade);
    const after = await billingStateAt(f.org, at("2026-11-01T00:00:00Z"));
    expect(after.terms.plan).toBe("pro");
    expect(after.terms.addOns).toEqual([]);
  });

  test("an upgrade keeps add-ons", async () => {
    const tenant = await createTestTenant();
    const now = at("2026-10-12T09:30:00Z");
    await createTestContract(
      tenant.organization.id,
      {
        version: 1,
        plan: "pro",
        addOns: [
          {
            key: "support",
            name: "Priority support",
            unitAmountCents: "1000",
            quantity: 1,
            interval: "month",
            timing: "advance",
          },
        ],
      },
      { effectiveFrom: at("2026-10-01T00:00:00Z") },
    );
    const { contract } = await startUpgrade({
      organizationId: tenant.organization.id,
      plan: "scale",
      userId: tenant.owner.id,
      defaultProvider: "fake",
      now,
    });
    expect(contract.terms.addOns?.map((addOn) => addOn.key)).toEqual(["support"]);
  });

  test("a sales contract grants the feature by listing the catalog key, on eligible plans only", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const actor = { userId: tenant.owner.id, email: tenant.owner.email };
    const now = at("2026-10-12T09:30:00Z");
    const addOn = {
      key: "dedicated_ips",
      name: "Dedicated IPs",
      unitAmountCents: "0",
      quantity: 1,
      interval: "month" as const,
      timing: "advance" as const,
    };
    await expect(
      createContract({
        contract: {
          organizationId: org,
          kind: "sales",
          terms: { version: 1, plan: "pro", addOns: [addOn] },
          effectiveFrom: null,
        },
        defaultProvider: "fake",
        actor,
        reason: "Deal",
        now,
      }),
    ).rejects.toThrow("can't be added to the Pro plan");
    await createContract({
      contract: {
        organizationId: org,
        kind: "sales",
        terms: { version: 1, plan: "enterprise", addOns: [addOn] },
        effectiveFrom: null,
      },
      defaultProvider: "fake",
      actor,
      reason: "Deal",
      now,
    });
    expect(
      await organizationsEntitledTo("dedicatedIps", { now, scope: { organizationIds: [org] } }),
    ).toEqual([org]);
  });
});
