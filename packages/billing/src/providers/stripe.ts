/**
 * Stripe as the payment rail: customers and their payment methods (Checkout in setup mode, the
 * Customer Portal), invoices COSS computed (one invoice item per COSS line, numbered as COSS
 * numbered them, finalized with `auto_advance: false` so COSS decides when to charge), charges,
 * and webhooks. Every write carries an idempotency key derived from COSS ids. Server-only.
 */
import type { PaymentMethodSummary } from "@coss/db/schema";
import Stripe from "stripe";
import type { BillingAccount, OrganizationLabel } from "../accounts.ts";
import type {
  BillingProvider,
  CollectResult,
  ProviderInvoice,
  ProviderInvoiceState,
  ProviderOutcome,
  PushResult,
  ReceivedProviderEvent,
} from "./provider.ts";

/** The API version requests use (the SDK's own, pinned with it). */
export const STRIPE_API_VERSION = "2026-08-26.dahlia";

/** Payment method types Checkout can set up (bank transfers are paid per invoice, not saved). */
const SETUP_METHODS = new Set(["card", "us_bank_account", "sepa_debit", "bacs_debit"]);

export type StripeOptions = {
  secretKey: string;
  /** Verifies webhook signatures (the dashboard's route). */
  webhookSecret?: string;
  /** Tests: a fake Stripe API (`FakeStripeApi.fetch`). */
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
};

export function createStripeClient(opts: StripeOptions): Stripe {
  return new Stripe(opts.secretKey, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(opts.fetch as typeof fetch | undefined),
    maxNetworkRetries: 2,
    timeout: 20_000,
    telemetry: false,
    appInfo: { name: "coss" },
  });
}

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

function customerIdOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function summarizePaymentMethod(method: Stripe.PaymentMethod): PaymentMethodSummary {
  const summary: PaymentMethodSummary = { type: method.type };
  if (method.card) {
    summary.brand = method.card.brand;
    summary.last4 = method.card.last4;
    summary.expMonth = method.card.exp_month;
    summary.expYear = method.card.exp_year;
  } else if (method.us_bank_account) {
    summary.bankName = method.us_bank_account.bank_name ?? undefined;
    summary.last4 = method.us_bank_account.last4 ?? undefined;
  } else if (method.sepa_debit) {
    summary.last4 = method.sepa_debit.last4 ?? undefined;
  } else if (method.bacs_debit) {
    summary.last4 = method.bacs_debit.last4 ?? undefined;
  }
  return summary;
}

/**
 * What a Stripe invoice paid of its own COSS invoice. Stripe marks an invoice below its minimum
 * charge paid without charging it and adds the amount, as a customer balance debit, to the next
 * invoice it finalizes. That part belongs to the earlier invoice, which COSS already settled
 * (`recordProviderPayment` accepts Stripe's paid state), so it must not count as an overpayment
 * of this one (it would become COSS credit). COSS never credits the Stripe balance (credit notes
 * refund or are out of band), so a negative starting balance doesn't occur.
 */
export function paidTowardInvoice(invoice: {
  amount_paid: number;
  starting_balance?: number | null;
}): bigint {
  const carriedDebit = Math.max(0, invoice.starting_balance ?? 0);
  return BigInt(Math.max(0, invoice.amount_paid - carriedDebit));
}

export class StripeBillingProvider implements BillingProvider {
  readonly name = "stripe" as const;
  readonly #stripe: Stripe;
  readonly #webhookSecret: string | undefined;

  constructor(opts: StripeOptions) {
    this.#stripe = createStripeClient(opts);
    this.#webhookSecret = opts.webhookSecret;
  }

