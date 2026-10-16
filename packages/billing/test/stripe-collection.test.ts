/**
 * Collection against Stripe's own behaviour (FakeStripeApi): the fake provider always collects,
 * so these cover what only a real rail does (refusing a charge without a payment method, an
 * invoice paid on the hosted page before coss.com retries it).
 */
import { expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { getBillingAccount } from "../src/accounts.ts";
import { startUpgrade } from "../src/changes.ts";
import { runDueBillingCollection } from "../src/collection.ts";
import { contractAt, pendingContract } from "../src/contracts.ts";
import { getInvoice } from "../src/invoices.ts";
import { manualBillingProvider } from "../src/providers/manual.ts";
import { StripeBillingProvider } from "../src/providers/stripe.ts";
import { completePaymentSetup, paymentSetupSession } from "../src/setup.ts";
import { collectInvoiceNow, runDueBillingSync } from "../src/sync.ts";
import { FakeStripeApi } from "../src/testing.ts";

const now = new Date("2026-10-12T12:00:00Z");

async function fixture() {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const api = new FakeStripeApi();
  const stripe = new StripeBillingProvider({ secretKey: "sk_test_fake", fetch: api.fetch });
  const providers = { stripe, manual: manualBillingProvider };
  const deps = { providers, dashboardUrl: "https://coss.test" };
  const scope = { organizationIds: [organizationId] };
  return { tenant, organizationId, api, providers, deps, scope };
}

async function notifications(organizationId: string, kind: string) {
  return db
    .select()
    .from(schema.billingNotification)
    .where(
      and(
        eq(schema.billingNotification.organizationId, organizationId),
        eq(schema.billingNotification.kind, kind),
      ),
    );
}

async function invoiceRow(organizationId: string, invoiceId: string) {
  const invoice = await getInvoice(organizationId, invoiceId);
  if (!invoice) throw new Error("missing invoice");
  return invoice;
}

test("an upgrade waits while the customer adds a card in Checkout, then is charged at once", async () => {
  const f = await fixture();
  const { invoice } = await startUpgrade({
    organizationId: f.organizationId,
    plan: "pro",
    userId: f.tenant.owner.id,
    defaultProvider: "stripe",
    now,
  });
  if (!invoice) throw new Error("missing invoice");
  // No card yet: the dashboard sends the customer to Checkout…
  const setup = await paymentSetupSession({
    organizationId: f.organizationId,
    defaultProvider: "stripe",
    providers: f.providers,
    returnUrl: "https://coss.test/acme/settings/billing",
    cancelUrl: "https://coss.test/acme/settings/billing",
  });
  expect(setup?.url).toContain("https://checkout.stripe.test/");

  // …while the worker pushes the invoice and gets to its collection.
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  let row = await invoiceRow(f.organizationId, invoice.id);
  expect(row.providerInvoiceId).not.toBeNull();
  // Nothing was charged or failed: the collection waits for a payment method.
  expect(row).toMatchObject({
    status: "open",
    paymentState: null,
    collectionAttempts: 0,
    syncAction: "collect",
  });
  expect(f.api.requests.some((request) => request.path.endsWith("/pay"))).toBe(false);
  expect(await notifications(f.organizationId, "payment_failed")).toEqual([]);

  // The customer finishes Checkout and comes back: the upgrade is charged right away.
  const [sessionId] = [...f.api.sessions.keys()];
  if (!sessionId) throw new Error("missing session");
  f.api.completeSession(sessionId);
  await completePaymentSetup({
    organizationId: f.organizationId,
    defaultProvider: "stripe",
    providers: f.providers,
    sessionId,
  });
  const collected = await collectInvoiceNow(invoice.id, f.deps, now);
  expect(collected?.state).toBe("paid");
  row = await invoiceRow(f.organizationId, invoice.id);
  expect(row.status).toBe("paid");
  expect(await pendingContract(f.organizationId)).toBeNull();
  expect((await contractAt(f.organizationId, now))?.terms.plan).toBe("pro");
  expect(await notifications(f.organizationId, "payment_failed")).toEqual([]);
});

test("an invoice without a payment method that isn't an upgrade is dunned (the customer must add one)", async () => {
  const f = await fixture();
  const { invoice } = await startUpgrade({
    organizationId: f.organizationId,
    plan: "pro",
    userId: f.tenant.owner.id,
    defaultProvider: "stripe",
    now,
  });
  if (!invoice) throw new Error("missing invoice");
  // Detached from the upgrade (as a month's invoice would be): it must not wait forever.
  await db
    .update(schema.billingContract)
    .set({ pendingInvoiceId: null })
    .where(eq(schema.billingContract.pendingInvoiceId, invoice.id));
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  const row = await invoiceRow(f.organizationId, invoice.id);
  expect(row).toMatchObject({ paymentState: "failed", collectionAttempts: 1, syncAction: null });
  expect(row.paymentError).toBe("No payment method on file.");
  expect(row.nextCollectionAt).not.toBeNull();
  expect(await notifications(f.organizationId, "payment_failed")).toHaveLength(1);
});

test("returning from Checkout after a failed charge queues a fresh one", async () => {
  const f = await fixture();
  const { invoice } = await startUpgrade({
    organizationId: f.organizationId,
    plan: "pro",
    userId: f.tenant.owner.id,
    defaultProvider: "stripe",
    now,
  });
  if (!invoice) throw new Error("missing invoice");
  await paymentSetupSession({
    organizationId: f.organizationId,
    defaultProvider: "stripe",
    providers: f.providers,
    returnUrl: "https://coss.test/r",
    cancelUrl: "https://coss.test/c",
  });
  // An earlier card was declined (the collection is over until the retry in 3 days).
  const account = await getBillingAccount(f.organizationId);
  if (!account?.providerCustomerId) throw new Error("missing customer");
  f.api.attachPaymentMethod(account.providerCustomerId);
  f.api.payOutcomes.push("declined");
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  expect(await invoiceRow(f.organizationId, invoice.id)).toMatchObject({
    paymentState: "failed",
    syncAction: null,
  });

  // A new card in Checkout, then back on the billing page.
  const [sessionId] = [...f.api.sessions.keys()];
  if (!sessionId) throw new Error("missing session");
  f.api.completeSession(sessionId);
  await completePaymentSetup({
    organizationId: f.organizationId,
    defaultProvider: "stripe",
    providers: f.providers,
    sessionId,
  });
  const collected = await collectInvoiceNow(invoice.id, f.deps, now);
  expect(collected?.state).toBe("paid");
  expect((await invoiceRow(f.organizationId, invoice.id)).status).toBe("paid");
});

test("a retry of an invoice the customer already paid on the hosted page records the payment", async () => {
  const f = await fixture();
  const { invoice } = await startUpgrade({
    organizationId: f.organizationId,
    plan: "pro",
    userId: f.tenant.owner.id,
    defaultProvider: "stripe",
    now,
  });
  if (!invoice) throw new Error("missing invoice");
  await paymentSetupSession({
    organizationId: f.organizationId,
    defaultProvider: "stripe",
    providers: f.providers,
    returnUrl: "https://coss.test/r",
    cancelUrl: "https://coss.test/c",
  });
  const account = await getBillingAccount(f.organizationId);
  if (!account?.providerCustomerId) throw new Error("missing customer");
  f.api.attachPaymentMethod(account.providerCustomerId);
  f.api.payOutcomes.push("declined");
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  const failed = await invoiceRow(f.organizationId, invoice.id);
  expect(failed.paymentState).toBe("failed");

  // The customer pays on Stripe's hosted page; the webhook hasn't been processed yet.
  const stripeInvoice = f.api.invoices.get(failed.providerInvoiceId ?? "");
  if (!stripeInvoice) throw new Error("missing Stripe invoice");
  stripeInvoice.status = "paid";
  stripeInvoice.amount_paid = stripeInvoice.total;
  stripeInvoice.amount_due = 0;

  // The scheduled retry comes due: Stripe refuses ("already paid"), which is not a failure.
  const retryAt = failed.nextCollectionAt ?? now;
  await runDueBillingCollection({ now: retryAt, scope: f.scope });
  await runDueBillingSync({ now: retryAt, scope: f.scope }, f.deps);
  const row = await invoiceRow(f.organizationId, invoice.id);
  expect(row.status).toBe("paid");
  expect(await notifications(f.organizationId, "payment_failed")).toHaveLength(1);
});
