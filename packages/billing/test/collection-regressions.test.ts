import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  createCreditNote,
  createOneOffInvoice,
  listCreditNotes,
  runDueCreditNoteSync,
} from "../src/adjustments.ts";
import { runBillingUsageChecks } from "../src/alerts.ts";
import { runDueBillingCollection } from "../src/collection.ts";
import { listGrants } from "../src/grants.ts";
import { holdsOf, placeHold } from "../src/holds.ts";
import { getInvoice } from "../src/invoices.ts";
import { recordManualPayment } from "../src/payments.ts";
import { collectInvoiceNow, runDueBillingSync } from "../src/sync.ts";
import { recordTestUsage, testBillingProviders } from "../src/testing.ts";

const now = new Date("2026-10-12T12:00:00Z");
const day = 86_400_000;

async function fixture() {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const actor = { userId: tenant.owner.id, email: tenant.owner.email };
  const invoice = await createOneOffInvoice({
    organizationId,
    lines: [{ description: "Service", amountCents: 10_000n }],
    memo: null,
    defaultProvider: "fake",
    actor,
    reason: "Test",
    now,
  });
  const { fake, providers } = testBillingProviders();
  const deps = { providers, dashboardUrl: "https://coss.test" };
  const scope = { organizationIds: [organizationId] };
  const credit = (amountCents = 2_000n) =>
    createCreditNote({
      organizationId,
      invoiceId: invoice.id,
      amountCents,
      refundCents: 0n,
      memo: "Correction",
      actor,
      reason: "Test",
      now,
    });
  return { tenant, organizationId, actor, invoice, fake, deps, scope, credit };
}

describe("collection and credit serialization", () => {
  test("pending and failed credits block collection until the provider issues them", async () => {
    const f = await fixture();
    // One worker pass pushes the invoice, the next would collect it.
    await runDueBillingSync({ now, scope: f.scope }, f.deps);
    const note = await f.credit();
    expect(note.status).toBe("pending");
    await runDueBillingSync({ now, scope: f.scope }, f.deps);
    expect(f.fake.calls.filter((call) => call.op === "collect")).toHaveLength(0);
    await db
      .update(schema.billingCreditNote)
      .set({ status: "failed" })
      .where(eq(schema.billingCreditNote.id, note.id));
    await collectInvoiceNow(f.invoice.id, f.deps, now);
    expect(f.fake.calls.filter((call) => call.op === "collect")).toHaveLength(0);
    await db
      .update(schema.billingCreditNote)
      .set({ status: "pending" })
      .where(eq(schema.billingCreditNote.id, note.id));
    await runDueCreditNoteSync({ now, scope: f.scope }, f.deps);
    await collectInvoiceNow(f.invoice.id, f.deps, now);
    expect(
      f.fake.calls
        .filter((call) => ["collect", "createCreditNote"].includes(call.op))
        .map((call) => call.op),
    ).toEqual(["createCreditNote", "collect"]);
    expect(await getInvoice(f.organizationId, f.invoice.id)).toMatchObject({
      status: "paid",
      amountPaidCents: 8_000n,
      amountDueCents: 0n,
    });
  });

  test("a credit created during collection sees the settled payment and grants future credit", async () => {
    const f = await fixture();
    await runDueBillingSync({ now, scope: f.scope }, f.deps);
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const collect = f.fake.collect.bind(f.fake);
    f.fake.collect = async (input) => {
      entered.resolve();
      await release.promise;
      return collect(input);
    };
    const collection = collectInvoiceNow(f.invoice.id, f.deps, now);
    await entered.promise;
    let credited = false;
    const credit = f.credit().then((note) => {
      credited = true;
      return note;
    });
    try {
      // Let the competing transaction reach its invoice lock while collection is paused.
      await Bun.sleep(50);
      expect(credited).toBe(false);
    } finally {
      release.resolve();
      await collection;
      await credit;
    }
    expect(await getInvoice(f.organizationId, f.invoice.id)).toMatchObject({
      status: "paid",
      amountPaidCents: 10_000n,
    });
    expect((await listGrants(f.organizationId)).map((grant) => grant.amount)).toEqual([2_000n]);
  });

  test("credits wait for asynchronous payments to settle", async () => {
    const f = await fixture();
    f.fake.willCollect({ state: "processing" });
    await collectInvoiceNow(f.invoice.id, f.deps, now);
    await expect(f.credit()).rejects.toThrow("Wait for the payment to settle");
    expect(await listCreditNotes(f.organizationId)).toHaveLength(0);
  });

  test("a partially paid invoice rejects excess credit without losing any balance", async () => {
    const f = await fixture();
    await recordManualPayment({
      organizationId: f.organizationId,
      invoiceId: f.invoice.id,
      payment: { amountCents: 6_000n, method: "wire", reference: "partial", receivedAt: now },
      actor: f.actor,
      reason: "Test",
    });
    await expect(f.credit(8_000n)).rejects.toThrow("remaining balance");
    expect(await listCreditNotes(f.organizationId)).toHaveLength(0);
    expect((await getInvoice(f.organizationId, f.invoice.id))?.amountDueCents).toBe(4_000n);
    await f.credit(4_000n);
    expect((await getInvoice(f.organizationId, f.invoice.id))?.status).toBe("paid");
    await f.credit(4_000n);
    expect((await listGrants(f.organizationId)).map((grant) => grant.amount)).toEqual([4_000n]);
  });
});

