import { WEBHOOK_EVENT_TYPES } from "@coss/email/schemas";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookDelivery,
  getWebhookEndpoint,
  listWebhookEndpoints,
  MAX_ATTEMPTS,
  MAX_ENDPOINTS_PER_ENVIRONMENT,
  pageWebhookDeliveries,
  retryWebhookDelivery,
  toWebhookDeliveryObject,
  toWebhookEndpointObject,
  updateWebhookEndpoint,
  type WebhookEndpointRow,
  type WebhookManagementDeps,
} from "@coss/webhooks";
import {
  DeletedWebhookEndpoint,
  ListWebhookDeliveriesQuery,
  WebhookDeliveryList,
  WebhookDeliveryObject,
  WebhookEndpointList,
  WebhookEndpointObject,
  WebhookEndpointWithSecret,
  webhookEndpointRequests,
} from "@coss/webhooks/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { upgradeRequestBody } from "../middleware/api-version.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, jsonDoc } from "./docs.ts";

// Every product's event types are subscribable here (email events and `account.*`).
// Exported so the SDK contract test can check them against the SDK's hand-written params.
export const { CreateWebhookEndpointRequest, UpdateWebhookEndpointRequest } =
  webhookEndpointRequests(WEBHOOK_EVENT_TYPES);

const EndpointIdParams = z.object({
  id: z.string().meta({
    description: "The webhook endpoint's id.",
    examples: ["whep_01k7c8m4q2f3e9v6t5r1n0p8yz"],
  }),
});

const DeliveryParams = EndpointIdParams.extend({
  delivery_id: z.string().meta({
    description: "The delivery's id.",
    examples: ["whdel_01k7c8n2b5d7f9h1k3m5p7r9tv"],
  }),
});

const SCOPE_NOTE =
  "Webhook endpoints belong to the API key's own environment: a `coss_test_…` key only ever " +
  "sees sandbox endpoints, and a `coss_live_…` key only production ones.";

const endpointNotFound = errorDoc(
  "No webhook endpoint with this id exists in the API key's environment (`not_found`).",
);

const bodyErrors = {
  400: errorDoc("The body is not valid JSON (`invalid_json`)."),
  413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
  415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
};

export const createWebhookEndpointRoute = createRoute({
  method: "post",
  path: "/webhook_endpoints",
  operationId: "createWebhookEndpoint",
  tags: ["Webhook endpoints"],
  summary: "Create a webhook endpoint",
  description:
    `Registers a URL that receives signed event notifications. ${SCOPE_NOTE} The response is the ` +
    "only place the signing secret is ever returned: store it, and verify every delivery with " +
    "it (`verifyWebhook` in the SDK).",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ webhook: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/webhook_endpoints"),
  ],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateWebhookEndpointRequest } },
    },
  },
  responses: {
    200: jsonDoc("The endpoint and its signing secret.", WebhookEndpointWithSecret),
    ...bodyErrors,
    ...commonErrors,
    422: errorDoc(
      "The body failed validation (`validation_error`, including an unknown `api_version`), the URL is not a usable https:// URL " +
        "(`invalid_url`), or the environment already has " +
        `${MAX_ENDPOINTS_PER_ENVIRONMENT} endpoints (\`too_many_endpoints\`).`,
    ),
  },
});

