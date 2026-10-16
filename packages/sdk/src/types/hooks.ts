/**
 * Hooks wire types (webhooks as a service): you send a message to one of your applications once,
 * coss.com delivers it to every endpoint its users registered, signed, with retries.
 */

/** One of your customers (or users), with their own endpoints and portal. */
export interface HookApplication {
  object: "hook_application";
  id: string;
  /** Your own id for it, unique in the environment; every method that takes an application accepts it. */
  uid: string | null;
  name: string;
  metadata: Record<string, string>;
  /** ISO 8601 timestamp. */
  created_at: string;
  updated_at: string;
}

/** Body of `POST /v1/hooks/applications`. */
export interface CreateHookApplicationParams {
  /** Shown to the application's users in the portal. */
  name: string;
  /** Your own id for it (1-256 letters, digits and `. _ : @ | -`). */
  uid?: string;
  /** Up to 16 keys (up to 40 characters) with string values (up to 500). */
  metadata?: Record<string, string>;
}

/** Body of `PATCH /v1/hooks/applications/{application}`. Omitted fields keep their value. */
export interface UpdateHookApplicationParams {
  name?: string;
  /** `null` removes it. */
  uid?: string | null;
  /** Replaces the metadata. */
  metadata?: Record<string, string>;
}

/** Query of `GET /v1/hooks/applications`. */
export interface ListHookApplicationsParams {
  /** 1-100, default 50. */
  limit?: number;
  /** Cursor: the `id` of the last application of the previous page. */
  after?: string;
}

/** Returned by `hooks.applications.delete`. */
export interface DeletedHookApplication {
  object: "hook_application";
  id: string;
  deleted: true;
}

