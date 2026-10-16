/**
 * Where money moves. coss.com computes every invoice; a provider only stores the customer and their
 * payment methods, issues the invoices coss.com pushes and collects them. Stripe is the default; the
 * manual provider is for deals invoiced off-Stripe (an admin records payments); the fake one is
 * for development and tests. Chosen per billing account.
 */
import type { PaymentMethodSummary } from "@coss/db/schema";
import type { BillingAccount, OrganizationLabel } from "../accounts.ts";
import type { InvoiceLineRow, InvoiceRow } from "../invoices.ts";

export type ProviderInvoice = {
  invoice: InvoiceRow;
  lines: InvoiceLineRow[];
  /** `null` once the organization (and its account) is deleted: use the invoice's copies. */
  account: BillingAccount | null;
};

export type PushResult = {
  providerInvoiceId: string | null;
  hostedUrl: string | null;
  pdfUrl: string | null;
  /** Tax the provider added (automatic tax), and the total including it. */
  taxCents?: bigint;
  totalCents?: bigint;
};

export type CollectResult =
  | { state: "paid"; paymentId: string | null; method: string; amountCents: bigint }
  /** An async payment (direct debit) is underway; its outcome arrives as an event. */
  | { state: "processing" }
  /** The customer must confirm (3-D Secure) on the hosted invoice page. */
  | { state: "requires_action"; hostedUrl: string | null }
  | { state: "failed"; error: string }
  /**
   * Nothing was charged: the customer has no payment method yet (an upgrade's customer may be
   * adding one in Checkout right now). The caller decides whether to wait or dun.
   */
  | { state: "no_payment_method" }
  /** `send_invoice`: the invoice was sent; the customer pays it by its due date. */
  | { state: "sent" };

export type ProviderInvoiceState = {
  status: "open" | "paid" | "void" | "uncollectible";
  paidCents: bigint;
  paymentId: string | null;
  method: string | null;
};

/** What a provider event means for coss.com (the provider reads the object's current state). */
export type ProviderOutcome =
  | {
      kind: "invoice_paid";
      providerInvoiceId: string;
      paymentId: string | null;
      amountCents: bigint;
      method: string;
    }
  | { kind: "invoice_payment_failed"; providerInvoiceId: string; error: string }
  | { kind: "invoice_payment_processing"; providerInvoiceId: string }
  | { kind: "invoice_action_required"; providerInvoiceId: string; hostedUrl: string | null }
  | { kind: "invoice_voided"; providerInvoiceId: string }
  | { kind: "invoice_uncollectible"; providerInvoiceId: string }
  | { kind: "payment_method_updated"; customerId: string; method: PaymentMethodSummary | null }
  | {
      kind: "dispute_opened";
      providerInvoiceId: string | null;
      customerId: string | null;
      amountCents: bigint;
      reason: string;
    };

/** An event as received from the provider (verified). */
export type ReceivedProviderEvent = { id: string; type: string; payload: Record<string, unknown> };

export interface BillingProvider {
  readonly name: BillingAccount["provider"];
  /** The account's customer at the provider, created if needed (`null`: the provider has none). */
  ensureCustomer(account: BillingAccount, organization: OrganizationLabel): Promise<string | null>;
  /** Creates the invoice with its lines, numbered as coss.com numbered it, and finalizes it. Idempotent. */
  pushInvoice(input: ProviderInvoice): Promise<PushResult>;
  /** Charges the default payment method, or sends the invoice (`send_invoice`). */
  collect(input: ProviderInvoice): Promise<CollectResult>;
  voidInvoice(input: ProviderInvoice): Promise<void>;
  markUncollectible(input: ProviderInvoice): Promise<void>;
  createCreditNote(
    input: ProviderInvoice,
    note: { id: string; amountCents: bigint; refundCents: bigint; memo: string },
  ): Promise<{ providerCreditNoteId: string | null }>;
  fetchInvoice(input: ProviderInvoice): Promise<ProviderInvoiceState | null>;
  /** A hosted page where the customer adds a payment method (`null`: not supported). */
  createSetupSession(
    account: BillingAccount,
    organization: OrganizationLabel,
    opts: { returnUrl: string; cancelUrl: string; methods: string[] },
  ): Promise<{ url: string; sessionId: string } | null>;
  /** Reads a finished setup session: makes its method the default and returns it. */
  completeSetup(account: BillingAccount, sessionId: string): Promise<PaymentMethodSummary | null>;
  /** A hosted page to manage payment methods and billing details (`null`: not supported). */
  createPortalSession(
    account: BillingAccount,
    opts: { returnUrl: string },
  ): Promise<{ url: string } | null>;
  /** The default payment method, as the provider has it. */
  paymentMethod(account: BillingAccount): Promise<PaymentMethodSummary | null>;
  /** What a stored event means now (re-reading the object, so stale or repeated events are harmless). */
  interpretEvent(event: ReceivedProviderEvent): Promise<ProviderOutcome[]>;
}

export type BillingProviders = Partial<Record<BillingAccount["provider"], BillingProvider>>;

export function providerFor(
  providers: BillingProviders,
  name: BillingAccount["provider"],
): BillingProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Billing provider "${name}" is not configured in this process.`);
  return provider;
}
