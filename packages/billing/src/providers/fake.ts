/**
 * A provider that moves no money: every charge succeeds unless told otherwise (`willCollect`).
 * Development (`BILLING_PROVIDER=fake`) and tests. State lives in the process.
 */
import type { PaymentMethodSummary } from "@coss/db/schema";
import type { BillingAccount } from "../accounts.ts";
import type {
  BillingProvider,
  CollectResult,
  ProviderInvoice,
  ProviderOutcome,
  ReceivedProviderEvent,
} from "./provider.ts";

export type FakeProviderCall = { op: string; invoiceId?: string; accountId?: string };

export class FakeBillingProvider implements BillingProvider {
  readonly name = "fake" as const;
  readonly calls: FakeProviderCall[] = [];
  readonly #collects: CollectResult[] = [];
  readonly #failures = new Map<string, number>();
  readonly #methods = new Map<string, PaymentMethodSummary>();
  readonly #log: boolean;

  constructor(opts: { log?: boolean } = {}) {
    this.#log = opts.log ?? false;
  }

  /** The next `collect` calls return these, in order (then they succeed again). */
  willCollect(...results: CollectResult[]): void {
    this.#collects.push(...results);
  }

  /** The next `times` calls of `op` throw (a provider outage). */
  fail(op: string, times = 1): void {
    this.#failures.set(op, (this.#failures.get(op) ?? 0) + times);
  }

  #call(op: string, ids: { invoiceId?: string; accountId?: string } = {}): void {
    this.calls.push({ op, ...ids });
    const left = this.#failures.get(op) ?? 0;
    if (left > 0) {
      this.#failures.set(op, left - 1);
      throw new Error(`Fake billing provider: ${op} failed.`);
    }
    if (this.#log) console.info(`[billing:fake] ${op}`, ids);
  }

  async ensureCustomer(account: BillingAccount) {
    this.#call("ensureCustomer", { accountId: account.id });
    return account.providerCustomerId ?? `cus_fake_${account.id}`;
  }

  async pushInvoice({ invoice }: ProviderInvoice) {
    this.#call("pushInvoice", { invoiceId: invoice.id });
    return { providerInvoiceId: `in_fake_${invoice.id}`, hostedUrl: null, pdfUrl: null };
  }

  async collect({ invoice }: ProviderInvoice): Promise<CollectResult> {
    this.#call("collect", { invoiceId: invoice.id });
    const scripted = this.#collects.shift();
    if (scripted) return scripted;
    if (invoice.collectionMethod === "send_invoice") return { state: "sent" };
    return {
      state: "paid",
      paymentId: `pay_fake_${invoice.id}_${this.calls.length}`,
      method: "card",
      amountCents: invoice.amountDueCents,
    };
  }

  async voidInvoice({ invoice }: ProviderInvoice) {
    this.#call("voidInvoice", { invoiceId: invoice.id });
  }

  async markUncollectible({ invoice }: ProviderInvoice) {
    this.#call("markUncollectible", { invoiceId: invoice.id });
  }

  async createCreditNote({ invoice }: ProviderInvoice, note: { id: string }) {
    this.#call("createCreditNote", { invoiceId: invoice.id });
    return { providerCreditNoteId: `cn_fake_${note.id}` };
  }

  async fetchInvoice({ invoice }: ProviderInvoice) {
    this.#call("fetchInvoice", { invoiceId: invoice.id });
    return null;
  }

  async createSetupSession(account: BillingAccount, _org: unknown, opts: { returnUrl: string }) {
    this.#call("createSetupSession", { accountId: account.id });
    const sessionId = `cs_fake_${account.id}_${this.calls.length}`;
    const url = new URL(opts.returnUrl);
    url.searchParams.set("setup", sessionId);
    return { url: url.toString(), sessionId };
  }

  async completeSetup(account: BillingAccount) {
    this.#call("completeSetup", { accountId: account.id });
    const method: PaymentMethodSummary = {
      type: "card",
      brand: "visa",
      last4: "4242",
      expMonth: 12,
      expYear: new Date().getUTCFullYear() + 3,
    };
    this.#methods.set(account.id, method);
    return method;
  }

  async createPortalSession(account: BillingAccount, opts: { returnUrl: string }) {
    this.#call("createPortalSession", { accountId: account.id });
    return { url: opts.returnUrl };
  }

  async paymentMethod(account: BillingAccount) {
    return this.#methods.get(account.id) ?? account.paymentMethod ?? null;
  }

  /** Test events carry their outcomes: `{ outcomes: ProviderOutcome[] }` (amounts as strings). */
  async interpretEvent(event: ReceivedProviderEvent): Promise<ProviderOutcome[]> {
    this.#call("interpretEvent");
    const outcomes = event.payload.outcomes;
    if (!Array.isArray(outcomes)) return [];
    return outcomes.map((outcome) => {
      const value = { ...(outcome as Record<string, unknown>) };
      if (typeof value.amountCents === "string") value.amountCents = BigInt(value.amountCents);
      return value as ProviderOutcome;
    });
  }
}
