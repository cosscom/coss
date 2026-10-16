/**
 * Webhook listener wire types: how `coss listen` pulls an environment's events to forward them to
 * a local server (coss.com can't post to `localhost`).
 */
import type { ApiVersion } from "../api-version.ts";
import type { WebhookEventType } from "./webhook-endpoint.ts";

/** A temporary subscriber of the API key's environment, open while it is polled. */
export interface WebhookListener {
  object: "webhook_listener";
  id: string;
  /** The API version events are rendered in. */
  api_version: string;
  /** Empty: every event type. */
  event_types: string[];
  description: string | null;
  /** When it closes unless polled again (every poll moves it 10 minutes ahead). */
  expires_at: string;
  created_at: string;
}

/** One event handed out by a poll, to forward and acknowledge. */
export interface WebhookListenerDelivery {
  object: "webhook_listener_delivery";
  id: string;
  /** Send it back in the acknowledgement. */
  ack_token: string;
  /** The event's id: the body's `id`, and the `webhook-id` header endpoints receive. */
  event_id: string;
  event_type: string;
  /** How many polls have handed it out (more than 1 after an unacknowledged answer). */
  attempt: number;
  /** The event body, exactly as an endpoint would receive it: forward these bytes. */
  body: string;
  created_at: string;
}

/** Answer of `POST /v1/webhook_listeners/{id}/poll`. */
export interface WebhookListenerPoll {
  object: "webhook_listener_poll";
  listener: WebhookListener;
  /** Oldest first; empty when nothing arrived while the poll waited. */
  deliveries: WebhookListenerDelivery[];
  /** How many of the request's acknowledgements were recorded. */
  acknowledged: number;
}

export interface DeletedWebhookListener {
  object: "webhook_listener";
  id: string;
  deleted: true;
}

/** Body of `POST /v1/webhook_listeners`. */
export interface CreateWebhookListenerParams {
  /** Defaults to every event type. */
  event_types?: WebhookEventType[];
  /** Defaults to the client's `apiVersion`. */
  api_version?: ApiVersion;
  /** Where the events go, for your own reference (shown in the log). */
  description?: string | null;
}

/** What happened to one delivery handed out earlier. */
export interface WebhookListenerAck {
  delivery_id: string;
  ack_token: string;
  /** The local server's status; `null` when nothing answered, or the event was only printed. */
  status_code: number | null;
  duration_ms: number;
  /** Why forwarding failed; `null` if it didn't. */
  error: string | null;
}

/** Body of `POST /v1/webhook_listeners/{id}/poll`. */
export interface PollWebhookListenerParams {
  acks?: WebhookListenerAck[];
  /** How long to wait for events, in milliseconds (default 20000, at most 25000). */
  wait_ms?: number;
  /** The most deliveries to hand out (default 10, at most 50). */
  limit?: number;
}
