import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { lockBillingAccount } from "../src/accounts.ts";
import {
  cancelScheduledChange,
  createContract,
  expirePendingUpgrades,
  scheduleDowngrade,
  startUpgrade,
} from "../src/changes.ts";
import { runDueBillingCollection } from "../src/collection.ts";
import { finalizeOrganizationBilling } from "../src/deletion.ts";
import { createPlanGate, createUsageGate } from "../src/enforcement.ts";
import { BillingError } from "../src/errors.ts";
import { runDueBillingEvents, storeProviderEvent } from "../src/events.ts";
import { createCreditGrant, listGrants } from "../src/grants.ts";
import { holdsOf } from "../src/holds.ts";
import { getInvoice, listInvoices } from "../src/invoices.ts";
import { isOnBillingHold } from "../src/metering.ts";
import { estimatePeriod } from "../src/overview.ts";
import { recordManualPayment } from "../src/payments.ts";
import { runDueBillingPeriods } from "../src/periods.ts";
import { billingStateAt } from "../src/resolve.ts";
import { collectInvoiceNow, runDueBillingSync } from "../src/sync.ts";
import { createTestContract, recordTestUsage, testBillingProviders } from "../src/testing.ts";

const at = (iso: string) => new Date(iso);
const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });

async function invoicesOf(tenant: TestTenant) {
  const rows = await listInvoices(tenant.organization.id, { limit: 50 });
  return rows.reverse();
}

async function syncAll(
  tenant: TestTenant,
  deps: ReturnType<typeof testBillingProviders>,
  now: Date,
) {
  for (let i = 0; i < 5; i++) {
    await runDueBillingSync(
      { now, scope: scopeOf(tenant) },
      { providers: deps.providers, dashboardUrl: "https://coss.test" },
    );
  }
}

describe("month close", () => {
  test("Pro: the fee in advance, usage less the fee's credit in arrears, once", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await createTestContract(
      org,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-09-01T00:00:00Z") },
    );

    // August's close charges September's fee (the contract starts then), September's October's.
    expect(
      await runDueBillingPeriods({ now: at("2026-10-01T00:20:00Z"), scope: scopeOf(tenant) }),
    ).toBe(2);
    await recordTestUsage({
      organizationId: org,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 2_000_000,
      at: at("2026-10-15T12:30:00Z"),
    });
    // Not before the settle window.
    expect(
      await runDueBillingPeriods({ now: at("2026-11-01T00:05:00Z"), scope: scopeOf(tenant) }),
    ).toBe(0);
    expect(
      await runDueBillingPeriods({ now: at("2026-11-01T00:20:00Z"), scope: scopeOf(tenant) }),
    ).toBe(1);
    expect(
      await runDueBillingPeriods({ now: at("2026-11-01T01:00:00Z"), scope: scopeOf(tenant) }),
    ).toBe(0);

    const invoices = await invoicesOf(tenant);
    expect(invoices.map((invoice) => [invoice.kind, invoice.totalCents, invoice.status])).toEqual([
      ["period", 2_500n, "open"],
      ["period", 2_500n, "open"],
      ["period", 70_000n, "open"],
    ]);
    const october = await getInvoice(org, invoices[2]?.id ?? "");
    expect(october?.lines.map((line) => [line.kind, line.amountCents])).toEqual([
      ["usage", 70_000n],
      ["plan_fee", 2_500n],
      ["credit", -2_500n],
    ]);
    expect(october?.number).toMatch(/^COSS-\d{6}$/);
    // Credit grants: one per month, each fully used or still pending.
    const grants = await listGrants(org);
    expect(grants.filter((grant) => grant.source === "fee").map((grant) => grant.amount)).toEqual([
      2_500n,
      2_500n,
      2_500n,
    ]);
  });

  test("invoices are pushed to the provider and collected", async () => {
    const tenant = await createTestTenant();
    const deps = testBillingProviders();
    await createTestContract(
      tenant.organization.id,
      { version: 1, plan: "scale" },
      { effectiveFrom: at("2026-10-01T00:00:00Z") },
    );
    await runDueBillingPeriods({ now: at("2026-10-01T00:20:00Z"), scope: scopeOf(tenant) });
    await syncAll(tenant, deps, at("2026-10-01T00:30:00Z"));
    const [invoice] = await invoicesOf(tenant);
    expect(invoice).toMatchObject({
      status: "paid",
      amountPaidCents: 25_000n,
      providerInvoiceId: expect.stringContaining("in_fake_"),
    });
    expect(deps.fake.calls.map((call) => call.op)).toEqual([
      "ensureCustomer",
      "pushInvoice",
      "collect",
    ]);
  });

  test("organizations without a contract are never closed", async () => {
    const tenant = await createTestTenant();
    await recordTestUsage({
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 2_000,
      at: at("2026-10-03T00:00:00Z"),
    });
    expect(
      await runDueBillingPeriods({ now: at("2026-11-01T00:20:00Z"), scope: scopeOf(tenant) }),
    ).toBe(0);
  });
});

