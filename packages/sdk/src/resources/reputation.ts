import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { Reputation } from "../types/reputation.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.reputation`: the organization's standing with the COSS reputation guard, which suspends
 * live sending automatically when bounce or complaint rates cross its thresholds.
 */
export class ReputationResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().reputation`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** The current status and the latest rates measured over live environments. */
  get(options?: ReadOptions): Promise<CossResult<Reputation>> {
    return this.#http.request<Reputation>({
      method: "GET",
      path: "/v1/reputation",
      signal: options?.signal,
    });
  }
}
