import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { CreateDomainParams, DeletedDomain, Domain } from "../types/domain.ts";
import type { List } from "../types/email.ts";
import { DmarcResource } from "./dmarc.ts";
import { ReceivingDomainsResource } from "./receiving-domains.ts";
import { TrackingDomainsResource } from "./tracking-domains.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.domains`: the domains live (`coss_live_…`) keys may send from. Domains belong to the
 * organization, so every API key of the organization sees the same ones.
 */
export class DomainsResource {
  readonly #http: HttpClient;
  /** Each domain's custom tracking domain: add and remove it. */
  readonly tracking: TrackingDomainsResource;
  /** Each domain's receiving hostname: start and stop receiving email at it. */
  readonly receiving: ReceivingDomainsResource;
  /** Each domain's DMARC status, guidance and aggregate reports. */
  readonly dmarc: DmarcResource;

  /** @internal Use `new Coss().domains`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.tracking = new TrackingDomainsResource(http);
    this.receiving = new ReceivingDomainsResource(http);
    this.dmarc = new DmarcResource(http);
  }

  /**
   * Adds a domain and returns the DNS records to publish (`data.records`). The records are
   * checked in the background; verification gives up after 72 hours.
   */
  create(params: CreateDomainParams, options?: RequestOptions): Promise<CossResult<Domain>> {
    return this.#http.request<Domain>({
      method: "POST",
      path: "/v1/domains",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Lists the organization's domains, ordered by name. */
  list(options?: ReadOptions): Promise<CossResult<List<Domain>>> {
    return this.#http.request<List<Domain>>({
      method: "GET",
      path: "/v1/domains",
      signal: options?.signal,
    });
  }

  /** Retrieves a domain with the result of the last DNS check. */
  get(id: string, options?: ReadOptions): Promise<CossResult<Domain>> {
    return this.#http.request<Domain>({
      method: "GET",
      path: `/v1/domains/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /**
   * Checks the domain's records now instead of waiting for the next background check. A `failed`
   * domain starts verification over with fresh DKIM records, which have to be published again.
   * Its tracking domain, if any, is checked too.
   */
  verify(id: string, options?: RequestOptions): Promise<CossResult<Domain>> {
    return this.#http.request<Domain>({
      method: "POST",
      path: `/v1/domains/${encodeURIComponent(id)}/verify`,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Removes the domain. Emails already sent are unaffected; live keys can no longer use it. */
  delete(id: string, options?: ReadOptions): Promise<CossResult<DeletedDomain>> {
    return this.#http.request<DeletedDomain>({
      method: "DELETE",
      path: `/v1/domains/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}