describe("self-serve plan changes", () => {
  test("an upgrade takes effect once its prorated invoice is paid", async () => {
    const tenant = await createTestTenant();
    const deps = testBillingProviders();
    const now = at("2026-10-12T09:30:00Z");
    const { contract, invoice } = await startUpgrade({
      organizationId: tenant.organization.id,
      plan: "pro",
      userId: tenant.owner.id,
      defaultProvider: "fake",
      now,
    });
    expect(contract.status).toBe("pending");
    expect((await billingStateAt(tenant.organization.id, now)).terms.plan).toBe("free");
    // 19 days and 15 hours of October's 31 days.
    expect(invoice?.totalCents).toBe(1_583n);

    const result = await collectInvoiceNow(
      invoice?.id ?? "",
      { providers: deps.providers, dashboardUrl: "https://coss.test" },
      now,
    );
    expect(result?.state).toBe("paid");
    const state = await billingStateAt(tenant.organization.id, now);
    expect(state.terms.plan).toBe("pro");
    expect(state.contract?.effectiveFrom).toEqual(at("2026-10-12T09:00:00Z"));
    const grants = await listGrants(tenant.organization.id);
    expect(grants.map((grant) => [grant.source, grant.amount])).toEqual([["fee", 1_583n]]);
  });

  test("a declined upgrade stays pending, then expires", async () => {
    const tenant = await createTestTenant();
    const deps = testBillingProviders();
    deps.fake.willCollect({ state: "failed", error: "Your card was declined." });
    const now = at("2026-10-12T09:30:00Z");
    const { invoice } = await startUpgrade({
      organizationId: tenant.organization.id,
      plan: "scale",
      userId: tenant.owner.id,
      defaultProvider: "fake",
      now,
    });
    const result = await collectInvoiceNow(
      invoice?.id ?? "",
      { providers: deps.providers, dashboardUrl: "https://coss.test" },
      now,
    );
    expect(result).toEqual({ state: "failed", error: "Your card was declined." });
    expect((await billingStateAt(tenant.organization.id, now)).terms.plan).toBe("free");

    expect(
      await expirePendingUpgrades({ now: at("2026-10-13T10:00:00Z"), scope: scopeOf(tenant) }),
    ).toBe(1);
    const voided = await getInvoice(tenant.organization.id, invoice?.id ?? "");
    expect(voided?.status).toBe("void");
    expect(
      (await billingStateAt(tenant.organization.id, at("2026-10-13T10:00:00Z"))).contract,
    ).toBeNull();
  });

  test("a downgrade waits for the period's end, needs the preflight, and can be undone", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await createTestContract(
      org,
      { version: 1, plan: "scale" },
      { effectiveFrom: at("2026-09-01T00:00:00Z") },
    );
    const now = at("2026-10-12T09:30:00Z");

    await expect(
      scheduleDowngrade({
        organizationId: org,
        plan: "pro",
        defaultProvider: "fake",
        preflight: async () => ["Remove your SSO provider."],
        userId: null,
        now,
      }),
    ).rejects.toThrow("Remove your SSO provider.");

    const { at: when } = await scheduleDowngrade({
      organizationId: org,
      plan: "pro",
      defaultProvider: "fake",
      preflight: async () => [],
      userId: null,
      now,
    });
    expect(when).toEqual(at("2026-11-01T00:00:00Z"));
    const state = await billingStateAt(org, now);
    expect(state.terms.plan).toBe("scale");
    expect(state.scheduled?.terms.plan).toBe("pro");
    expect((await billingStateAt(org, at("2026-11-02T00:00:00Z"))).terms.plan).toBe("pro");
    // What may be created meanwhile is what both plans allow.
    const gate = createPlanGate();
    await expect(gate.requireFeature(org, "sso")).rejects.toThrow("Single sign-on");

    await cancelScheduledChange({ organizationId: org, defaultProvider: "fake", now });
    expect((await billingStateAt(org, at("2026-11-02T00:00:00Z"))).terms.plan).toBe("scale");

    await scheduleDowngrade({
      organizationId: org,
      plan: "free",
      defaultProvider: "fake",
      preflight: async () => [],
      userId: null,
      now,
    });
    expect((await billingStateAt(org, at("2026-11-02T00:00:00Z"))).contract).toBeNull();
  });
});

