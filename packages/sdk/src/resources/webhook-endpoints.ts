import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateWebhookEndpointParams,
  DeletedWebhookEndpoint,
  UpdateWebhookEndpointParams,
  WebhookEndpoint,
  WebhookEndpointWithSecret,
} from "../types/webhook-endpoint.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.webhookEndpoints`: the URLs that receive signed event notifications. Endpoints belong to
 * the API key's own environment, so a `coss_test_…` key only ever manages sandbox endpoints.
 */
export class WebhookEndpointsResource {
  readonly #http: HttpClient;

  /** @internal Use `new Coss().webhookEndpoints`. */
  constructor(http: HttpClient) {
    this.#http = http;
  }

  /**
   * Creates an endpoint. The result is the only place its `secret` is returned — store it and
   * pass it to `verifyWebhook` for every delivery.
   */
  create(
    params: CreateWebhookEndpointParams,
    options?: RequestOptions,
  ): Promise<CossResult<WebhookEndpointWithSecret>> {
    return this.#http.request<WebhookEndpointWithSecret>({
      method: "POST",
      path: "/v1/webhook_endpoints",
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /** Lists the environment's endpoints, oldest first. Secrets are never included. */
  list(options?: ReadOptions): Promise<CossResult<List<WebhookEndpoint>>> {
    return this.#http.request<List<WebhookEndpoint>>({
      method: "GET",
      path: "/v1/webhook_endpoints",
      signal: options?.signal,
    });
  }

  /** Retrieves an endpoint of the API key's environment. */
  get(id: string, options?: ReadOptions): Promise<CossResult<WebhookEndpoint>> {
    return this.#http.request<WebhookEndpoint>({
      method: "GET",
      path: `/v1/webhook_endpoints/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }

  /**
   * Changes the URL, description, subscribed event types or `enabled` flag. The signing secret
   * never changes, so receivers keep verifying deliveries.
   */
  update(
    id: string,
    params: UpdateWebhookEndpointParams,
    options?: ReadOptions,
  ): Promise<CossResult<WebhookEndpoint>> {
    return this.#http.request<WebhookEndpoint>({
      method: "PATCH",
      path: `/v1/webhook_endpoints/${encodeURIComponent(id)}`,
      body: params,
      signal: options?.signal,
    });
  }

  /** Deletes the endpoint and its delivery log. To pause it instead, update `enabled` to false. */
  delete(id: string, options?: ReadOptions): Promise<CossResult<DeletedWebhookEndpoint>> {
    return this.#http.request<DeletedWebhookEndpoint>({
      method: "DELETE",
      path: `/v1/webhook_endpoints/${encodeURIComponent(id)}`,
      signal: options?.signal,
    });
  }
}
