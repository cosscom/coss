import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { Environment } from "../types/environment.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/** `coss.environment`: which environment, project and organization the API key belongs to. */
export class EnvironmentResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().environment`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** The API key's environment, its project and organization, and the key itself. */
  get(options?: ReadOptions): Promise<CossResult<Environment>> {
    return this.#http.request<Environment>({
      method: "GET",
      path: "/v1/environment",
      signal: options?.signal,
    });
  }
}