export const listWebhookEndpointsRoute = createRoute({
  method: "get",
  path: "/webhook_endpoints",
  operationId: "listWebhookEndpoints",
  tags: ["Webhook endpoints"],
  summary: "List webhook endpoints",
  description: `Every endpoint of the API key's environment, oldest first. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ webhook: ["read"] }), rateLimit("api.read")],
  responses: {
    200: jsonDoc("The environment's webhook endpoints.", WebhookEndpointList),
    ...commonErrors,
  },
});

export const getWebhookEndpointRoute = createRoute({
  method: "get",
  path: "/webhook_endpoints/{id}",
  operationId: "getWebhookEndpoint",
  tags: ["Webhook endpoints"],
  summary: "Retrieve a webhook endpoint",
  description: "The endpoint without its signing secret, which is only returned when created.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ webhook: ["read"] }), rateLimit("api.read")],
  request: { params: EndpointIdParams },
  responses: {
    200: jsonDoc("The webhook endpoint.", WebhookEndpointObject),
    ...commonErrors,
    404: endpointNotFound,
  },
});

export const updateWebhookEndpointRoute = createRoute({
  method: "patch",
  path: "/webhook_endpoints/{id}",
  operationId: "updateWebhookEndpoint",
  tags: ["Webhook endpoints"],
  summary: "Update a webhook endpoint",
  description:
    "Changes the URL, description, subscribed event types, API version or `enabled` flag. Omitted fields keep " +
    "their current value, and the signing secret never changes, so receivers keep verifying " +
    "deliveries. Disabling an endpoint stops deliveries without losing its configuration.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ webhook: ["update"] }),
    rateLimit("api.write"),
    upgradeRequestBody("PATCH /v1/webhook_endpoints/{id}"),
  ],
  request: {
    params: EndpointIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateWebhookEndpointRequest } },
    },
  },
  responses: {
    200: jsonDoc("The updated endpoint.", WebhookEndpointObject),
    ...bodyErrors,
    ...commonErrors,
    404: endpointNotFound,
    422: errorDoc(
      "The body failed validation (`validation_error`) or the URL is not a usable https:// URL " +
        "(`invalid_url`).",
    ),
  },
});

export const deleteWebhookEndpointRoute = createRoute({
  method: "delete",
  path: "/webhook_endpoints/{id}",
  operationId: "deleteWebhookEndpoint",
  tags: ["Webhook endpoints"],
  summary: "Delete a webhook endpoint",
  description:
    "Removes the endpoint and its delivery log. Deliveries already queued for it are dropped. " +
    "To stop deliveries temporarily, set `enabled` to `false` instead.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ webhook: ["delete"] }), rateLimit("api.write")],
  request: { params: EndpointIdParams },
  responses: {
    200: jsonDoc("The endpoint was deleted.", DeletedWebhookEndpoint),
    ...commonErrors,
    404: endpointNotFound,
  },
});

const deliveryNotFound = errorDoc(
  "No webhook endpoint with this id exists in the API key's environment, or the endpoint has " +
    "no delivery with this id (`not_found`).",
);

export const listWebhookDeliveriesRoute = createRoute({
  method: "get",
  path: "/webhook_endpoints/{id}/deliveries",
  operationId: "listWebhookDeliveries",
  tags: ["Webhook endpoints"],
  summary: "List an endpoint's deliveries",
  description:
    "The endpoint's delivery log, newest first: one delivery per event sent to it, with every " +
    "HTTP attempt and the payload as sent. Pass the last `id` as `after` to get the next page " +
    "while `has_more` is true. Deleting the endpoint deletes its log.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ webhook: ["read"] }), rateLimit("api.read")],
  request: { params: EndpointIdParams, query: ListWebhookDeliveriesQuery },
  responses: {
    200: jsonDoc("A page of deliveries.", WebhookDeliveryList),
    ...commonErrors,
    404: endpointNotFound,
    422: errorDoc("A query parameter failed validation (`validation_error`, see `issues`)."),
  },
});

export const getWebhookDeliveryRoute = createRoute({
  method: "get",
  path: "/webhook_endpoints/{id}/deliveries/{delivery_id}",
  operationId: "getWebhookDelivery",
  tags: ["Webhook endpoints"],
  summary: "Retrieve a delivery",
  description: "One delivery of the endpoint, with every HTTP attempt and the payload as sent.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ webhook: ["read"] }), rateLimit("api.read")],
  request: { params: DeliveryParams },
  responses: {
    200: jsonDoc("The delivery.", WebhookDeliveryObject),
    ...commonErrors,
    404: deliveryNotFound,
  },
});

export const retryWebhookDeliveryRoute = createRoute({
  method: "post",
  path: "/webhook_endpoints/{id}/deliveries/{delivery_id}/retry",
  operationId: "retryWebhookDelivery",
  tags: ["Webhook endpoints"],
  summary: "Retry a delivery",
  description:
    "Queues a finished delivery (`succeeded` or `failed`) for one more attempt, made within " +
    "seconds, signed with the endpoint's current secret and sent to its current URL. A delivery " +
    "that is still `pending` is returned unchanged: it is already scheduled for " +
    `\`next_attempt_at\` (automatic retries stop after ${MAX_ATTEMPTS} attempts).`,
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ webhook: ["update"] }), rateLimit("api.write")],
  request: { params: DeliveryParams },
  responses: {
    200: jsonDoc("The delivery, now `pending`.", WebhookDeliveryObject),
    ...commonErrors,
    404: deliveryNotFound,
  },
});

const DELIVERY_NOT_FOUND_MESSAGE = "This webhook endpoint has no delivery with this id.";

