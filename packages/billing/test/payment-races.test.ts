import { expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { createCreditNote, createOneOffInvoice, runDueCreditNoteSync } from "../src/adjustments.ts";
import { endContract, startUpgrade } from "../src/changes.ts";
import { contractAt } from "../src/contracts.ts";
import { applyOutcome } from "../src/events.ts";
import { listGrants } from "../src/grants.ts";
import { getInvoice } from "../src/invoices.ts";
import { collectInvoiceNow, runDueBillingSync } from "../src/sync.ts";
import { testBillingProviders } from "../src/testing.ts";

const now = new Date("2026-10-12T12:00:00Z");
async function fixture() {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const actor = { userId: tenant.owner.id, email: tenant.owner.email };
  const input = {
    organizationId,
    plan: "pro" as const,
    userId: actor.userId,
    defaultProvider: "fake" as const,
    now,
  };
  const { fake, providers } = testBillingProviders();
  const deps = { providers, dashboardUrl: "https://coss.test" };
  return {
    tenant,
    organizationId,
    actor,
    input,
    fake,
    deps,
    scope: { organizationIds: [organizationId] },
  };
}

test("replacement during push preserves the provider invoice for voiding and late payments", async () => {
  const f = await fixture();
  const old = await startUpgrade(f.input);
  if (!old.invoice) throw new Error("missing invoice");
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const push = f.fake.pushInvoice.bind(f.fake);
  f.fake.pushInvoice = async (input) => {
    const result = await push(input);
    entered.resolve();
    await release.promise;
    return result;
  };
  const syncing = runDueBillingSync({ now, scope: f.scope }, f.deps);
  await entered.promise;
  try {
    await startUpgrade(f.input);
  } finally {
    release.resolve();
    await syncing;
  }
  const row = await getInvoice(f.organizationId, old.invoice.id);
  expect(row).toMatchObject({
    status: "void",
    providerInvoiceId: `in_fake_${old.invoice.id}`,
    syncAction: "void",
  });
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  expect(f.fake.calls.some((c) => c.op === "voidInvoice")).toBe(true);
  await applyOutcome(
    {
      kind: "invoice_paid",
      providerInvoiceId: `in_fake_${old.invoice.id}`,
      paymentId: `pay_${old.invoice.id}`,
      amountCents: old.invoice.totalCents,
      method: "card",
    },
    "fake",
    {},
    now,
  );
  expect((await listGrants(f.organizationId)).map((g) => g.amount)).toEqual([
    old.invoice.totalCents,
  ]);
});

test("ending a pending contract voids its invoice without collecting", async () => {
  const f = await fixture();
  const old = await startUpgrade(f.input);
  if (!old.invoice) throw new Error("missing invoice");
  await endContract({
    organizationId: f.organizationId,
    contractId: old.contract.id,
    at: null,
    defaultProvider: "fake",
    actor: f.actor,
    reason: "Cancel",
    now,
  });
  await collectInvoiceNow(old.invoice.id, f.deps, now);
  expect((await getInvoice(f.organizationId, old.invoice.id))?.status).toBe("void");
  expect(f.fake.calls.some((c) => c.op === "collect")).toBe(false);
  expect(await contractAt(f.organizationId, now)).toBeNull();
  expect(await listGrants(f.organizationId)).toHaveLength(0);
});

for (const credit of [2000n, 10000n]) {
  test(`a hosted payment overtaking a ${credit} cent credit grants the excess once`, async () => {
    const f = await fixture();
    const invoice = await createOneOffInvoice({
      organizationId: f.organizationId,
      lines: [{ description: "Service", amountCents: 10000n }],
      memo: null,
      defaultProvider: "fake",
      actor: f.actor,
      reason: "Test",
      now,
    });
    await runDueBillingSync({ now, scope: f.scope }, f.deps);
    await createCreditNote({
      organizationId: f.organizationId,
      invoiceId: invoice.id,
      amountCents: credit,
      refundCents: 0n,
      memo: "Correction",
      actor: f.actor,
      reason: "Test",
      now,
    });
    await applyOutcome(
      {
        kind: "invoice_paid",
        providerInvoiceId: `in_fake_${invoice.id}`,
        paymentId: `pay_${invoice.id}`,
        amountCents: 10000n,
        method: "card",
      },
      "fake",
      {},
      now,
    );
    await applyOutcome(
      {
        kind: "invoice_paid",
        providerInvoiceId: `in_fake_${invoice.id}`,
        paymentId: `pay_${invoice.id}`,
        amountCents: 10000n,
        method: "card",
      },
      "fake",
      {},
      now,
    );
    await runDueCreditNoteSync({ now, scope: f.scope }, f.deps);
    expect(await getInvoice(f.organizationId, invoice.id)).toMatchObject({
      status: "paid",
      amountPaidCents: 10000n,
      amountDueCents: 0n,
    });
    expect((await listGrants(f.organizationId)).map((g) => g.amount)).toEqual([credit]);
  });
}

test("collection and replacement serialize without deadlocking", async () => {
  const f = await fixture();
  const old = await startUpgrade(f.input);
  if (!old.invoice) throw new Error("missing invoice");
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const collect = f.fake.collect.bind(f.fake);
  f.fake.collect = async (input) => {
    const result = await collect(input);
    entered.resolve();
    await release.promise;
    return result;
  };
  const collecting = collectInvoiceNow(old.invoice.id, f.deps, now);
  await entered.promise;
  const replacing = startUpgrade(f.input).then(
    () => null,
    (error: unknown) => error,
  );
  await Bun.sleep(100);
  release.resolve();
  const [collection, replacement] = await Promise.all([collecting, replacing]);
  const row = await getInvoice(f.organizationId, old.invoice.id);
  expect(collection?.state).toBe("paid");
  expect(String(replacement)).toContain("isn't an upgrade");
  expect(row?.syncError).toBeNull();
  expect(row?.status).toBe("paid");
});

test("canceling a pending contract waits for an asynchronous payment", async () => {
  const f = await fixture();
  const upgrade = await startUpgrade(f.input);
  if (!upgrade.invoice) throw new Error("missing invoice");
  f.fake.willCollect({ state: "processing" });
  await collectInvoiceNow(upgrade.invoice.id, f.deps, now);
  await expect(
    endContract({
      organizationId: f.organizationId,
      contractId: upgrade.contract.id,
      at: null,
      defaultProvider: "fake",
      actor: f.actor,
      reason: "Cancel",
      now,
    }),
  ).rejects.toThrow("still being processed");
  expect((await getInvoice(f.organizationId, upgrade.invoice.id))?.status).toBe("open");
});

test("a canceled push resumes after a lost provider response and is then voided", async () => {
  const f = await fixture();
  const upgrade = await startUpgrade(f.input);
  if (!upgrade.invoice) throw new Error("missing invoice");
  const push = f.fake.pushInvoice.bind(f.fake);
  f.fake.pushInvoice = async (input) => {
    await push(input);
    throw new Error("Lost provider response");
  };
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  await endContract({
    organizationId: f.organizationId,
    contractId: upgrade.contract.id,
    at: null,
    defaultProvider: "fake",
    actor: f.actor,
    reason: "Cancel",
    now,
  });
  expect(await getInvoice(f.organizationId, upgrade.invoice.id)).toMatchObject({
    status: "void",
    syncAction: "push",
  });
  f.fake.pushInvoice = push;
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  await runDueBillingSync({ now, scope: f.scope }, f.deps);
  expect(await getInvoice(f.organizationId, upgrade.invoice.id)).toMatchObject({
    status: "void",
    syncAction: null,
    providerInvoiceId: `in_fake_${upgrade.invoice.id}`,
  });
  expect(f.fake.calls.filter((c) => c.op === "voidInvoice")).toHaveLength(1);
  expect(f.fake.calls.filter((c) => c.op === "collect")).toHaveLength(0);
});
