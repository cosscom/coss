import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { StorageSettings, UpdateStorageSettingsParams } from "../types/storage.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.email.storage`: whether coss.com keeps the content of the API key's environment's emails
 * (`"store"`, the default) or only until each one is sent (`"discard"`). Emails keep the setting
 * that applied when they were sent.
 */
export class StorageResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.storage`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** The environment's storage settings. */
  get(options?: ReadOptions): Promise<CossResult<StorageSettings>> {
    return this.#http.request<StorageSettings>({
      method: "GET",
      path: "/v1/storage_settings",
      signal: options?.signal,
    });
  }

  /** Changes what emails sent from now on keep; emails already sent keep their setting. */
  update(
    params: UpdateStorageSettingsParams,
    options?: ReadOptions,
  ): Promise<CossResult<StorageSettings>> {
    return this.#http.request<StorageSettings>({
      method: "PATCH",
      path: "/v1/storage_settings",
      body: params,
      signal: options?.signal,
    });
  }
}