export function createWebhookEndpointRoutes(deps: WebhookManagementDeps): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  /** The endpoint addressed by the path, checked to belong to the key's own environment. */
  async function requireEndpoint(
    auth: AppEnv["Variables"]["auth"],
    id: string,
  ): Promise<WebhookEndpointRow> {
    const row = await getWebhookEndpoint({ organizationId: auth.organizationId, id });
    // Malformed, unknown, other-environment and other-organization ids are all a 404.
    if (!row || row.environmentId !== auth.environmentId) {
      throw notFound("No webhook endpoint with this id exists in this API key's environment.");
    }
    return row;
  }

  router.openapi(createWebhookEndpointRoute, async (c) => {
    const body = c.req.valid("json");
    const { organizationId, environmentId } = c.var.auth;
    // Tenancy always comes from the authenticated key, never from the request.
    const { endpoint, secret } = await createWebhookEndpoint(
      {
        organizationId,
        environmentId,
        url: body.url,
        description: body.description,
        // Omitted means every event type, including ones added later.
        eventTypes: body.event_types ?? [],
        // By default, events arrive in the version this request was made in (the SDK's, or the organization's).
        apiVersion: body.api_version ?? c.var.apiVersion,
        userId: null,
      },
      deps,
    );
    return c.json({ ...toWebhookEndpointObject(endpoint), secret }, 200);
  });

  router.openapi(listWebhookEndpointsRoute, async (c) => {
    const { organizationId, environmentId } = c.var.auth;
    const rows = await listWebhookEndpoints({ organizationId, environmentId });
    return c.json(
      { object: "list" as const, data: rows.map(toWebhookEndpointObject), has_more: false },
      200,
    );
  });

  router.openapi(getWebhookEndpointRoute, async (c) => {
    const row = await requireEndpoint(c.var.auth, c.req.valid("param").id);
    return c.json(toWebhookEndpointObject(row), 200);
  });

  router.openapi(updateWebhookEndpointRoute, async (c) => {
    const body = c.req.valid("json");
    const row = await requireEndpoint(c.var.auth, c.req.valid("param").id);
    const updated = await updateWebhookEndpoint(
      {
        organizationId: row.organizationId,
        id: row.id,
        url: body.url,
        description: body.description,
        eventTypes: body.event_types,
        apiVersion: body.api_version,
        enabled: body.enabled,
      },
      deps,
    );
    return c.json(toWebhookEndpointObject(updated), 200);
  });

  router.openapi(deleteWebhookEndpointRoute, async (c) => {
    const row = await requireEndpoint(c.var.auth, c.req.valid("param").id);
    await deleteWebhookEndpoint({ organizationId: row.organizationId, id: row.id });
    return c.json({ object: "webhook_endpoint" as const, id: row.id, deleted: true as const }, 200);
  });

  router.openapi(listWebhookDeliveriesRoute, async (c) => {
    const query = c.req.valid("query");
    const endpoint = await requireEndpoint(c.var.auth, c.req.valid("param").id);
    const page = await pageWebhookDeliveries({
      organizationId: endpoint.organizationId,
      endpointId: endpoint.id,
      status: query.status,
      eventId: query.event_id,
      limit: query.limit,
      after: query.after,
    });
    return c.json(
      {
        object: "list" as const,
        data: page.deliveries.map(toWebhookDeliveryObject),
        has_more: page.hasMore,
      },
      200,
    );
  });

  router.openapi(getWebhookDeliveryRoute, async (c) => {
    const { id, delivery_id } = c.req.valid("param");
    const endpoint = await requireEndpoint(c.var.auth, id);
    const delivery = await getWebhookDelivery({
      organizationId: endpoint.organizationId,
      endpointId: endpoint.id,
      id: delivery_id,
    });
    if (!delivery) throw notFound(DELIVERY_NOT_FOUND_MESSAGE);
    return c.json(toWebhookDeliveryObject(delivery), 200);
  });

  router.openapi(retryWebhookDeliveryRoute, async (c) => {
    const { id, delivery_id } = c.req.valid("param");
    const endpoint = await requireEndpoint(c.var.auth, id);
    const target = { organizationId: endpoint.organizationId, endpointId: endpoint.id };
    // Pending deliveries are unchanged; requests after completion can queue another replay.
    await retryWebhookDelivery({ ...target, id: delivery_id });
    const delivery = await getWebhookDelivery({ ...target, id: delivery_id });
    if (!delivery) throw notFound(DELIVERY_NOT_FOUND_MESSAGE);
    return c.json(toWebhookDeliveryObject(delivery), 200);
  });

  return router;
}