describe("sales contracts and credits", () => {
  test("a contract starting mid-month is invoiced for the rest of it and audited", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const now = at("2026-10-16T00:10:00Z");
    const { contract, invoice } = await createContract({
      contract: {
        organizationId: org,
        kind: "sales",
        terms: {
          version: 1,
          plan: "enterprise",
          fee: { amountCents: "310000", interval: "month", timing: "advance" },
          commitments: [
            {
              id: "min",
              kind: "minimum_spend",
              amountCents: "500000",
              period: "month",
              counts: "usage",
            },
          ],
        },
        effectiveFrom: at("2026-10-16T00:00:00Z"),
        termEnd: at("2027-10-01T00:00:00Z"),
        autoRenew: true,
        reference: "https://crm.example/deal/1",
      },
      defaultProvider: "manual",
      actor: { userId: tenant.owner.id, email: tenant.owner.email },
      reason: "Signed order form",
      now,
    });
    expect(contract).toMatchObject({ kind: "sales", plan: "enterprise", autoRenew: true });
    // 16 of 31 days of $3,100.
    expect(invoice?.totalCents).toBe(160_000n);
    const audit = await db
      .select()
      .from(schema.adminAuditEvent)
      .where(
        and(
          eq(schema.adminAuditEvent.organizationId, org),
          eq(schema.adminAuditEvent.action, "billing.contract_created"),
        ),
      );
    expect(audit).toHaveLength(1);

    // The month closes with the shortfall of its minimum.
    await recordTestUsage({
      organizationId: org,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 1_000_000,
      at: at("2026-10-20T00:00:00Z"),
    });
    await runDueBillingPeriods({ now: at("2026-11-01T00:20:00Z"), scope: scopeOf(tenant) });
    const october = (await invoicesOf(tenant)).find((row) => row.kind === "period");
    const lines = (await getInvoice(org, october?.id ?? ""))?.lines ?? [];
    // Free's 3,000 emails (the month began on Free) come first: 997k × $0.0004.
    expect(lines.map((line) => [line.kind, line.amountCents])).toEqual([
      ["usage", 39_880n],
      // The $5,000 minimum for the 16 days served ($2,580.65), less the usage.
      ["commitment_shortfall", 218_185n],
      ["plan_fee", 310_000n],
      ["credit", -39_880n],
    ]);
  });

  test("future contracts start on the first of a month only", async () => {
    const tenant = await createTestTenant();
    await expect(
      createContract({
        contract: {
          organizationId: tenant.organization.id,
          kind: "sales",
          terms: { version: 1, plan: "enterprise" },
          effectiveFrom: at("2026-11-15T00:00:00Z"),
        },
        defaultProvider: "fake",
        actor: { userId: tenant.owner.id, email: tenant.owner.email },
        reason: "test",
        now: at("2026-10-16T00:10:00Z"),
      }),
    ).rejects.toThrow("first of a month");
  });

  test("support credits free units, which the month close uses first", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await createTestContract(
      org,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-10-01T00:00:00Z") },
    );
    await createCreditGrant({
      grant: {
        organizationId: org,
        kind: "units",
        amount: 50_000n,
        meter: "email.recipients",
        source: "support",
        description: "Migration credit",
        effectiveAt: at("2026-10-01T00:00:00Z"),
        expiresAt: at("2027-01-01T00:00:00Z"),
      },
      actor: { userId: tenant.owner.id, email: tenant.owner.email },
      reason: "Ticket 123",
    });
    await recordTestUsage({
      organizationId: org,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 160_000,
      at: at("2026-10-10T00:00:00Z"),
    });
    await runDueBillingPeriods({ now: at("2026-11-01T00:20:00Z"), scope: scopeOf(tenant) });
    const [, october] = await invoicesOf(tenant);
    const lines = (await getInvoice(org, october?.id ?? ""))?.lines ?? [];
    expect(lines[0]).toMatchObject({
      kind: "usage",
      quantity: 160_000,
      coveredUnits: 50_000,
      amountCents: 4_400n,
    });
    const units = (await listGrants(org)).find((grant) => grant.kind === "units");
    expect(units?.remaining).toBe(0n);
  });
});

