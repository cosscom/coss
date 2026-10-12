import { describe, expect, test } from "bun:test";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { RATE_CARDS } from "../src/catalog/rates.ts";
import { startUpgrade } from "../src/changes.ts";
import { contractAt } from "../src/contracts.ts";
import { composePeriodInvoice } from "../src/engine/compose.ts";
import { resolveTerms } from "../src/engine/terms.ts";
import { runDueBillingEvents, storeProviderEvent } from "../src/events.ts";
import { listGrants } from "../src/grants.ts";
import { getInvoice, listInvoices } from "../src/invoices.ts";
import { voidInvoice } from "../src/payments.ts";
import { runDueBillingPeriods } from "../src/periods.ts";
import { parseContractTerms } from "../src/schemas.ts";
import { collectInvoiceNow } from "../src/sync.ts";
import { createTestContract, recordTestUsage, testBillingProviders } from "../src/testing.ts";

const at = (iso: string) => new Date(iso);
const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });

async function invoicesOf(tenant: TestTenant) {
  return (await listInvoices(tenant.organization.id, { limit: 50 })).reverse();
}

describe("credit commitments", () => {
  test("a rolled-over commitment carries only what's left after the month's drawdown", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await createTestContract(
      org,
      {
        version: 1,
        plan: "enterprise",
        fee: null,
        commitments: [
          {
            id: "prepaid",
            kind: "prepaid_spend",
            amountCents: "100000",
            period: "month",
            schedule: "upfront",
            rollover: true,
          },
        ],
      },
      { effectiveFrom: at("2026-09-01T00:00:00Z"), kind: "sales" },
    );
    // August's close grants September's $1,000.
    await runDueBillingPeriods({ now: at("2026-09-01T00:20:00Z"), scope: scopeOf(tenant) });
    await recordTestUsage({
      organizationId: org,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 1_000_000, // $400
      at: at("2026-09-10T00:00:00Z"),
    });
    await runDueBillingPeriods({ now: at("2026-10-01T00:20:00Z"), scope: scopeOf(tenant) });
    const grants = (await listGrants(org)).filter((grant) => grant.source === "commitment");
    const october = grants.find(
      (grant) => grant.effectiveAt.getTime() === at("2026-10-01T00:00:00Z").getTime(),
    );
    // $1,000 + the $600 September left.
    expect(october?.amount).toBe(160_000n);
    const september = grants.find((grant) => grant.id !== october?.id);
    expect(september?.remaining).toBe(0n);
  });

  test("committed units that cover all of a month's usage still record the drawdown", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await createTestContract(
      org,
      {
        version: 1,
        plan: "enterprise",
        fee: null,
        commitments: [
          {
            id: "volume",
            kind: "prepaid_units",
            meter: "email.recipients",
            units: 1_000_000,
            unitNanos: "200000",
            period: "year",
            schedule: "upfront",
            rollover: false,
          },
        ],
      },
      {
        effectiveFrom: at("2026-08-01T00:00:00Z"),
        kind: "sales",
        termEnd: at("2027-08-01T00:00:00Z"),
      },
    );
    await runDueBillingPeriods({ now: at("2026-08-01T00:20:00Z"), scope: scopeOf(tenant) });
    await recordTestUsage({
      organizationId: org,
      environmentId: tenant.production.id,
      meter: "email.recipients",
      quantity: 500_000,
      at: at("2026-08-10T00:00:00Z"),
    });
    await runDueBillingPeriods({ now: at("2026-09-01T00:20:00Z"), scope: scopeOf(tenant) });
    const units = (await listGrants(org)).find((grant) => grant.kind === "units");
    expect(units?.remaining).toBe(500_000n);
  });
});

