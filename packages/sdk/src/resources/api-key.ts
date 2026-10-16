import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { DeletedApiKey } from "../types/environment.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/** `coss.apiKey`: the API key the client was created with. */
export class ApiKeyResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().apiKey`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Revokes the client's own API key, at once: every later request with it fails. */
  revoke(options?: ReadOptions): Promise<CossResult<DeletedApiKey>> {
    return this.#http.request<DeletedApiKey>({
      method: "DELETE",
      path: "/v1/api_key",
      signal: options?.signal,
    });
  }
}