describe("collection", () => {
  test("an invoice overdue past the grace days holds live sending until it is paid", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const deps = testBillingProviders();
    await createTestContract(
      org,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-10-01T00:00:00Z") },
    );
    await runDueBillingPeriods({ now: at("2026-10-01T00:20:00Z"), scope: scopeOf(tenant) });
    deps.fake.willCollect({ state: "failed", error: "insufficient funds" });
    await syncAll(tenant, deps, at("2026-10-01T00:30:00Z"));
    const [invoice] = await invoicesOf(tenant);
    expect(invoice).toMatchObject({
      status: "open",
      paymentState: "failed",
      collectionAttempts: 1,
    });

    await runDueBillingCollection({ now: at("2026-10-02T00:00:00Z"), scope: scopeOf(tenant) });
    expect((await lockedAccount(org)).status).toBe("past_due");
    expect(await isOnBillingHold(org)).toBe(false);

    await runDueBillingCollection({ now: at("2026-10-16T00:00:00Z"), scope: scopeOf(tenant) });
    expect((await lockedAccount(org)).status).toBe("delinquent");
    expect((await holdsOf(org)).map((hold) => hold.reason)).toEqual(["delinquent"]);

    await recordManualPayment({
      organizationId: org,
      invoiceId: invoice?.id ?? "",
      payment: {
        amountCents: 2_500n,
        method: "wire",
        reference: "WIRE-1",
        receivedAt: at("2026-10-16T00:00:00Z"),
      },
      actor: { userId: tenant.owner.id, email: tenant.owner.email },
      reason: "Wire received",
      now: at("2026-10-16T01:00:00Z"),
    });
    expect(await isOnBillingHold(org)).toBe(false);
    expect((await lockedAccount(org)).status).toBe("active");
  });

  test("provider events mark invoices paid once", async () => {
    const tenant = await createTestTenant();
    const deps = testBillingProviders();
    await createTestContract(
      tenant.organization.id,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-10-01T00:00:00Z") },
    );
    await runDueBillingPeriods({ now: at("2026-10-01T00:20:00Z"), scope: scopeOf(tenant) });
    deps.fake.willCollect({ state: "processing" });
    await syncAll(tenant, deps, at("2026-10-01T00:30:00Z"));
    const [invoice] = await invoicesOf(tenant);
    expect(invoice?.paymentState).toBe("processing");

    const event = {
      id: `evt_${invoice?.id}`,
      type: "invoice.paid",
      payload: {
        outcomes: [
          {
            kind: "invoice_paid",
            providerInvoiceId: invoice?.providerInvoiceId,
            paymentId: `py_${invoice?.id}`,
            amountCents: "2500",
            method: "us_bank_account",
          },
        ],
      },
    };
    expect(await storeProviderEvent("fake", event)).toBe(true);
    expect(await storeProviderEvent("fake", event)).toBe(false);
    await runDueBillingEvents({ now: new Date(Date.now() + 1000) }, { providers: deps.providers });
    const paid = await getInvoice(tenant.organization.id, invoice?.id ?? "");
    expect(paid).toMatchObject({ status: "paid", amountPaidCents: 2_500n });
  });
});

