import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CheckSuppressionParams,
  CreateSuppressionParams,
  DeletedSuppression,
  ListSuppressionsParams,
  Suppression,
  SuppressionCheck,
} from "../types/suppression.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.email.suppressions`: the suppression list of the API key's environment. Sends skip
 * suppressed recipients; permanent bounces and complaints are added automatically.
 */
export class SuppressionResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.suppressions`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Suppresses an address for every email (`scope: "*"`, the default) or for one category, e.g.
   * when a recipient unsubscribes. Returns the existing entry if there already is one.
   */
  add(params: CreateSuppressionParams, options?: RequestOptions): Promise<CossResult<Suppression>> {
    return this.#http.request<Suppression>({
      method: "POST",
      path: "/v1/suppressions",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Lists entries, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    params: ListSuppressionsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<Suppression>>> {
    return this.#http.request<List<Suppression>>({
      method: "GET",
      path: "/v1/suppressions",
      query: { ...params },
      signal: options?.signal,
    });
  }

  /** Whether a send to `address` (with `category`, if given) would skip it. */
  check(
    params: CheckSuppressionParams,
    options?: ReadOptions,
  ): Promise<CossResult<SuppressionCheck>> {
    return this.#http.request<SuppressionCheck>({
      method: "GET",
      path: "/v1/suppressions/check",
      query: { ...params },
      signal: options?.signal,
    });
  }

  /** Retrieves one entry. */
  get(id: string, options?: ReadOptions): Promise<CossResult<Suppression>> {
    return this.#http.request<Suppression>({
      method: "GET",
      path: `/v1/suppressions/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /** Removes an entry, so later sends reach the address again (e.g. when a recipient resubscribes). */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedSuppression>> {
    return this.#http.request<DeletedSuppression>({
      method: "DELETE",
      path: `/v1/suppressions/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}
