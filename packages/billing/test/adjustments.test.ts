import { describe, expect, test } from "bun:test";
import { ADMIN_ACTIONS } from "@coss/tenancy/admin";
import { createTestTenant } from "@coss/tenancy/testing";
import { createCreditNote, createOneOffInvoice } from "../src/adjustments.ts";
import type { BillingAdminAction } from "../src/audit.ts";
import { listGrants } from "../src/grants.ts";
import { getInvoice } from "../src/invoices.ts";
import { recordManualPayment } from "../src/payments.ts";

describe("admin adjustments", () => {
  test("a one-off invoice, part credited while open, the rest paid and credited back as credit", async () => {
    const tenant = await createTestTenant();
    const org = tenant.organization.id;
    const actor = { userId: tenant.owner.id, email: tenant.owner.email };
    const invoice = await createOneOffInvoice({
      organizationId: org,
      lines: [
        { description: "Onboarding", amountCents: 50_000n },
        { description: "Onboarding discount", amountCents: -10_000n },
      ],
      memo: "Per order form 42",
      defaultProvider: "manual",
      actor,
      reason: "Order form",
    });
    expect(invoice).toMatchObject({
      kind: "one_off",
      status: "open",
      totalCents: 40_000n,
      provider: "manual",
    });

    await createCreditNote({
      organizationId: org,
      invoiceId: invoice.id,
      amountCents: 5_000n,
      refundCents: 0n,
      memo: "Goodwill",
      actor,
      reason: "Ticket 9",
    });
    expect((await getInvoice(org, invoice.id))?.amountDueCents).toBe(35_000n);

    await recordManualPayment({
      organizationId: org,
      invoiceId: invoice.id,
      payment: { amountCents: 35_000n, method: "wire", reference: "W-1", receivedAt: new Date() },
      actor,
      reason: "Wire received",
    });
    expect((await getInvoice(org, invoice.id))?.status).toBe("paid");

    // On a paid invoice, what isn't refunded becomes credit for later invoices.
    await createCreditNote({
      organizationId: org,
      invoiceId: invoice.id,
      amountCents: 10_000n,
      refundCents: 0n,
      memo: "Price correction",
      actor,
      reason: "Ticket 10",
    });
    const credit = (await listGrants(org)).find((grant) => grant.source === "refund");
    expect(credit).toMatchObject({ amount: 10_000n, appliesTo: "any" });
    // Never more than the invoice.
    await expect(
      createCreditNote({
        organizationId: org,
        invoiceId: invoice.id,
        amountCents: 30_000n,
        refundCents: 0n,
        memo: "Too much",
        actor,
        reason: "x",
      }),
    ).rejects.toThrow("more than");
    // Refunds only of what was paid (nothing was paid by a provider here).
    await expect(
      createCreditNote({
        organizationId: org,
        invoiceId: invoice.id,
        amountCents: 1_000n,
        refundCents: 36_000n,
        memo: "Refund",
        actor,
        reason: "x",
      }),
    ).rejects.toThrow();
  });

  test("every billing audit action is a known admin action", () => {
    const actions: BillingAdminAction[] = [
      "billing.account_updated",
      "billing.contract_created",
      "billing.contract_canceled",
      "billing.credit_granted",
      "billing.credit_voided",
      "billing.invoice_created",
      "billing.invoice_voided",
      "billing.invoice_paid",
      "billing.invoice_uncollectible",
      "billing.invoice_resynced",
      "billing.credit_note_created",
      "billing.hold_placed",
      "billing.hold_lifted",
    ];
    for (const action of actions) expect(ADMIN_ACTIONS as readonly string[]).toContain(action);
  });
});
