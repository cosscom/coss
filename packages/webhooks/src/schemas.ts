/**
 * Public wire schemas for webhook endpoint management (snake_case). Plain zod, no database
 * imports: `@coss/webhooks/schemas` is safe to load anywhere.
 *
 * The set of subscribable event types belongs to the products, not here, so the request bodies
 * are built by `webhookEndpointRequests(eventTypes)` — the public API passes `WEBHOOK_EVENT_TYPES`.
 */
import { API_VERSIONS, LATEST_API_VERSION } from "@coss/versioning";
import { z } from "zod";

export const WEBHOOK_URL_MAX_LENGTH = 2048;
export const DESCRIPTION_MAX_LENGTH = 256;

const EVENT_TYPES_DESCRIPTION =
  "Event types delivered to this endpoint. An empty array means every event type, including " +
  "ones added later.";

const API_VERSION_DESCRIPTION =
  "The API version (`Coss-Version`) events are rendered in for this endpoint. Each event carries it as " +
  "`api_version`.";

const ENDPOINT_ID_EXAMPLE = "whep_01k7c8m4q2f3e9v6t5r1n0p8yz";
const ENDPOINT_EXAMPLE = {
  object: "webhook_endpoint",
  id: ENDPOINT_ID_EXAMPLE,
  url: "https://example.com/webhooks/coss",
  description: "Production receiver",
  event_types: ["email.delivered", "email.bounced"],
  api_version: LATEST_API_VERSION,
  enabled: true,
  created_at: "2026-01-15T09:30:00.000Z",
  updated_at: "2026-01-15T09:30:00.000Z",
};

