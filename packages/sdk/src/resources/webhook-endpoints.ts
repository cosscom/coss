import type { CossResult } from "../core/errors.ts";
import type { HttpClient, RequestOptions } from "../core/http.ts";
import type { List } from "../types/email.ts";
import type {
  CreateWebhookEndpointParams,
  DeletedWebhookEndpoint,
  RecoverWebhookEndpointParams,
  RollWebhookEndpointSecretParams,
  UpdateWebhookEndpointParams,
  WebhookEndpoint,
  WebhookEndpointRecovery,
  WebhookEndpointWithSecret,
} from "../types/webhook-endpoint.ts";
import { WebhookDeliveriesResource } from "./webhook-deliveries.ts";

type ReadOptions = Pick<RequestOptions, "signal">;

/**
 * `coss.webhookEndpoints`: the URLs that receive signed event notifications. Endpoints belong to
 * the API key's own environment, so a `coss_test_…` key only ever manages sandbox endpoints.
 */
export class WebhookEndpointsResource {
  readonly #http: HttpClient;
  /** Each endpoint's delivery log: list, retrieve and retry deliveries. */
  readonly deliveries: WebhookDeliveriesResource;

  /** @internal Use `new Coss().webhookEndpoints`. */
  constructor(http: HttpClient) {
    this.#http = http;
    this.deliveries = new WebhookDeliveriesResource(http);
  }

  /**
   * Creates an endpoint. The result carries its `secret` (returned again only by `rollSecret`) —
   * store it and pass it to `verifyWebhook` for every delivery. Creation is never automatically retried:
   * the API does not deduplicate it, even with an idempotency key. After a lost response,
   * list endpoints and remove the endpoint with the unknown secret before creating a replacement.
   */
  create(
    params: CreateWebhookEndpointParams,
    options?: RequestOptions,
  ): Promise<CossResult<WebhookEndpointWithSecret>> {
    return this.#http.request<WebhookEndpointWithSecret>({
      method: "POST",
      path: "/v1/webhook_endpoints",
      retry: false,
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
   * stays the same (see `rollSecret`), so receivers keep verifying deliveries.
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

  /**
   * Replaces the endpoint's signing secret; the result carries the new `secret`. Until
   * `previous_secret_expires_at` (a day by default), deliveries are signed with both secrets, so
   * `verifyWebhook` accepts them with either: deploy the new one, then let the old one expire.
   * Never automatically retried (a second roll would stop the original secret at once): after a
   * lost response, roll again and deploy that secret.
   */
  rollSecret(
    id: string,
    params: RollWebhookEndpointSecretParams = {},
    options?: RequestOptions,
  ): Promise<CossResult<WebhookEndpointWithSecret>> {
    return this.#http.request<WebhookEndpointWithSecret>({
      method: "POST",
      path: `/v1/webhook_endpoints/${encodeURIComponent(id)}/roll_secret`,
      retry: false,
      body: params,
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
    });
  }

  /**
   * Queues the endpoint's deliveries that failed since `since` for one more attempt each (at most
   * 1,000 per call; while `has_more` is true, call again with the same `since`), e.g. after fixing a
   * receiver that was down. The endpoint must be enabled.
   */
  recover(
    id: string,
    params: RecoverWebhookEndpointParams,
    options?: RequestOptions,
  ): Promise<CossResult<WebhookEndpointRecovery>> {
    const since = params.since instanceof Date ? params.since.toISOString() : params.since;
    return this.#http.request<WebhookEndpointRecovery>({
      method: "POST",
      path: `/v1/webhook_endpoints/${encodeURIComponent(id)}/recover`,
      body: { since },
      idempotencyKey: options?.idempotencyKey,
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
