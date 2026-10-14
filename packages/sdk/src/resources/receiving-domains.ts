import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { CreateReceivingDomainParams, Domain } from "../types/domain.ts";

type DeleteOptions = Pick<RequestOptions, "signal">;

const receivingPath = (domainId: string) => `/v1/domains/${encodeURIComponent(domainId)}/receiving`;

/**
 * `coss.domains.receiving`: a domain's receiving hostname (the domain itself or a subdomain, e.g.
 * `inbound.acme.com`). Email sent to any address at it is received by the API key's environment.
 */
export class ReceivingDomainsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().domains.receiving`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Starts receiving at a hostname of the domain, for the API key's environment, and returns the
   * domain with the MX record to publish in `data.receiving.record`.
   */
  create(
    domainId: string,
    params: CreateReceivingDomainParams,
    options?: RequestOptions,
  ): Promise<CossResult<Domain>> {
    return this.#http.request<Domain>({
      method: "POST",
      path: receivingPath(domainId),
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Stops receiving at the domain's hostname. Emails already received are kept. */
  delete(domainId: string, options?: DeleteOptions): Promise<CossResult<Domain>> {
    return this.#http.request<Domain>({
      method: "DELETE",
      path: receivingPath(domainId),
      signal: options?.signal,
    });
  }
}
