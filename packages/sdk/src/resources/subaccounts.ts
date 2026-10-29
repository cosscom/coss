import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateSubaccountParams,
  ListSubaccountsParams,
  Subaccount,
  UpdateSubaccountParams,
} from "../types/subaccount.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const subaccountPath = (subaccount: string) => `/v1/subaccounts/${encodeURIComponent(subaccount)}`;

/**
 * `coss.email.subaccounts`: email for platforms. Each of your users gets their own domains,
 * suppressions, quotas and reputation; name one on a send with `subaccount` (its id or your uid).
 */
export class SubaccountsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.subaccounts`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Creates a sub-account. Never automatically retried (the API does not deduplicate it). */
  create(
    params: CreateSubaccountParams,
    options?: RequestOptions,
  ): Promise<CossResult<Subaccount>> {
    return this.#http.request<Subaccount>({
      method: "POST",
      path: "/v1/subaccounts",
      retry: false,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Lists the environment's sub-accounts, newest first. */
  list(
    params: ListSubaccountsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<Subaccount>>> {
    return this.#http.request<List<Subaccount>>({
      method: "GET",
      path: "/v1/subaccounts",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves a sub-account by its id or uid, with its quotas and reputation. */
  get(subaccount: string, options?: ReadOptions): Promise<CossResult<Subaccount>> {
    return this.#http.request<Subaccount>({
      method: "GET",
      path: subaccountPath(subaccount),
      signal: options?.signal,
    });
  }

  /** Changes the name, uid, metadata, status or quotas; fields left out keep their value. */
  update(
    subaccount: string,
    params: UpdateSubaccountParams,
    options?: ReadOptions,
  ): Promise<CossResult<Subaccount>> {
    return this.#http.request<Subaccount>({
      method: "PATCH",
      path: subaccountPath(subaccount),
      body: params,
      signal: options?.signal,
    });
  }

  /**
   * Starts deleting the sub-account: its sends are refused at once, then its domains are released
   * and it is removed with its suppressions. Returns it with `status: "deleting"`.
   */
  delete(subaccount: string, options?: ReadOptions): Promise<CossResult<Subaccount>> {
    return this.#http.request<Subaccount>({
      method: "DELETE",
      path: subaccountPath(subaccount),
      signal: options?.signal,
    });
  }
}
