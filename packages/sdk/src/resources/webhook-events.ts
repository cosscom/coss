import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { SendTestWebhookEventParams, WebhookTestEvent } from "../types/webhook-endpoint.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/** `coss.webhookEvents`: test events, to try webhook handlers without making the real thing happen. */
export class WebhookEventsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().webhookEvents`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Sends a sample event of `type` to the environment's subscribed endpoints and open listeners,
   * exactly as a real one is sent. Sandbox keys only. Never retried automatically: a retry would
   * send a second event.
   */
  test(
    params: SendTestWebhookEventParams,
    options?: ReadOptions,
  ): Promise<CossResult<WebhookTestEvent>> {
    return this.#http.request<WebhookTestEvent>({
      method: "POST",
      path: "/v1/webhook_events/test",
      retry: false,
      body: params,
      signal: options?.signal,
    });
  }
}
