import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type { ListLogsParams, Log } from "../types/log.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

function joined(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.length === 0 ? undefined : value.join(",");
  return String(value);
}

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
    const query: Record<string, string | undefined> = {};
    for (const [name, value] of Object.entries(params)) query[name] = joined(value);
    return this.#http.request<List<Log>>({
      method: "GET",
      path: "/v1/logs",
      query,
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
