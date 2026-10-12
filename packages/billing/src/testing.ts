/**
 * Billing test fixtures: providers, contracts and usage inserted directly (tests never truncate;
 * every helper works on the organization it is given), and a fake Stripe API for the Stripe
 * provider. Requires the `@coss/db/testing` preload for the database helpers.
 */
import { db, schema } from "@coss/db";
import { lockBillingAccount, type ProviderName } from "./accounts.ts";
import type { MeterKey } from "./catalog/meters.ts";
import { type Contract, insertContract } from "./contracts.ts";
import { FakeBillingProvider } from "./providers/fake.ts";
import { manualBillingProvider } from "./providers/manual.ts";
import type { BillingProviders } from "./providers/provider.ts";
import { type ContractTermsInput, parseContractTerms } from "./schemas.ts";
import { floorHour } from "./time.ts";

export { FakeBillingProvider } from "./providers/fake.ts";

export function testBillingProviders(): { fake: FakeBillingProvider; providers: BillingProviders } {
  const fake = new FakeBillingProvider();
  return { fake, providers: { fake, manual: manualBillingProvider } };
}

/** A confirmed contract inserted as is (no invoice): the state a month close starts from. */
export async function createTestContract(
  organizationId: string,
  terms: ContractTermsInput,
  opts: {
    effectiveFrom: Date;
    effectiveUntil?: Date | null;
    kind?: Contract["kind"];
    termEnd?: Date | null;
    autoRenew?: boolean;
    provider?: ProviderName;
  },
): Promise<Contract> {
  return db.transaction(async (tx) => {
    const account = await lockBillingAccount(tx, organizationId, opts.provider ?? "fake");
    return insertContract(
      tx,
      {
        organizationId,
        accountId: account.id,
        kind: opts.kind ?? "self_serve",
        status: "confirmed",
        terms: parseContractTerms(terms),
        effectiveFrom: opts.effectiveFrom,
        effectiveUntil: opts.effectiveUntil ?? null,
        termEnd: opts.termEnd ?? null,
        autoRenew: opts.autoRenew ?? false,
      },
      opts.effectiveFrom,
    );
  });
}

/** Usage at a given hour (as if metered then). */
export async function recordTestUsage(input: {
  organizationId: string;
  environmentId: string;
  meter: MeterKey;
  quantity: number;
  at: Date;
  dimension?: string;
}): Promise<void> {
  await db
    .insert(schema.billingUsage)
    .values({
      organizationId: input.organizationId,
      environmentId: input.environmentId,
      meter: input.meter,
      dimension: input.dimension ?? "",
      hourStart: floorHour(input.at),
      shard: 0,
      quantity: input.quantity,
    })
    .onConflictDoNothing();
}

type StripeObject = Record<string, unknown> & { id: string };

/**
 * An in-memory Stripe API for `StripeBillingProvider` (its `fetch`): customers, invoices and
 * their items, payments, Checkout setup sessions, portal sessions and credit notes. Requests are
 * recorded with their idempotency keys; a repeated key replays the first response.
 */
export class FakeStripeApi {
  readonly requests: {
    method: string;
    path: string;
    params: Record<string, string>;
    idempotencyKey: string | null;
  }[] = [];
  readonly customers = new Map<string, StripeObject>();
  readonly invoices = new Map<string, StripeObject>();
  readonly sessions = new Map<string, StripeObject>();
  readonly paymentMethods = new Map<string, StripeObject>();
  /** How the next `pay` calls end (then `paid`). */
  readonly payOutcomes: ("paid" | "declined" | "authentication_required" | "processing")[] = [];
  #replies = new Map<string, { status: number; body: unknown }>();
  #ids = 0;

