import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CheckSuppressionParams,
  CreateSuppressionParams,
  DeletedSuppression,
  ExportSuppressionsParams,
  ImportSuppressionsParams,
  ListSuppressionsParams,
  Suppression,
  SuppressionCheck,
  SuppressionImport,
} from "../types/suppression.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/** The API's per-request maximum for imports. */
const IMPORT_BATCH_SIZE = 1000;

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

  /**
   * Adds many entries at once (reason `import`), 1,000 per request. Invalid entries are skipped
   * and reported in `invalid`; entries already on the list count as `existing`. If a request
   * fails, the earlier batches stay imported: importing everything again is safe.
   */
  async import(
    params: ImportSuppressionsParams,
    options?: ReadOptions,
  ): Promise<CossResult<SuppressionImport>> {
    const total: SuppressionImport = {
      object: "suppression_import",
      created: 0,
      existing: 0,
      invalid: [],
    };
    // An empty list still gets one request, so the API reports it like any other invalid input.
    for (let start = 0; start === 0 || start < params.suppressions.length; ) {
      const batch = params.suppressions.slice(start, start + IMPORT_BATCH_SIZE);
      const result = await this.#http.request<SuppressionImport>({
        method: "POST",
        path: "/v1/suppressions/import",
        body: {
          ...(params.subaccount === undefined ? {} : { subaccount: params.subaccount }),
          suppressions: batch,
        },
        signal: options?.signal,
      });
      if (result.error) return result;
      total.created += result.data.created;
      total.existing += result.data.existing;
      for (const entry of result.data.invalid) {
        total.invalid.push({ ...entry, index: entry.index + start });
      }
      start += IMPORT_BATCH_SIZE;
    }
    return { data: total, error: null };
  }

  /**
   * The whole list as CSV (`address,scope,reason,created_at,email_id,id`, oldest first), which
   * `import` (or the dashboard) accepts again.
   */
  export(
    params: ExportSuppressionsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<string>> {
    return this.#http.request<string>({
      method: "GET",
      path: "/v1/suppressions/export",
      query: { ...params },
      responseType: "text",
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
