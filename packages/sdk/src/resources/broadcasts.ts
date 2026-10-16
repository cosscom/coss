import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type {
  Broadcast,
  BroadcastEmailList,
  BroadcastTest,
  CreateBroadcastParams,
  DeletedBroadcast,
  ListBroadcastEmailsParams,
  ListBroadcastsParams,
  SendBroadcastParams,
  TestBroadcastParams,
  UpdateBroadcastParams,
} from "../types/broadcast.ts";
import type { List } from "../types/email.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const path = (id: string) => encodeURIComponent(id);

/**
 * `coss.email.broadcasts`: one marketing email to an audience or a segment, sent to each
 * subscribed contact at the plan's marketing rate, with per-broadcast stats.
 */
export class BroadcastsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().email.broadcasts`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Newest first, with their stats. */
  list(
    params: ListBroadcastsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<Broadcast>>> {
    return this.#http.request({
      method: "GET",
      path: "/v1/broadcasts",
      query: { ...params },
      signal: options?.signal,
    });
  }

  /**
   * Creates a draft, or with `send` / `scheduled_at` a broadcast that starts sending. Retries
   * reuse one `Idempotency-Key`, so a retried create never makes two.
   */
  create(params: CreateBroadcastParams, options?: RequestOptions): Promise<CossResult<Broadcast>> {
    return this.#http.request({
      method: "POST",
      path: "/v1/broadcasts",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  get(id: string, options?: ReadOptions): Promise<CossResult<Broadcast>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/broadcasts/${path(id)}`,
      signal: options?.signal,
    });
  }

  /** Changes a draft. */
  update(
    id: string,
    params: UpdateBroadcastParams,
    options?: ReadOptions,
  ): Promise<CossResult<Broadcast>> {
    return this.#http.request({
      method: "PATCH",
      path: `/v1/broadcasts/${path(id)}`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes a draft (or a broadcast canceled before it sent anything). */
  remove(id: string, options?: ReadOptions): Promise<CossResult<DeletedBroadcast>> {
    return this.#http.request({
      method: "DELETE",
      path: `/v1/broadcasts/${path(id)}`,
      signal: options?.signal,
    });
  }

  /** Starts sending a draft, now or at `scheduled_at`. */
  send(
    id: string,
    params: SendBroadcastParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<Broadcast>> {
    return this.#http.request({
      method: "POST",
      path: `/v1/broadcasts/${path(id)}/send`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Stops it for good; emails not yet handed to the provider are dropped. */
  cancel(id: string, options?: ReadOptions): Promise<CossResult<Broadcast>> {
    return this.#action(id, "cancel", options);
  }

  pause(id: string, options?: ReadOptions): Promise<CossResult<Broadcast>> {
    return this.#action(id, "pause", options);
  }

  /** Resumes a paused broadcast where it stopped. */
  resume(id: string, options?: ReadOptions): Promise<CossResult<Broadcast>> {
    return this.#action(id, "resume", options);
  }

  /**
   * Sends its content to up to 5 addresses (subject prefixed `[Test]`). Not retried
   * automatically: test emails are not deduplicated.
   */
  test(
    id: string,
    params: TestBroadcastParams,
    options?: ReadOptions,
  ): Promise<CossResult<BroadcastTest>> {
    return this.#http.request({
      method: "POST",
      path: `/v1/broadcasts/${path(id)}/test`,
      body: params,
      retry: false,
      signal: options?.signal,
    });
  }

  /** The emails made so far, one per contact, newest first. */
  listEmails(
    id: string,
    params: ListBroadcastEmailsParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<BroadcastEmailList>> {
    return this.#http.request({
      method: "GET",
      path: `/v1/broadcasts/${path(id)}/emails`,
      query: { ...params },
      signal: options?.signal,
    });
  }

  #action(
    id: string,
    action: "cancel" | "pause" | "resume",
    options?: ReadOptions,
  ): Promise<CossResult<Broadcast>> {
    return this.#http.request({
      method: "POST",
      path: `/v1/broadcasts/${path(id)}/${action}`,
      signal: options?.signal,
    });
  }
}
