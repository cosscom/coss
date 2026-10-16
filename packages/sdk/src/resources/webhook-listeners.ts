import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type {
  CreateWebhookListenerParams,
  DeletedWebhookListener,
  PollWebhookListenerParams,
  WebhookListener,
  WebhookListenerPoll,
} from "../types/webhook-listener.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.webhookListeners`: what `coss listen` uses to forward an environment's events to a local
 * server. A listener receives events created after it opens, while it is polled; it is closed by
 * `delete` or after 10 minutes without a poll.
 */
export class WebhookListenersResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().webhookListeners`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Opens a listener. Never retried automatically: a lost answer leaves one to expire. */
  create(
    params: CreateWebhookListenerParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<WebhookListener>> {
    return this.#http.request<WebhookListener>({
      method: "POST",
      path: "/v1/webhook_listeners",
      retry: false,
      body: params,
      signal: options?.signal,
    });
  }

  /**
   * Acknowledges earlier deliveries and waits (up to `wait_ms`) for more. Never retried
   * automatically: call it in a loop, and keep unacknowledged acks for the next call after an error.
   */
  poll(
    id: string,
    params: PollWebhookListenerParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<WebhookListenerPoll>> {
    return this.#http.request<WebhookListenerPoll>({
      method: "POST",
      path: `/v1/webhook_listeners/${encodeURIComponent(id)}/poll`,
      retry: false,
      body: params,
      signal: options?.signal,
    });
  }

  /** Closes a listener: it receives nothing more. */
  delete(id: string, options?: ReadOptions): Promise<CossResult<DeletedWebhookListener>> {
    return this.#http.request<DeletedWebhookListener>({
      method: "DELETE",
      path: `/v1/webhook_listeners/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}
