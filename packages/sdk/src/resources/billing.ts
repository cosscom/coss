import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type {
  Billing,
  Credit,
  Invoice,
  InvoiceSummary,
  ListCreditsParams,
  ListInvoicesParams,
  ListUsageParams,
  Usage,
} from "../types/billing.ts";
import type { List } from "../types/email.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/** `coss.billing.invoices`: the organization's invoices, newest first. */
export class BillingInvoicesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().billing.invoices`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists invoices (without lines). Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListInvoicesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<InvoiceSummary>>> {
    return this.#http.request<List<InvoiceSummary>>({
      method: "GET",
      path: "/v1/billing/invoices",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves one invoice with its lines. */
  get(id: string, options?: ReadOptions): Promise<CossResult<Invoice>> {
    return this.#http.request<Invoice>({
      method: "GET",
      path: `/v1/billing/invoices/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}

/** `coss.billing.credits`: the organization's credits and what's left of them. */
export class BillingCreditsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().billing.credits`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists credits, newest first (usable ones by default). */
  list(params: ListCreditsParams = {}, options?: ReadOptions): Promise<CossResult<List<Credit>>> {
    return this.#http.request<List<Credit>>({
      method: "GET",
      path: "/v1/billing/credits",
      query: listQuery(params),
      signal: options?.signal,
    });
  }
}

/**
 * `coss.billing`: the organization's plan, usage, invoices and credits (read only; plan changes
 * are made in the dashboard). Organization-wide, whichever environment the key belongs to.
 */
export class BillingResource {
  readonly #http: HttpClient;
  readonly invoices: BillingInvoicesResource;
  readonly credits: BillingCreditsResource;

  /** @internal Use `new Coss().billing`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.invoices = new BillingInvoicesResource(http);
    this.credits = new BillingCreditsResource(http);
  }

  /** The plan, the current month's usage and estimate, standing and what the plan includes. */
  get(options?: ReadOptions): Promise<CossResult<Billing>> {
    return this.#http.request<Billing>({
      method: "GET",
      path: "/v1/billing",
      signal: options?.signal,
    });
  }

  /** Billable usage per meter and bucket (the current month, by day, by default), oldest first. */
  usage(params: ListUsageParams = {}, options?: ReadOptions): Promise<CossResult<List<Usage>>> {
    return this.#http.request<List<Usage>>({
      method: "GET",
      path: "/v1/billing/usage",
      query: listQuery(params),
      signal: options?.signal,
    });
  }
}