  #id(prefix: string): string {
    this.#ids++;
    return `${prefix}_fake${this.#ids}`;
  }

  /** Completes a setup session as if the customer added a card in Checkout. */
  completeSession(sessionId: string): StripeObject {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`No session ${sessionId}`);
    const method = {
      id: this.#id("pm"),
      object: "payment_method",
      type: "card",
      card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 },
    };
    this.paymentMethods.set(method.id, method);
    session.status = "complete";
    session.setup_intent = {
      id: this.#id("seti"),
      object: "setup_intent",
      payment_method: method.id,
    };
    return method;
  }

  readonly fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
    );
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const idempotencyKey = headers.get("idempotency-key");
    const body = typeof init?.body === "string" ? init.body : "";
    const params = Object.fromEntries(
      new URLSearchParams(method === "GET" || method === "DELETE" ? url.search : body),
    );
    this.requests.push({ method, path: url.pathname, params, idempotencyKey });
    const replayKey = idempotencyKey ? `${method} ${url.pathname} ${idempotencyKey}` : null;
    const cached = replayKey ? this.#replies.get(replayKey) : undefined;
    const reply = cached ?? this.#handle(method, url.pathname, params);
    if (replayKey && !cached) this.#replies.set(replayKey, reply);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "content-type": "application/json", "request-id": "req_fake" },
    });
  };

  #handle(
    method: string,
    path: string,
    params: Record<string, string>,
  ): { status: number; body: unknown } {
    const ok = (body: unknown) => ({ status: 200, body });
    const notFound = {
      status: 404,
      body: { error: { type: "invalid_request_error", message: `No such object: ${path}` } },
    };
    const parts = path.split("/").filter(Boolean).slice(1); // drop "v1"
    const [resource, id, action] = parts;
    const metadata = (prefix = "metadata") =>
      Object.fromEntries(
        Object.entries(params)
          .filter(([key]) => key.startsWith(`${prefix}[`))
          .map(([key, value]) => [key.slice(prefix.length + 1, -1), value]),
      );

    if (resource === "customers") {
      if (method === "POST" && !id) {
        const customer = {
          id: this.#id("cus"),
          object: "customer",
          name: params.name ?? null,
          email: params.email ?? null,
          metadata: metadata(),
          invoice_settings: { default_payment_method: null as unknown },
        };
        this.customers.set(customer.id, customer);
        return ok(customer);
      }
      const customer = id ? this.customers.get(id) : undefined;
      if (!customer) return notFound;
      if (method === "POST") {
        const pm = params["invoice_settings[default_payment_method]"];
        if (pm) customer.invoice_settings = { default_payment_method: pm };
        return ok(customer);
      }
      const settings = customer.invoice_settings as { default_payment_method: unknown };
      const pm =
        typeof settings.default_payment_method === "string"
          ? this.paymentMethods.get(settings.default_payment_method)
          : null;
      return ok({ ...customer, invoice_settings: { default_payment_method: pm ?? null } });
    }

    if (resource === "invoices") {
      if (method === "POST" && !id) {
        const invoice = {
          id: this.#id("in"),
          object: "invoice",
          status: "draft",
          customer: params.customer,
          collection_method: params.collection_method,
          number: params.number ?? null,
          metadata: metadata(),
          total: 0,
          amount_paid: 0,
          amount_due: 0,
          total_taxes: [],
          hosted_invoice_url: null as string | null,
          invoice_pdf: null as string | null,
          auto_advance: params.auto_advance === "true",
          automatic_tax: params["automatic_tax[enabled]"] === "true",
        };
        this.invoices.set(invoice.id, invoice);
        return ok(invoice);
      }
      const invoice = id ? this.invoices.get(id) : undefined;
      if (!invoice) return notFound;
      if (method === "DELETE") {
        this.invoices.delete(invoice.id);
        return ok({ id: invoice.id, object: "invoice", deleted: true });
      }
      if (method === "GET") return ok(invoice);
      switch (action) {
        case "finalize":
          invoice.status = "open";
          invoice.amount_due = invoice.total;
          invoice.hosted_invoice_url = `https://invoice.stripe.test/${invoice.id}`;
          invoice.invoice_pdf = `https://invoice.stripe.test/${invoice.id}.pdf`;
          return ok(invoice);
        case "pay": {
          const outcome = this.payOutcomes.shift() ?? "paid";
          if (outcome === "declined") {
            return {
              status: 402,
              body: {
                error: {
                  type: "card_error",
                  code: "card_declined",
                  message: "Your card was declined.",
                },
              },
            };
          }
          if (outcome === "authentication_required") {
            return {
              status: 402,
              body: {
                error: {
                  type: "card_error",
                  code: "authentication_required",
                  message: "This payment requires authentication.",
                },
              },
            };
          }
          if (outcome === "paid") {
            invoice.status = "paid";
            invoice.amount_paid = invoice.total;
            invoice.amount_due = 0;
          }
          return ok(invoice);
        }
        case "send":
          return ok(invoice);
        case "void":
          invoice.status = "void";
          return ok(invoice);
        case "mark_uncollectible":
          invoice.status = "uncollectible";
          return ok(invoice);
        default:
          return notFound;
      }
    }

    if (resource === "invoiceitems" && method === "POST") {
      const invoice = this.invoices.get(params.invoice ?? "");
      if (invoice?.status !== "draft") return notFound;
      invoice.total = (invoice.total as number) + Number(params.amount ?? 0);
      return ok({
        id: this.#id("ii"),
        object: "invoiceitem",
        invoice: invoice.id,
        amount: Number(params.amount),
      });
    }

    if (resource === "invoice_payments" && method === "GET") {
      const invoice = this.invoices.get(params.invoice ?? "");
      const data =
        invoice?.status === "paid"
          ? [
              {
                id: this.#id("inpay"),
                object: "invoice_payment",
                invoice: invoice.id,
                payment: { type: "payment_intent", payment_intent: `pi_for_${invoice.id}` },
              },
            ]
          : [];
      return ok({ object: "list", data, has_more: false, url: "/v1/invoice_payments" });
    }

    if (resource === "checkout" && id === "sessions") {
      const sessionId = action;
      if (method === "POST" && !sessionId) {
        const session = {
          id: this.#id("cs"),
          object: "checkout.session",
          mode: params.mode,
          customer: params.customer,
          status: "open",
          url: "",
          success_url: params.success_url,
          setup_intent: null as unknown,
          metadata: metadata(),
        };
        session.url = `https://checkout.stripe.test/${session.id}`;
        this.sessions.set(session.id, session);
        return ok(session);
      }
      const session = sessionId ? this.sessions.get(sessionId) : undefined;
      if (!session) return notFound;
      const intent = session.setup_intent as { payment_method?: string } | null;
      const pm = intent?.payment_method ? this.paymentMethods.get(intent.payment_method) : null;
      return ok({ ...session, setup_intent: intent ? { ...intent, payment_method: pm } : null });
    }

    if (resource === "billing_portal" && method === "POST") {
      return ok({
        id: this.#id("bps"),
        object: "billing_portal.session",
        url: `https://billing.stripe.test/${params.customer}`,
      });
    }

    if (resource === "credit_notes" && method === "POST") {
      return ok({
        id: this.#id("cn"),
        object: "credit_note",
        invoice: params.invoice,
        amount: Number(params.amount),
      });
    }

    return notFound;
  }
}
