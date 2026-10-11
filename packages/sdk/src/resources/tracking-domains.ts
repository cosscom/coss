import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { CreateTrackingDomainParams, Domain } from "../types/domain.ts";

type DeleteOptions = Pick<RequestOptions, "signal">;

const trackingPath = (domainId: string) => `/v1/domains/${encodeURIComponent(domainId)}/tracking`;

/**
 * `coss.domains.tracking`: a domain's custom tracking domain (e.g. `links.acme.com`). Open pixels
 * and click redirects of emails sent from the domain use it while it is `active`.
 */
export class TrackingDomainsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().domains.tracking`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Sets up a subdomain of the domain as its tracking domain and returns the domain, with the
   * CNAME to publish in `data.tracking.record`. Setup gives up after 72 hours.
   */
  create(
    domainId: string,
    params: CreateTrackingDomainParams,
    options?: RequestOptions,
  ): Promise<CossResult<Domain>> {
    return this.#http.request<Domain>({
      method: "POST",
      path: trackingPath(domainId),
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /**
   * Removes the domain's tracking domain. Later emails use the default tracking host; links in
   * emails already sent through it stop working.
   */
  delete(domainId: string, options?: DeleteOptions): Promise<CossResult<Domain>> {
    return this.#http.request<Domain>({
      method: "DELETE",
      path: trackingPath(domainId),
      signal: options?.signal,
    });
  }
}