  /** Verifies a webhook's signature and returns the event (throws when it doesn't verify). */
  async verifyWebhook(rawBody: string, signature: string): Promise<ReceivedProviderEvent> {
    if (!this.#webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
    const event = await this.#stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      this.#webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
    return { id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> };
  }

  async ensureCustomer(account: BillingAccount, organization: OrganizationLabel): Promise<string> {
    if (account.providerCustomerId) {
      await this.#syncCustomerDetails(account.providerCustomerId, account, organization.name);
      return account.providerCustomerId;
    }
    const customer = await this.#stripe.customers.create(
      {
        name: account.billingName ?? organization.name,
        ...(account.billingEmail ? { email: account.billingEmail } : {}),
        metadata: { coss_account_id: account.id, coss_organization_id: account.organizationId },
      },
      { idempotencyKey: `coss:customer:${account.id}` },
    );
    return customer.id;
  }

  async #syncCustomerDetails(
    customerId: string,
    account: BillingAccount,
    organizationName: string,
  ) {
    await this.#stripe.customers.update(customerId, {
      name: account.billingName ?? organizationName,
      // Without a billing email of COSS's, keep the customer's (set in the Customer Portal).
      ...(account.billingEmail ? { email: account.billingEmail } : {}),
    });
  }

  async pushInvoice({ invoice, lines, account }: ProviderInvoice): Promise<PushResult> {
    const customer = invoice.providerCustomerId;
    if (!customer) throw new Error(`Invoice ${invoice.id} has no Stripe customer.`);
    if (account) await this.#syncCustomerDetails(customer, account, invoice.organizationName);
    const key = `coss:invoice:${invoice.id}`;
    const sendInvoice = invoice.collectionMethod === "send_invoice";
    let stripeInvoice = invoice.providerInvoiceId
      ? await this.#stripe.invoices.retrieve(invoice.providerInvoiceId)
      : await this.#stripe.invoices.create(
          {
            customer,
            currency: invoice.currency,
            collection_method: invoice.collectionMethod,
            // COSS owns the due date. Relative days change on retries and can violate
            // Stripe's requirement that an idempotency key always has identical parameters.
            ...(sendInvoice
              ? { due_date: seconds(invoice.dueAt ?? invoice.finalizedAt ?? invoice.createdAt) }
              : {}),
            auto_advance: false,
            pending_invoice_items_behavior: "exclude",
            ...(invoice.number ? { number: invoice.number } : {}),
            ...(invoice.memo ? { description: invoice.memo } : {}),
            automatic_tax: { enabled: account?.taxMode === "stripe_automatic" },
            ...(account?.allowedPaymentMethods.length
              ? {
                  payment_settings: {
                    payment_method_types:
                      account.allowedPaymentMethods as Stripe.InvoiceCreateParams.PaymentSettings.PaymentMethodType[],
                  },
                }
              : {}),
            metadata: { coss_invoice_id: invoice.id, coss_organization_id: invoice.organizationId },
          },
          { idempotencyKey: `${key}:create` },
        );
    if (stripeInvoice.status === "draft") {
      for (const line of lines) {
        if (line.amountCents === 0n) continue;
        await this.#stripe.invoiceItems.create(
          {
            customer,
            invoice: stripeInvoice.id,
            currency: invoice.currency,
            amount: Number(line.amountCents),
            description: line.description,
            period: { start: seconds(line.periodStart), end: seconds(line.periodEnd) },
            metadata: { coss_line_id: line.id },
          },
          { idempotencyKey: `${key}:line:${line.id}` },
        );
      }
      stripeInvoice = await this.#stripe.invoices.finalizeInvoice(
        stripeInvoice.id,
        { auto_advance: false },
        { idempotencyKey: `${key}:finalize` },
      );
    }
    const taxCents = (stripeInvoice.total_taxes ?? []).reduce(
      (sum, tax) => sum + BigInt(tax.amount),
      0n,
    );
    return {
      providerInvoiceId: stripeInvoice.id,
      hostedUrl: stripeInvoice.hosted_invoice_url ?? null,
      pdfUrl: stripeInvoice.invoice_pdf ?? null,
      taxCents,
      totalCents: BigInt(stripeInvoice.total),
    };
  }

  async collect({ invoice, account }: ProviderInvoice): Promise<CollectResult> {
    const id = invoice.providerInvoiceId;
    if (!id) throw new Error(`Invoice ${invoice.id} wasn't pushed to Stripe.`);
    if (account && invoice.providerCustomerId) {
      await this.#syncCustomerDetails(
        invoice.providerCustomerId,
        account,
        invoice.organizationName,
      );
    }
    if (invoice.collectionMethod === "send_invoice") {
      await this.#stripe.invoices.sendInvoice(
        id,
        {},
        { idempotencyKey: `coss:invoice:${invoice.id}:send` },
      );
      return { state: "sent" };
    }
    // Stripe refuses to charge a customer without a default payment method (an invalid request,
    // not a declined card), so don't ask: the caller waits or duns. Checked live when COSS has
    // none recorded, since the Portal or Checkout may have added one before its event arrived.
    if (account && !account.paymentMethod && !(await this.paymentMethod(account))) {
      return { state: "no_payment_method" };
    }
    try {
      const paid = await this.#stripe.invoices.pay(
        id,
        { off_session: true },
        { idempotencyKey: `coss:invoice:${invoice.id}:pay:${invoice.collectionAttempts}` },
      );
      if (paid.status === "paid") {
        return {
          state: "paid",
          paymentId: await this.#paymentId(id),
          method: account?.paymentMethod?.type ?? "card",
          amountCents: paidTowardInvoice(paid),
        };
      }
      // A debit that settles over days: the outcome arrives as `invoice.paid` or `invoice.payment_failed`.
      return { state: "processing" };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        if (
          error.code === "authentication_required" ||
          error.code === "invoice_payment_intent_requires_action"
        ) {
          const current = await this.#stripe.invoices.retrieve(id);
          return { state: "requires_action", hostedUrl: current.hosted_invoice_url ?? null };
        }
        if (error.type === "StripeCardError") return { state: "failed", error: error.message };
        if (error.type === "StripeInvalidRequestError") {
          // Not a declined payment: read the invoice back. A retry that comes after the customer
          // paid on the hosted page ("Invoice is already paid") records that payment.
          const current = await this.#stripe.invoices.retrieve(id);
          if (current.status === "paid") {
            return {
              state: "paid",
              paymentId: await this.#paymentId(id),
              method: "stripe",
              amountCents: BigInt(current.amount_paid),
            };
          }
          // Voided or written off at Stripe meanwhile: no payment to fail. The sync retries and
          // reports it; a provider event or the reconcile brings the status.
          if (current.status !== "open") throw error;
          // Stripe won't charge this invoice as it stands (e.g. the default payment method isn't
          // one the invoice allows): the customer must act, as for a declined card.
          return { state: "failed", error: error.message };
        }
      }
      throw error;
    }
  }

  async #paymentId(invoiceId: string): Promise<string | null> {
    const payments = await this.#stripe.invoicePayments.list({ invoice: invoiceId, limit: 1 });
    const payment = payments.data[0]?.payment;
    if (!payment) return null;
    const ref = payment.payment_intent ?? payment.charge ?? payment.payment_record;
    return typeof ref === "string" ? ref : (ref?.id ?? payments.data[0]?.id ?? null);
  }

  async voidInvoice({ invoice }: ProviderInvoice): Promise<void> {
    if (!invoice.providerInvoiceId) return;
    const current = await this.#stripe.invoices.retrieve(invoice.providerInvoiceId);
    if (current.status === "draft") await this.#stripe.invoices.del(current.id);
    else if (current.status === "open") await this.#stripe.invoices.voidInvoice(current.id);
  }

  async markUncollectible({ invoice }: ProviderInvoice): Promise<void> {
    if (!invoice.providerInvoiceId) return;
    const current = await this.#stripe.invoices.retrieve(invoice.providerInvoiceId);
    if (current.status === "open") await this.#stripe.invoices.markUncollectible(current.id);
  }

  async createCreditNote(
    { invoice }: ProviderInvoice,
    note: { id: string; amountCents: bigint; refundCents: bigint; memo: string },
  ): Promise<{ providerCreditNoteId: string | null }> {
    if (!invoice.providerInvoiceId) return { providerCreditNoteId: null };
    // A previous attempt may have succeeded before its response was lost. In particular,
    // a full credit makes an open invoice paid, changing the parameters calculated below.
    for await (const existing of this.#stripe.creditNotes.list({
      invoice: invoice.providerInvoiceId,
      limit: 100,
    })) {
      if (existing.metadata?.coss_credit_note_id === note.id) {
        if (existing.status === "void")
          throw new Error(`Credit note ${existing.id} was voided at Stripe.`);
        return { providerCreditNoteId: existing.id };
      }
    }
    // On a paid invoice, Stripe needs the whole amount accounted for: what isn't refunded is
    // credit COSS keeps itself (a grant), i.e. out of band for Stripe.
    const current = await this.#stripe.invoices.retrieve(invoice.providerInvoiceId);
    const outOfBand = current.status === "paid" ? note.amountCents - note.refundCents : 0n;
    const created = await this.#stripe.creditNotes.create(
      {
        invoice: invoice.providerInvoiceId,
        amount: Number(note.amountCents),
        ...(note.refundCents > 0n ? { refund_amount: Number(note.refundCents) } : {}),
        ...(outOfBand > 0n ? { out_of_band_amount: Number(outOfBand) } : {}),
        memo: note.memo,
        metadata: { coss_credit_note_id: note.id },
      },
      { idempotencyKey: `coss:credit_note:${note.id}` },
    );
    return { providerCreditNoteId: created.id };
  }

  async fetchInvoice({ invoice }: ProviderInvoice): Promise<ProviderInvoiceState | null> {
    if (!invoice.providerInvoiceId) return null;
    const current = await this.#stripe.invoices.retrieve(invoice.providerInvoiceId);
    const status = current.status;
    if (status !== "open" && status !== "paid" && status !== "void" && status !== "uncollectible")
      return null;
    return {
      status: status as ProviderInvoiceState["status"],
      paidCents: paidTowardInvoice(current),
      paymentId: status === "paid" ? await this.#paymentId(current.id) : null,
      method: null,
    };
  }

  async createSetupSession(
    account: BillingAccount,
    organization: OrganizationLabel,
    opts: { returnUrl: string; cancelUrl: string; methods: string[] },
  ): Promise<{ url: string; sessionId: string }> {
    const customer = await this.ensureCustomer(account, organization);
    const methods = opts.methods.filter((method) => SETUP_METHODS.has(method));
    const success = new URL(opts.returnUrl);
    success.searchParams.set("setup", "{CHECKOUT_SESSION_ID}");
    const session = await this.#stripe.checkout.sessions.create({
      mode: "setup",
      customer,
      currency: "usd",
      payment_method_types: (methods.length
        ? methods
        : ["card"]) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      // Checkout percent-encodes the placeholder otherwise.
      success_url: success.toString().replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}"),
      cancel_url: opts.cancelUrl,
      metadata: { coss_account_id: account.id, coss_organization_id: account.organizationId },
    });
    if (!session.url) throw new Error("Stripe returned a Checkout session without a URL.");
    return { url: session.url, sessionId: session.id };
  }

  async completeSetup(
    account: BillingAccount,
    sessionId: string,
  ): Promise<PaymentMethodSummary | null> {
    const session = await this.#stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["setup_intent.payment_method"],
    });
    // Only this account's own session counts.
    if (
      customerIdOf(session.customer) !== account.providerCustomerId ||
      session.status !== "complete"
    )
      return null;
    const intent = session.setup_intent;
    const method = intent && typeof intent !== "string" ? intent.payment_method : null;
    if (!method || typeof method === "string") return null;
    await this.#stripe.customers.update(customerIdOf(session.customer) ?? "", {
      invoice_settings: { default_payment_method: method.id },
    });
    return summarizePaymentMethod(method);
  }

  async createPortalSession(
    account: BillingAccount,
    opts: { returnUrl: string },
  ): Promise<{ url: string } | null> {
    if (!account.providerCustomerId) return null;
    const session = await this.#stripe.billingPortal.sessions.create({
      customer: account.providerCustomerId,
      return_url: opts.returnUrl,
    });
    return { url: session.url };
  }

  async paymentMethod(account: BillingAccount): Promise<PaymentMethodSummary | null> {
    if (!account.providerCustomerId) return null;
    const customer = await this.#stripe.customers.retrieve(account.providerCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if (customer.deleted) return null;
    const method = customer.invoice_settings?.default_payment_method;
    return method && typeof method !== "string" ? summarizePaymentMethod(method) : null;
  }

  async interpretEvent(event: ReceivedProviderEvent): Promise<ProviderOutcome[]> {
    const object =
      (event.payload.data as { object?: Record<string, unknown> } | undefined)?.object ?? {};
    const objectId = typeof object.id === "string" ? object.id : null;
    switch (event.type) {
      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
      case "invoice.payment_action_required":
      case "invoice.voided":
      case "invoice.marked_uncollectible": {
        if (!objectId) return [];
        // The invoice as it is now, whatever the event's age.
        const invoice = await this.#stripe.invoices.retrieve(objectId);
        if (!invoice.metadata?.coss_invoice_id) return [];
        if (invoice.status === "paid") {
          return [
            {
              kind: "invoice_paid",
              providerInvoiceId: invoice.id,
              paymentId: await this.#paymentId(invoice.id),
              amountCents: paidTowardInvoice(invoice),
              method: "stripe",
            },
          ];
        }
        if (invoice.status === "void")
          return [{ kind: "invoice_voided", providerInvoiceId: invoice.id }];
        if (invoice.status === "uncollectible") {
          return [{ kind: "invoice_uncollectible", providerInvoiceId: invoice.id }];
        }
        if (event.type === "invoice.payment_failed") {
          return [
            {
              kind: "invoice_payment_failed",
              providerInvoiceId: invoice.id,
              error: "The payment failed.",
            },
          ];
        }
        if (event.type === "invoice.payment_action_required") {
          return [
            {
              kind: "invoice_action_required",
              providerInvoiceId: invoice.id,
              hostedUrl: invoice.hosted_invoice_url ?? null,
            },
          ];
        }
        return [];
      }
      case "checkout.session.completed":
      case "customer.updated": {
        const customerId =
          event.type === "customer.updated"
            ? objectId
            : customerIdOf(object.customer as string | null);
        if (!customerId) return [];
        if (event.type === "checkout.session.completed" && objectId) {
          const session = await this.#stripe.checkout.sessions.retrieve(objectId, {
            expand: ["setup_intent.payment_method"],
          });
          const intent = session.setup_intent;
          const method = intent && typeof intent !== "string" ? intent.payment_method : null;
          if (
            session.mode === "setup" &&
            session.status === "complete" &&
            method &&
            typeof method !== "string"
          ) {
            await this.#stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: method.id },
            });
          }
        }
        const customer = await this.#stripe.customers.retrieve(customerId, {
          expand: ["invoice_settings.default_payment_method"],
        });
        if (customer.deleted || !customer.metadata?.coss_account_id) return [];
        const method = customer.invoice_settings?.default_payment_method;
        return [
          {
            kind: "payment_method_updated",
            customerId,
            method: method && typeof method !== "string" ? summarizePaymentMethod(method) : null,
          },
        ];
      }
      case "charge.dispute.created": {
        const paymentIntent =
          typeof object.payment_intent === "string" ? object.payment_intent : null;
        let providerInvoiceId: string | null = null;
        if (paymentIntent) {
          const payments = await this.#stripe.invoicePayments.list({
            payment: { type: "payment_intent", payment_intent: paymentIntent },
            limit: 1,
          });
          const invoice = payments.data[0]?.invoice;
          providerInvoiceId = typeof invoice === "string" ? invoice : (invoice?.id ?? null);
        }
        return [
          {
            kind: "dispute_opened",
            providerInvoiceId,
            customerId: null,
            amountCents: BigInt(typeof object.amount === "number" ? object.amount : 0),
            reason: typeof object.reason === "string" ? object.reason : "unknown",
          },
        ];
      }
      default:
        return [];
    }
  }
}
