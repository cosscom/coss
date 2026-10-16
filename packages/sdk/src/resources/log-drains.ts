import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateLogDrainParams,
  DeletedLogDrain,
  ListLogDrainBatchesParams,
  LogDrain,
  LogDrainBatch,
  LogDrainWithSecret,
  UpdateLogDrainParams,
} from "../types/log-drain.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const drainPath = (id: string) => `/v1/log_drains/${encodeURIComponent(id)}`;

/** `coss.logDrains.batches`: a drain's delivery log, each batch with every HTTP attempt. */
export class LogDrainBatchesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().logDrains.batches`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists the drain's batches, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    drainId: string,
    params: ListLogDrainBatchesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<LogDrainBatch>>> {
    return this.#http.request<List<LogDrainBatch>>({
      method: "GET",
      path: `${drainPath(drainId)}/batches`,
      query: { ...params },
      signal: options?.signal,
    });
  }

  /** Retrieves one batch of the drain. */
  get(drainId: string, id: string, options?: ReadOptions): Promise<CossResult<LogDrainBatch>> {
    return this.#http.request<LogDrainBatch>({
      method: "GET",
      path: `${drainPath(drainId)}/batches/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}

/**
 * `coss.logDrains`: HTTPS endpoints the environment's log is streamed to (API requests, email
 * events, webhook attempts and audit events), in signed NDJSON batches. Drains belong to the API
 * key's own environment, so a `coss_test_…` key only ever manages sandbox drains.
 */
export class LogDrainsResource {
  readonly #http: HttpClient;
  /** Each drain's delivery log. */
  readonly batches: LogDrainBatchesResource;

  /** @internal Use `new Coss().logDrains`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.batches = new LogDrainBatchesResource(http);
  }

  /**
   * Creates a drain. The result carries its `secret` (returned only here) — store it and pass it
   * to `verifyLogDrainBatch` for every request. Creation is never automatically retried: the API
   * does not deduplicate it. After a lost response, list drains and remove the one with the
   * unknown secret before creating a replacement.
   */
  create(
    params: CreateLogDrainParams,
    options?: RequestOptions,
  ): Promise<CossResult<LogDrainWithSecret>> {
    return this.#http.request<LogDrainWithSecret>({
      method: "POST",
      path: "/v1/log_drains",
      retry: false,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Lists the environment's drains, oldest first. Secrets are never included. */
  list(options?: ReadOptions): Promise<CossResult<List<LogDrain>>> {
    return this.#http.request<List<LogDrain>>({
      method: "GET",
      path: "/v1/log_drains",
      signal: options?.signal,
    });
  }

  /** Retrieves a drain of the API key's environment. */
  get(id: string, options?: ReadOptions): Promise<CossResult<LogDrain>> {
    return this.#http.request<LogDrain>({
      method: "GET",
      path: drainPath(id),
      signal: options?.signal,
    });
  }

  /**
   * Changes the URL, description, sources or `enabled` flag. The signing secret stays the same.
   * Disabling drops the lines still waiting for the drain; enabling it again (also after coss.com
   * disabled it for failing) sends lines logged from then on.
   */
  update(
    id: string,
    params: UpdateLogDrainParams,
    options?: ReadOptions,
  ): Promise<CossResult<LogDrain>> {
    return this.#http.request<LogDrain>({
      method: "PATCH",
      path: drainPath(id),
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes the drain and its batch log. To pause it instead, update `enabled` to false. */
  delete(id: string, options?: ReadOptions): Promise<CossResult<DeletedLogDrain>> {
    return this.#http.request<DeletedLogDrain>({
      method: "DELETE",
      path: drainPath(id),
      signal: options?.signal,
    });
  }
}