describe("enforcement", () => {
  test("Free's 3,000 emails can't be overshot by concurrent sends", async () => {
    const tenant = await createTestTenant();
    const gate = createUsageGate();
    const org = tenant.organization.id;
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        db.transaction((tx) =>
          gate.reserve(tx, { organizationId: org, meter: "email.recipients", quantity: 400 }),
        ),
      ),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(7);
    const refused = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(refused.reason).toBeInstanceOf(BillingError);
    expect(refused.reason.code).toBe("usage_limit_exceeded");
    // Paid plans are not capped.
    await createTestContract(
      org,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-01-01T00:00:00Z") },
    );
    await db.transaction((tx) =>
      gate.reserve(tx, { organizationId: org, meter: "email.recipients", quantity: 10_000 }),
    );
    // SMS needs a contract.
    await expect(
      db.transaction((tx) =>
        gate.reserve(tx, { organizationId: org, meter: "sms.segments", quantity: 1 }),
      ),
    ).rejects.toThrow("needs a contract");
  });

  test("the plan gate: features and limits", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const gate = createPlanGate();
    await expect(gate.requireFeature(org, "logDrains")).rejects.toThrow("Scale plan");
    await expect(gate.requireCapacity(org, "domains", 1)).rejects.toThrow("1 domains");
    await gate.requireCapacity(org, "domains", 0);
    expect(await createPlanGate({ systemOrganizationId: org }).limit(org, "domains")).toBeNull();
  });
});

describe("estimates and deletion", () => {
  test("the running month's estimate", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const now = new Date();
    await createTestContract(
      org,
      { version: 1, plan: "pro" },
      { effectiveFrom: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) },
    );
    await recordTestUsage({
      organizationId: org,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 100_000,
      at: now,
    });
    const estimate = await estimatePeriod(org, new Date(now.getTime() + 60 * 60 * 1000));
    expect(estimate.usageCents).toBe(4_000n);
    expect(estimate.usage).toEqual([
      { meter: "email.recipients", dimension: "", quantity: 100_000 },
    ]);
  });

  test("deleting an organization bills its running month once", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await createTestContract(
      org,
      { version: 1, plan: "enterprise", fee: null },
      { effectiveFrom: at("2026-10-01T00:00:00Z"), kind: "sales" },
    );
    await recordTestUsage({
      organizationId: org,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 10_000,
      at: at("2026-10-05T00:00:00Z"),
    });
    await finalizeOrganizationBilling(org, { now: at("2026-10-20T00:00:00Z") });
    await finalizeOrganizationBilling(org, { now: at("2026-10-20T00:00:00Z") });
    const invoices = await invoicesOf(tenant);
    expect(invoices.map((invoice) => [invoice.kind, invoice.totalCents])).toEqual([
      ["final", 400n],
    ]);
    expect((await billingStateAt(org, at("2026-10-21T00:00:00Z"))).contract).toBeNull();
  });
});

async function lockedAccount(organizationId: string) {
  return db.transaction((tx) => lockBillingAccount(tx, organizationId, "fake"));
}
