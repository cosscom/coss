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
