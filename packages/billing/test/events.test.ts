import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint, renderWebhookPayload } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { asc, eq } from "drizzle-orm";
import { cancelScheduledChange, scheduleDowngrade } from "../src/changes.ts";
import { runDueBillingCollection } from "../src/collection.ts";
import { createCreditGrant } from "../src/grants.ts";
import { listInvoices } from "../src/invoices.ts";
import { recordManualPayment } from "../src/payments.ts";
import { runDueBillingPeriods } from "../src/periods.ts";
import { runDueBillingSync } from "../src/sync.ts";
import { createTestContract, testBillingProviders } from "../src/testing.ts";
import { BillingWebhookEvent } from "../src/wire.ts";

const at = (iso: string) => new Date(iso);
const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });

async function withEndpoints(tenant: TestTenant) {
  for (const environmentId of [tenant.production.id, tenant.development.id]) {
    await createWebhookEndpoint(
      {
        organizationId: tenant.organization.id,
        environmentId,
        url: "http://127.0.0.1:9/hook",
        eventTypes: [],
        apiVersion: LATEST_API_VERSION,
        userId: null,
      },
      testManagementDeps,
    );
  }
}

async function billingEvents(tenant: TestTenant) {
  const messages = await db
    .select()
    .from(schema.webhookMessage)
    .where(eq(schema.webhookMessage.organizationId, tenant.organization.id))
    // Transactions first: ids (random within a millisecond) only order events of one transaction.
    .orderBy(asc(schema.webhookMessage.createdAt), asc(schema.webhookMessage.id));
  for (const message of messages) {
    // Every environment gets them, but only live ones: sandbox endpoints never hear about billing.
    expect(message.environmentId).toBe(tenant.production.id);
  }
  return messages.map((message) =>
    BillingWebhookEvent.parse(renderWebhookPayload(message.payload, LATEST_API_VERSION)),
  );
}

describe("billing.* webhook events", () => {
  test("an invoice's life: finalized, payment failed, hold placed, paid, hold lifted", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await withEndpoints(tenant);
    const deps = testBillingProviders();
    await createTestContract(
      org,
      { version: 1, plan: "pro" },
      { effectiveFrom: at("2026-10-01T00:00:00Z") },
    );
    await runDueBillingPeriods({ now: at("2026-10-01T00:20:00Z"), scope: scopeOf(tenant) });
    deps.fake.willCollect({ state: "failed", error: "insufficient funds" });
    for (let i = 0; i < 5; i++) {
      await runDueBillingSync(
        { now: at("2026-10-01T00:30:00Z"), scope: scopeOf(tenant) },
        { providers: deps.providers, dashboardUrl: "https://coss.test" },
      );
    }
    await runDueBillingCollection({ now: at("2026-10-16T00:00:00Z"), scope: scopeOf(tenant) });
    const [invoice] = await listInvoices(org, { limit: 1 });
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

    const events = await billingEvents(tenant);
    expect(events.map((event) => event.type)).toEqual([
      "billing.invoice_finalized",
      "billing.invoice_payment_failed",
      "billing.hold_placed",
      "billing.invoice_paid",
      "billing.hold_lifted",
    ]);
    for (const event of events) {
      expect(event.data.organization_id).toBe(org);
      expect(event.api_version).toBe(LATEST_API_VERSION);
    }
    expect(events[0]?.data).toMatchObject({
      invoice: { id: invoice?.id, status: "open", total: 2_500, amount_due: 2_500 },
    });
    expect(events[1]?.data).toMatchObject({ failure: { message: "insufficient funds" } });
    expect(events[2]?.data).toMatchObject({ reason: "delinquent" });
    expect(events[3]?.data).toMatchObject({
      invoice: { id: invoice?.id, status: "paid", amount_due: 0 },
    });
    // No line items in events: they can be long. Fetch the invoice for those.
    expect(events[3]?.data).not.toHaveProperty("invoice.lines");
  });

  test("credit-covered invoices announce settlement once during finalization", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const start = at("2026-10-01T00:00:00Z");
    await createTestContract(org, { version: 1, plan: "pro" }, { effectiveFrom: start });
    await createCreditGrant({
      grant: {
        organizationId: org,
        kind: "amount",
        amount: 2_500n,
        appliesTo: "any",
        source: "sla",
        description: "Service credit",
        effectiveAt: at("2026-09-01T00:00:00Z"),
        expiresAt: null,
      },
      actor: { userId: tenant.owner.id, email: tenant.owner.email },
      reason: "Service credit",
    });
    await withEndpoints(tenant);
    const now = at("2026-10-01T00:20:00Z");
    await runDueBillingPeriods({ now, scope: scopeOf(tenant) });
    await runDueBillingPeriods({ now, scope: scopeOf(tenant) });
    const deps = testBillingProviders();
    await runDueBillingSync(
      { now, scope: scopeOf(tenant) },
      { providers: deps.providers, dashboardUrl: "https://coss.test" },
    );
    const [invoice] = await listInvoices(org);
    expect(invoice).toMatchObject({ status: "paid", paidAt: now, syncAction: null });
    const events = await billingEvents(tenant);
    expect(events.map((event) => event.type)).toEqual([
      "billing.invoice_finalized",
      "billing.invoice_paid",
    ]);
    for (const event of events) {
      expect(event.data).toMatchObject({
        occurred_at: now.toISOString(),
        invoice: { id: invoice?.id, status: "paid", total: 0, amount_due: 0 },
      });
    }
  });

  test("plan changes and credits", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    await withEndpoints(tenant);
    await createTestContract(
      org,
      { version: 1, plan: "scale" },
      { effectiveFrom: at("2026-09-01T00:00:00Z") },
    );
    const now = at("2026-10-12T09:30:00Z");
    await scheduleDowngrade({
      organizationId: org,
      plan: "pro",
      defaultProvider: "fake",
      preflight: async () => [],
      userId: null,
      now,
    });
    await cancelScheduledChange({ organizationId: org, defaultProvider: "fake", now });
    await createCreditGrant({
      grant: {
        organizationId: org,
        kind: "amount",
        amount: 10_000n,
        source: "sla",
        description: "September incident",
        effectiveAt: now,
        expiresAt: null,
      },
      actor: { userId: tenant.owner.id, email: tenant.owner.email },
      reason: "SLA breach on 2026-09-30",
    });

    const events = await billingEvents(tenant);
    for (const event of events) expect(event.data.occurred_at).toBe(event.created_at);
    expect(events.map((event) => [event.type, event.data])).toMatchObject([
      [
        "billing.plan_changed",
        {
          organization_id: org,
          change: "downgrade",
          plan: "pro",
          previous_plan: "scale",
          effective_at: "2026-11-01T00:00:00.000Z",
        },
      ],
      [
        "billing.plan_changed",
        {
          organization_id: org,
          change: "reverted",
          plan: "scale",
          previous_plan: "pro",
          effective_at: "2026-11-01T00:00:00.000Z",
        },
      ],
      [
        "billing.credit_granted",
        {
          organization_id: org,
          credit: expect.objectContaining({
            object: "credit",
            kind: "amount",
            amount: 10_000,
            remaining: 10_000,
            source: "sla",
            description: "September incident",
          }),
        },
      ],
    ]);
    // The internal reason stays internal.
    expect(JSON.stringify(events[2])).not.toContain("SLA breach");
  });
});
