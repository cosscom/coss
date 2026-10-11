import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type { ListWebhookDeliveriesParams, WebhookDelivery } from "../types/webhook-endpoint.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

const deliveriesPath = (endpointId: string) =>
  `/v1/webhook_endpoints/${encodeURIComponent(endpointId)}/deliveries`;

/**
 * `coss.webhookEndpoints.deliveries`: an endpoint's delivery log. Each delivery carries every
 * HTTP attempt and the payload as sent.
 */
export class WebhookDeliveriesResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().webhookEndpoints.deliveries`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /** Lists the endpoint's deliveries, newest first. Pass the last `id` as `after` while `has_more` is true. */
  list(
    endpointId: string,
    params: ListWebhookDeliveriesParams = {},
    options?: ReadOptions,
  ): Promise<CossResult<List<WebhookDelivery>>> {
    return this.#http.request<List<WebhookDelivery>>({
      method: "GET",
      path: deliveriesPath(endpointId),
      query: { ...params },
      signal: options?.signal,
    });
  }

  /** Retrieves one delivery of the endpoint. */
  get(endpointId: string, id: string, options?: ReadOptions): Promise<CossResult<WebhookDelivery>> {
    return this.#http.request<WebhookDelivery>({
      method: "GET",
      path: `${deliveriesPath(endpointId)}/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /**
   * Queues a finished delivery for one more attempt, made within seconds. A delivery that is
   * still `pending` is returned unchanged (it is already scheduled for `next_attempt_at`).
   * Never automatically retried: the API does not deduplicate replay requests, even with an
   * idempotency key.
   */
  retry(
    endpointId: string,
    id: string,
    options?: RequestOptions,
  ): Promise<CossResult<WebhookDelivery>> {
    return this.#http.request<WebhookDelivery>({
      method: "POST",
      path: `${deliveriesPath(endpointId)}/${encodeURIComponent(id)}/retry`,
      retry: false,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }
}
