import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type { ListLogsParams, Log } from "../types/log.ts";
import { listQuery } from "./list-query.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.logs`: the API key's environment log, newest first: API requests made with its keys,
 * email events and webhook delivery attempts.
 */
export class LogsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().logs`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Lists log lines, newest first (the last hour unless `from`/`to` say otherwise). Pass the last
   * `id` as `after` while `has_more` is true.
   */
  list(params: ListLogsParams = {}, options?: ReadOptions): Promise<CossResult<List<Log>>> {
    return this.#http.request<List<Log>>({
      method: "GET",
      path: "/v1/logs",
      query: listQuery(params),
      signal: options?.signal,
    });
  }

  /** Retrieves one log line. */
  get(id: string, options?: ReadOptions): Promise<CossResult<Log>> {
    return this.#http.request<Log>({
      method: "GET",
      path: `/v1/logs/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}