describe("reminder schedule", () => {
  for (const firstOffset of [-3, 2]) {
    test(`reminders advance when the first run is due date ${firstOffset} days`, async () => {
      const f = await fixture();
      await db
        .update(schema.billingInvoice)
        .set({
          collectionMethod: "send_invoice",
          dueAt: now,
          nextCollectionAt: new Date(now.getTime() + firstOffset * day),
          syncAction: null,
          nextSyncAt: null,
        })
        .where(eq(schema.billingInvoice.id, f.invoice.id));
      const offsets = firstOffset < 0 ? [-3, 1, 7] : [2, 7];
      for (const [index, offset] of offsets.entries()) {
        const at = new Date(now.getTime() + offset * day);
        await runDueBillingCollection({ now: at, scope: f.scope });
        const nextOffset = offsets[index + 1];
        expect((await getInvoice(f.organizationId, f.invoice.id))?.nextCollectionAt).toEqual(
          nextOffset === undefined ? null : new Date(now.getTime() + nextOffset * day),
        );
      }
      const notifications = await db
        .select()
        .from(schema.billingNotification)
        .where(eq(schema.billingNotification.organizationId, f.organizationId));
      expect(notifications.filter((row) => row.kind === "invoice_reminder")).toHaveLength(
        offsets.length,
      );
    });
  }
});

test("usage batches reach active organizations and inactive holds beyond the first batch", async () => {
  const active = await createTestTenant();
  const held = await createTestTenant();
  await recordTestUsage({
    organizationId: active.organization.id,
    environmentId: active.production.id,
    meter: "email.recipients",
    quantity: 5_000,
    at: new Date(now.getTime() - 3_600_000),
  });
  await placeHold(db, held.organization.id, "spend_limit", "Previous month");
  const scope = { organizationIds: [active.organization.id, held.organization.id] };
  expect(await runBillingUsageChecks({ now, scope, limit: 1 })).toBe(2);
  expect(await holdsOf(held.organization.id)).toHaveLength(0);
  const alerts = await db
    .select()
    .from(schema.billingNotification)
    .where(eq(schema.billingNotification.organizationId, active.organization.id));
  expect(alerts.some((row) => row.kind === "usage_threshold")).toBe(true);
});

test("Stripe invoices reject manual payments before and after being pushed", async () => {
  const f = await fixture();
  for (const providerInvoiceId of [null, `in_external_${f.invoice.id}`]) {
    await db
      .update(schema.billingInvoice)
      .set({ provider: "stripe", providerInvoiceId })
      .where(eq(schema.billingInvoice.id, f.invoice.id));
    await expect(
      recordManualPayment({
        organizationId: f.organizationId,
        invoiceId: f.invoice.id,
        payment: { amountCents: 6_000n, method: "wire", receivedAt: now },
        actor: f.actor,
        reason: "Partial wire",
        now,
      }),
    ).rejects.toThrow("Manual payments aren't supported for Stripe invoices");
    expect(await getInvoice(f.organizationId, f.invoice.id)).toMatchObject({
      amountDueCents: 10_000n,
      amountPaidCents: 0n,
    });
  }
});

test("standing scans reach later pages even when earlier accounts stay overdue", async () => {
  const first = await fixture();
  const second = await fixture();
  for (const f of [first, second]) {
    await db
      .update(schema.billingInvoice)
      // Collection is over (every retry failed): only the hold is left to place.
      .set({ dueAt: new Date(now.getTime() - 30 * day), nextCollectionAt: null, syncAction: null })
      .where(eq(schema.billingInvoice.id, f.invoice.id));
  }
  const scope = { organizationIds: [first.organizationId, second.organizationId] };
  await runDueBillingCollection({ now, scope, limit: 1 });
  for (const f of [first, second]) {
    expect((await holdsOf(f.organizationId)).some((hold) => hold.reason === "delinquent")).toBe(
      true,
    );
  }
});

test("an old processing invoice does not occupy the collection batch", async () => {
  const processing = await fixture();
  const ready = await fixture();
  await db
    .update(schema.billingInvoice)
    .set({
      paymentState: "processing",
      syncAction: null,
      nextCollectionAt: new Date(now.getTime() - day),
    })
    .where(eq(schema.billingInvoice.id, processing.invoice.id));
  await db
    .update(schema.billingInvoice)
    .set({ syncAction: null, nextCollectionAt: now })
    .where(eq(schema.billingInvoice.id, ready.invoice.id));
  await runDueBillingCollection({
    now,
    limit: 1,
    scope: { organizationIds: [processing.organizationId, ready.organizationId] },
  });
  expect((await getInvoice(ready.organizationId, ready.invoice.id))?.syncAction).toBe("collect");
  expect(
    (await getInvoice(processing.organizationId, processing.invoice.id))?.syncAction,
  ).toBeNull();
});