/** A type of message you send (e.g. `invoice.paid`): the catalog your users subscribe from. */
export interface HookEventType {
  object: "hook_event_type";
  name: string;
  description: string | null;
  /** A JSON Schema of the payload, shown to your users (not enforced). */
  schema: Record<string, unknown> | null;
  /** Example payloads; the first is what a test send delivers. */
  examples: Record<string, unknown>[];
  /** Hidden from the portal and new subscriptions; already subscribed endpoints still receive it. */
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Body of `POST /v1/hooks/event_types`. */
export interface CreateHookEventTypeParams {
  /** 1-64 letters, digits and `. _ -`. */
  name: string;
  description?: string;
  schema?: Record<string, unknown>;
  /** Up to 5. */
  examples?: Record<string, unknown>[];
}

/** Body of `PATCH /v1/hooks/event_types/{name}`. */
export interface UpdateHookEventTypeParams {
  description?: string | null;
  schema?: Record<string, unknown> | null;
  examples?: Record<string, unknown>[];
  /** `false` restores an archived type. */
  archived?: boolean;
}

/** Query of `GET /v1/hooks/event_types`. */
export interface ListHookEventTypesParams {
  /** Also list archived types. */
  include_archived?: boolean;
  /** 1-100, default 50. */
  limit?: number;
  /** Cursor: the `name` of the last type of the previous page. */
  after?: string;
}

/** Why an endpoint is disabled. */
export type HookEndpointDisabledReason = "manual" | "failing";

/** A URL of an application's user that receives its messages, signed with its own secret. */
export interface HookEndpoint {
  object: "hook_endpoint";
  id: string;
  application_id: string;
  url: string;
  description: string | null;
  /** Event types delivered; empty means every type. */
  filter_types: string[];
  rate_limit_per_second: number | null;
  enabled: boolean;
  /** `manual`, or `failing` (its deliveries failed every attempt for five days); `null` while enabled. */
  disabled_reason: HookEndpointDisabledReason | null;
  disabled_at: string | null;
  /** When its current run of failed deliveries began; `null` while healthy. */
  failing_since: string | null;
  /** After a secret roll, requests are also signed with the previous secret until then. */
  previous_secret_expires_at: string | null;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/** A created endpoint, or one whose secret was just rolled. */
export interface HookEndpointWithSecret extends HookEndpoint {
  /** The `whsec_…` signing secret (Standard Webhooks). */
  secret: string;
}

/** Body of `POST /v1/hooks/applications/{application}/endpoints`. */
export interface CreateHookEndpointParams {
  /** An `https://` URL. */
  url: string;
  description?: string;
  /** Existing, unarchived event types; omitted or empty means every type. */
  filter_types?: string[];
  /** A `whsec_` + base64 secret of 24-64 bytes (e.g. migrated from another provider). */
  secret?: string;
  /** 1-1000. */
  rate_limit_per_second?: number;
  metadata?: Record<string, string>;
  enabled?: boolean;
}

/** Body of `PATCH /v1/hooks/applications/{application}/endpoints/{id}`. */
export interface UpdateHookEndpointParams {
  url?: string;
  description?: string | null;
  filter_types?: string[];
  rate_limit_per_second?: number | null;
  metadata?: Record<string, string>;
  enabled?: boolean;
}

/** Returned by `hooks.endpoints.delete`. */
export interface DeletedHookEndpoint {
  object: "hook_endpoint";
  id: string;
  deleted: true;
}

/** Returned by `hooks.endpoints.getSecret`. */
export interface HookEndpointSecret {
  object: "hook_endpoint_secret";
  secret: string;
}

/** Body of `POST …/endpoints/{id}/roll_secret`. */
export interface RollHookEndpointSecretParams {
  /** Seconds the current secret keeps signing next to the new one: default 86400, at most 604800, `0` stops it now. */
  previous_secret_expires_in?: number;
}

/** Body of `POST …/endpoints/{id}/recover`. */
export interface RecoverHookEndpointParams {
  /** Requeue failed deliveries of messages sent since then (ISO 8601 string or `Date`). */
  since: string | Date;
}

/** A recovery: coss.com requeues the matching failed deliveries in the background. */
export interface HookEndpointRecovery {
  object: "hook_endpoint_recovery";
  id: string;
  endpoint_id: string;
  since: string;
  until: string;
  status: "pending" | "completed";
  requeued: number;
  created_at: string;
  completed_at: string | null;
}

/** Body of `POST …/endpoints/{id}/test`. */
export interface SendHookTestParams {
  event_type: string;
  /** Defaults to the event type's first example. */
  payload?: Record<string, unknown>;
}

/** A message sent to an application. */
export interface HookMessage {
  object: "hook_message";
  /** Also the `webhook-id` header of every request delivering it. */
  id: string;
  application_id: string;
  event_type: string;
  /** The JSON body delivered to each endpoint. */
  payload: Record<string, unknown>;
  created_at: string;
}

/** Params of `hooks.messages.send`: the application, then the body of `POST …/messages`. */
export interface SendHookMessageParams {
  /** The application's id or uid. */
  application: string;
  /** e.g. `invoice.paid`; endpoints filtering by type only get the types they chose. */
  event_type: string;
  /** At most 256 KB serialized; send integers beyond 2^53 as strings. */
  payload: Record<string, unknown>;
}

/** Query of `GET …/messages`. */
export interface ListHookMessagesParams {
  /** Only messages of this type. */
  event_type?: string;
  /** 1-100, default 50. */
  limit?: number;
  /** Cursor: the `id` of the last message of the previous page. */
  after?: string;
}

/**
 * `pending`: waiting for its next attempt. `succeeded`: the endpoint answered 2xx. `failed`: every
 * attempt failed, or the endpoint was disabled or deleted.
 */
export type HookDeliveryStatus = "pending" | "succeeded" | "failed";

/** One message's delivery to one endpoint. */
export interface HookDelivery {
  object: "hook_delivery";
  id: string;
  application_id: string;
  message_id: string;
  endpoint_id: string;
  status: HookDeliveryStatus;
  attempt_count: number;
  next_attempt_at: string | null;
  last_status_code: number | null;
  last_error: string | null;
  created_at: string;
  finished_at: string | null;
}

/** Query of `GET …/endpoints/{id}/deliveries`. */
export interface ListHookDeliveriesParams {
  status?: HookDeliveryStatus;
  /** 1-100, default 50. */
  limit?: number;
  /** Cursor: the `id` of the last delivery of the previous page. */
  after?: string;
}

/** One HTTP request of a delivery. */
export interface HookAttempt {
  object: "hook_attempt";
  id: string;
  delivery_id: string;
  endpoint_id: string;
  attempted_at: string;
  /** `null` when no response arrived. */
  status_code: number | null;
  duration_ms: number;
  error: string | null;
  /** At most 1 KB of the response body. */
  response_excerpt: string | null;
}

/** Params of `hooks.portal.createSession`. */
export interface CreateHookPortalSessionParams {
  /** The application's id or uid. */
  application: string;
  /** Seconds until it expires: default 3600, 60-86400. */
  expires_in?: number;
  /** The user can look but not change anything. */
  read_only?: boolean;
}

/** A portal sign-in for one application's user. */
export interface HookPortalSession {
  object: "hook_portal_session";
  id: string;
  application_id: string;
  /** Open it or embed it (from an allowed origin); the token is in its fragment. */
  url: string;
  /** The secret part of `url`. */
  token: string;
  read_only: boolean;
  expires_at: string;
}