describe("payments and contracts", () => {
  test("a payment for a voided invoice becomes credit", async () => {
    const tenant = await createTestTenant();
    const deps = testBillingProviders();
    await createTestContract(
      tenant.organization.id,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-10-01T00:00:00Z") },
    );
    await runDueBillingPeriods({ now: at("2026-10-01T00:20:00Z"), scope: scopeOf(tenant) });
    deps.fake.willCollect({ state: "requires_action", hostedUrl: null });
    const [invoice] = await invoicesOf(tenant);
    await collectInvoiceNow(invoice?.id ?? "", {
      providers: deps.providers,
      dashboardUrl: "https://coss.test",
    });
    await voidInvoice({
      organizationId: tenant.organization.id,
      invoiceId: invoice?.id ?? "",
      actor: null,
      reason: "test",
    });
    const providerInvoiceId = (await getInvoice(tenant.organization.id, invoice?.id ?? ""))
      ?.providerInvoiceId;
    await storeProviderEvent("fake", {
      id: `evt_late_${invoice?.id}`,
      type: "invoice.paid",
      payload: {
        outcomes: [
          {
            kind: "invoice_paid",
            providerInvoiceId,
            paymentId: `py_late_${invoice?.id}`,
            amountCents: "2500",
            method: "card",
          },
        ],
      },
    });
    await runDueBillingEvents({ now: new Date(Date.now() + 1000) }, { providers: deps.providers });
    const credit = (await listGrants(tenant.organization.id)).find(
      (grant) => grant.source === "refund",
    );
    expect(credit).toMatchObject({ amount: 2_500n, appliesTo: "any" });
    expect((await getInvoice(tenant.organization.id, invoice?.id ?? ""))?.paymentState).toBe(
      "paid_after_void",
    );
  });

  test("an upgrade paid after its month closed starts the next month and credits what was paid", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const deps = testBillingProviders();
    await createTestContract(
      org,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-10-01T00:00:00Z") },
    );
    const { invoice } = await startUpgrade({
      organizationId: org,
      plan: "scale",
      userId: null,
      defaultProvider: "fake",
      now: at("2026-10-31T22:30:00Z"),
    });
    // October closes (with Pro's November fee) before the debit settles.
    await runDueBillingPeriods({ now: at("2026-11-01T00:20:00Z"), scope: scopeOf(tenant) });
    await collectInvoiceNow(
      invoice?.id ?? "",
      { providers: deps.providers, dashboardUrl: "https://coss.test" },
      at("2026-11-01T03:00:00Z"),
    );
    const contract = await contractAt(org, at("2026-11-02T00:00:00Z"));
    expect(contract).toMatchObject({ plan: "scale", effectiveFrom: at("2026-11-01T00:00:00Z") });
    const refunds = (await listGrants(org)).filter((grant) => grant.source === "refund");
    expect(refunds.map((grant) => grant.amount)).toEqual([invoice?.totalCents ?? 0n]);
    // November's difference: $250 less the $25 Pro was charged.
    const followUp = (await invoicesOf(tenant)).filter((row) => row.kind === "plan_change").at(-1);
    expect(followUp?.totalCents).toBe(22_500n);
  });

  test("moving from an internal contract to a paid one bills the paid one's first month", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await createTestContract(
      org,
      { version: 1, plan: "enterprise", fee: null },
      {
        effectiveFrom: at("2026-09-01T00:00:00Z"),
        effectiveUntil: at("2026-11-01T00:00:00Z"),
        kind: "internal",
      },
    );
    await createTestContract(
      org,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-11-01T00:00:00Z") },
    );
    await runDueBillingPeriods({ now: at("2026-11-01T00:20:00Z"), scope: scopeOf(tenant) });
    const invoices = await invoicesOf(tenant);
    expect(invoices.map((invoice) => invoice.totalCents)).toEqual([2_500n]);
  });
});

describe("engine", () => {
  test("two discounts with the same label get distinct charge keys", () => {
    const card = RATE_CARDS[0] as (typeof RATE_CARDS)[number];
    const terms = resolveTerms(
      parseContractTerms({
        version: 1,
        plan: "pro",
        discounts: [
          { scope: "fees", percent: 10 },
          { scope: "fees", percent: 10 },
        ],
      }),
      card,
    );
    const period = { start: at("2026-10-01T00:00:00Z"), end: at("2026-11-01T00:00:00Z") };
    const next = { start: period.end, end: at("2026-12-01T00:00:00Z") };
    const segment = {
      contractId: "bcon_x",
      interval: period,
      terms,
      contractStart: at("2026-09-01T00:00:00Z"),
      contractEnd: null,
      termEnd: null,
      superseded: false,
    };
    const invoice = composePeriodInvoice({
      closed: { period, segments: [segment], usage: [] },
      next: { period: next, segment: { ...segment, interval: next } },
      grants: [],
    });
    const keys = invoice.lines
      .filter((line) => line.kind === "discount")
      .map((line) => line.chargeKey);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
  });
});