export const WebhookEndpointObject = z
  .object({
    object: z.literal("webhook_endpoint"),
    id: z.string().meta({ examples: [ENDPOINT_ID_EXAMPLE] }),
    url: z.string().meta({ examples: ["https://example.com/webhooks/coss"] }),
    description: z.string().nullable(),
    event_types: z.array(z.string()).meta({ description: EVENT_TYPES_DESCRIPTION }),
    api_version: z
      .string()
      .meta({ description: API_VERSION_DESCRIPTION, examples: [LATEST_API_VERSION] }),
    enabled: z
      .boolean()
      .meta({ description: "A disabled endpoint receives nothing until it is enabled again." }),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .meta({ id: "WebhookEndpoint", examples: [ENDPOINT_EXAMPLE] });

export type WebhookEndpointObjectOutput = z.output<typeof WebhookEndpointObject>;

export const WebhookEndpointWithSecret = WebhookEndpointObject.extend({
  secret: z.string().meta({
    description:
      "The endpoint's `whsec_…` signing secret, used to verify the requests COSS sends. " +
      "Returned only when the endpoint is created — store it now; it cannot be read back " +
      "through the API.",
    examples: ["whsec_6Jk…"],
  }),
}).meta({
  id: "WebhookEndpointWithSecret",
  examples: [{ ...ENDPOINT_EXAMPLE, secret: "whsec_6Jk…" }],
});

export type WebhookEndpointWithSecretOutput = z.output<typeof WebhookEndpointWithSecret>;

export const WebhookEndpointList = z
  .object({
    object: z.literal("list"),
    data: z.array(WebhookEndpointObject),
    has_more: z.boolean(),
  })
  .meta({
    id: "WebhookEndpointList",
    examples: [{ object: "list", data: [ENDPOINT_EXAMPLE], has_more: false }],
  });

export type WebhookEndpointListOutput = z.output<typeof WebhookEndpointList>;

export const DeletedWebhookEndpoint = z
  .object({
    object: z.literal("webhook_endpoint"),
    id: z.string(),
    deleted: z.literal(true),
  })
  .meta({
    id: "DeletedWebhookEndpoint",
    examples: [{ object: "webhook_endpoint", id: ENDPOINT_ID_EXAMPLE, deleted: true }],
  });

export type DeletedWebhookEndpointOutput = z.output<typeof DeletedWebhookEndpoint>;

const Url = z
  .string()
  .min(1, "Enter a full URL, like https://example.com/webhooks/coss.")
  .max(WEBHOOK_URL_MAX_LENGTH, `URLs can be at most ${WEBHOOK_URL_MAX_LENGTH} characters.`)
  .meta({
    description: "An `https://` URL COSS posts events to.",
    examples: ["https://example.com/webhooks/coss"],
  });

const ApiVersion = z.enum(API_VERSIONS).meta({ description: API_VERSION_DESCRIPTION });

const Description = z
  .string()
  .max(DESCRIPTION_MAX_LENGTH, `Can be at most ${DESCRIPTION_MAX_LENGTH} characters.`)
  .meta({ description: "A note for your own reference. `null` clears it." });

/**
 * The create and update bodies for one set of subscribable event types. Called once per process
 * (the schemas carry fixed OpenAPI ids).
 */
export function webhookEndpointRequests<const T extends readonly [string, ...string[]]>(
  eventTypes: T,
) {
  const EventTypes = z
    .array(z.enum(eventTypes))
    .max(eventTypes.length)
    .meta({ description: EVENT_TYPES_DESCRIPTION });

  const CreateWebhookEndpointRequest = z
    .strictObject({
      url: Url,
      description: Description.nullish(),
      event_types: EventTypes.optional().meta({
        description: `${EVENT_TYPES_DESCRIPTION} Defaults to every event type.`,
      }),
      api_version: ApiVersion.optional().meta({
        description: `${API_VERSION_DESCRIPTION} Defaults to the version of the request that creates the endpoint.`,
      }),
    })
    .meta({
      id: "CreateWebhookEndpointRequest",
      examples: [
        {
          url: "https://example.com/webhooks/coss",
          description: "Production receiver",
          event_types: eventTypes.slice(0, 2),
        },
      ],
    });

  const UpdateWebhookEndpointRequest = z
    .strictObject({
      url: Url.optional(),
      description: Description.nullish(),
      event_types: EventTypes.optional(),
      api_version: ApiVersion.optional(),
      enabled: z.boolean().optional(),
    })
    .refine((value) => Object.values(value).some((field) => field !== undefined), {
      error: "Provide at least one field to update.",
    })
    .meta({ id: "UpdateWebhookEndpointRequest", examples: [{ enabled: false }] });

  return { CreateWebhookEndpointRequest, UpdateWebhookEndpointRequest };
}

export const WEBHOOK_DELIVERY_STATUSES = ["pending", "succeeded", "failed"] as const;
export const DEFAULT_DELIVERY_LIST_LIMIT = 50;
export const MAX_DELIVERY_LIST_LIMIT = 100;

const DELIVERY_ID_EXAMPLE = "whdel_01k7c8n2b5d7f9h1k3m5p7r9tv";
const EVENT_ID_EXAMPLE = "evt_01k7c8n1z4c6e8g0j2l4n6q8sa";
const ATTEMPT_EXAMPLE = {
  object: "webhook_attempt",
  id: "whatt_01k7c8n2c9e1g3j5l7n9q1s3uw",
  attempted_at: "2026-01-15T09:30:01.000Z",
  status_code: 200,
  duration_ms: 182,
  error: null,
  response_excerpt: "ok",
};
const DELIVERY_EXAMPLE = {
  object: "webhook_delivery",
  id: DELIVERY_ID_EXAMPLE,
  endpoint_id: ENDPOINT_ID_EXAMPLE,
  event_id: EVENT_ID_EXAMPLE,
  event_type: "email.delivered",
  status: "succeeded",
  attempt_count: 1,
  next_attempt_at: null,
  last_status_code: 200,
  last_error: null,
  payload: {
    id: EVENT_ID_EXAMPLE,
    object: "event",
    type: "email.delivered",
    created_at: "2026-01-15T09:30:00.000Z",
    data: { email_id: "email_01k7c8m9x3a5c7e9g1j3l5n7q9", recipient: "user@example.com" },
  },
  attempts: [ATTEMPT_EXAMPLE],
  created_at: "2026-01-15T09:30:00.000Z",
  updated_at: "2026-01-15T09:30:01.000Z",
};

export const WebhookDeliveryStatusEnum = z.enum(WEBHOOK_DELIVERY_STATUSES).meta({
  id: "WebhookDeliveryStatus",
  description:
    "`pending`: waiting for its next attempt. `succeeded`: the endpoint answered with a 2xx " +
    "status. `failed`: every attempt failed, or the endpoint was disabled.",
});

export const WebhookAttemptObject = z
  .object({
    object: z.literal("webhook_attempt"),
    id: z.string(),
    attempted_at: z.iso.datetime(),
    status_code: z
      .number()
      .int()
      .nullable()
      .meta({ description: "The endpoint's HTTP status; `null` when no response arrived." }),
    duration_ms: z.number().int(),
    error: z.string().nullable().meta({
      description: "Why the attempt failed (e.g. `HTTP 500`, a timeout); `null` on success.",
    }),
    response_excerpt: z
      .string()
      .nullable()
      .meta({ description: "At most 1 KB of the response body, as text." }),
  })
  .meta({ id: "WebhookAttempt", examples: [ATTEMPT_EXAMPLE] });

export type WebhookAttemptObjectOutput = z.output<typeof WebhookAttemptObject>;

export const WebhookDeliveryObject = z
  .object({
    object: z.literal("webhook_delivery"),
    id: z.string().meta({ examples: [DELIVERY_ID_EXAMPLE] }),
    endpoint_id: z.string(),
    event_id: z.string().meta({
      description: "The event's id: the `id` of the payload and the `webhook-id` header.",
    }),
    event_type: z.string().meta({ examples: ["email.delivered"] }),
    status: WebhookDeliveryStatusEnum,
    attempt_count: z.number().int(),
    next_attempt_at: z.iso
      .datetime()
      .nullable()
      .meta({ description: "When the next attempt is due; `null` once the delivery is finished." }),
    last_status_code: z.number().int().nullable(),
    last_error: z.string().nullable(),
    payload: z
      .record(z.string(), z.unknown())
      .meta({ description: "The event body, exactly as posted to the endpoint." }),
    attempts: z
      .array(WebhookAttemptObject)
      .meta({ description: "Every HTTP attempt of this delivery, oldest first." }),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .meta({ id: "WebhookDelivery", examples: [DELIVERY_EXAMPLE] });

export type WebhookDeliveryObjectOutput = z.output<typeof WebhookDeliveryObject>;

export const WebhookDeliveryList = z
  .object({
    object: z.literal("list"),
    data: z.array(WebhookDeliveryObject),
    has_more: z.boolean(),
  })
  .meta({
    id: "WebhookDeliveryList",
    examples: [{ object: "list", data: [DELIVERY_EXAMPLE], has_more: false }],
  });

export type WebhookDeliveryListOutput = z.output<typeof WebhookDeliveryList>;

export const ListWebhookDeliveriesQuery = z.strictObject({
  status: WebhookDeliveryStatusEnum.optional().meta({
    description: "Only deliveries with this status.",
  }),
  event_id: z.string().optional().meta({ description: "Only the delivery of this event." }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_DELIVERY_LIST_LIMIT)
    .optional()
    .meta({ description: `1-${MAX_DELIVERY_LIST_LIMIT}, default ${DEFAULT_DELIVERY_LIST_LIMIT}.` }),
  after: z
    .string()
    .optional()
    .meta({ description: "Cursor: the `id` of the last delivery of the previous page." }),
});

export type ListWebhookDeliveriesQueryOutput = z.output<typeof ListWebhookDeliveriesQuery>;
