import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { DedicatedIpPool } from "../types/dedicated-ip.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.email.dedicatedIps`: the organization's own sending IPs (the Dedicated IPs add-on),
 * managed and warmed up automatically.
 */
export class DedicatedIpsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.dedicatedIps`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** The pool's status and IPs (`not_enabled` without the add-on). */
  get(options?: ReadOptions): Promise<CossResult<DedicatedIpPool>> {
    return this.#http.request<DedicatedIpPool>({
      method: "GET",
      path: "/v1/dedicated_ips",
      signal: options?.signal,
    });
  }
}
