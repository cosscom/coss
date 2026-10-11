/**
 * Webhook endpoint wire types (endpoint management). The body COSS posts to an endpoint is
 * `WebhookEvent` in `./webhook.ts`.
 */
import type { EmailEventType } from "./email.ts";
import type { AccountEventType } from "./webhook.ts";

/** Every event type an endpoint can subscribe to. */
export type WebhookEventType = EmailEventType | AccountEventType;

/** A URL of the API key's environment that receives signed event notifications. */
export interface WebhookEndpoint {
  object: "webhook_endpoint";
  id: string;
  url: string;
  description: string | null;
  /**
   * Event types delivered to this endpoint. An empty array means every event type, including
   * ones added later.
   */
  event_types: string[];
  /** A disabled endpoint receives nothing until it is enabled again. */
  enabled: boolean;
  /** ISO 8601 timestamp. */
  created_at: string;
  updated_at: string;
}

/** A freshly created endpoint: the only response that carries the signing secret. */
export interface WebhookEndpointWithSecret extends WebhookEndpoint {
  /**
   * The endpoint's `whsec_…` signing secret, for `verifyWebhook`. Returned only here — store it
   * now; it cannot be read back through the API.
   */
  secret: string;
}

/** Body of `POST /v1/webhook_endpoints`. */
export interface CreateWebhookEndpointParams {
  /** An `https://` URL COSS posts events to. */
  url: string;
  /** A note for your own reference. */
  description?: string | null;
  /** Defaults to every event type, including ones added later. */
  event_types?: WebhookEventType[];
}

/** Body of `PATCH /v1/webhook_endpoints/{id}`. Omitted fields keep their current value. */
export interface UpdateWebhookEndpointParams {
  url?: string;
  /** `null` clears the description. */
  description?: string | null;
  event_types?: WebhookEventType[];
  enabled?: boolean;
}

/** Returned by `webhookEndpoints.delete`. */
export interface DeletedWebhookEndpoint {
  object: "webhook_endpoint";
  id: string;
  deleted: true;
}

/**
 * `pending`: waiting for its next attempt. `succeeded`: the endpoint answered with a 2xx status.
 * `failed`: every attempt failed, or the endpoint was disabled.
 */
export type WebhookDeliveryStatus = "pending" | "succeeded" | "failed";

/** One HTTP request of a delivery. */
export interface WebhookAttempt {
  object: "webhook_attempt";
  id: string;
  /** ISO 8601 timestamp. */
  attempted_at: string;
  /** The endpoint's HTTP status; `null` when no response arrived. */
  status_code: number | null;
  duration_ms: number;
  /** Why the attempt failed (e.g. `HTTP 500`, a timeout); `null` on success. */
  error: string | null;
  /** At most 1 KB of the response body, as text. */
  response_excerpt: string | null;
}

/** One event sent to one endpoint, retried with backoff until it succeeds or gives up. */
export interface WebhookDelivery {
  object: "webhook_delivery";
  id: string;
  endpoint_id: string;
  /** The event's id: the `id` of the payload and the `webhook-id` header. */
  event_id: string;
  event_type: string;
  status: WebhookDeliveryStatus;
  attempt_count: number;
  /** When the next attempt is due; `null` once the delivery is finished. */
  next_attempt_at: string | null;
  last_status_code: number | null;
  last_error: string | null;
  /** The event body, exactly as posted to the endpoint (a `WebhookEvent`). */
  payload: Record<string, unknown>;
  /** Every HTTP attempt of this delivery, oldest first. */
  attempts: WebhookAttempt[];
  created_at: string;
  updated_at: string;
}

/** Query of `GET /v1/webhook_endpoints/{id}/deliveries`. */
export interface ListWebhookDeliveriesParams {
  /** Only deliveries with this status. */
  status?: WebhookDeliveryStatus;
  /** Only the delivery of this event. */
  event_id?: string;
  /** 1-100, default 50. */
  limit?: number;
  /** Cursor: the `id` of the last delivery of the previous page. */
  after?: string;
}
