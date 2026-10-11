import { WEBHOOK_EVENT_TYPES } from "@coss/email/schemas";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  getWebhookEndpoint,
  listWebhookEndpoints,
  MAX_ENDPOINTS_PER_ENVIRONMENT,
  toWebhookEndpointObject,
  updateWebhookEndpoint,
  type WebhookEndpointRow,
  type WebhookManagementDeps,
} from "@coss/webhooks";
import {
  DeletedWebhookEndpoint,
  WebhookEndpointList,
  WebhookEndpointObject,
  WebhookEndpointWithSecret,
  webhookEndpointRequests,
} from "@coss/webhooks/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, jsonDoc } from "./docs.ts";

// Every product's event types are subscribable here (email events and `account.*`).
// Exported so the SDK contract test can check them against the SDK's hand-written params.
export const { CreateWebhookEndpointRequest, UpdateWebhookEndpointRequest } =
  webhookEndpointRequests(WEBHOOK_EVENT_TYPES);

const EndpointIdParams = z.object({
  id: z.string().meta({
    description: "The webhook endpoint's id.",
    example: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz",
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
  middleware: requireApiKey({ webhook: ["create"] }),
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
      "The body failed validation (`validation_error`), the URL is not a usable https:// URL " +
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
  middleware: requireApiKey({ webhook: ["read"] }),
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
  middleware: requireApiKey({ webhook: ["read"] }),
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
    "Changes the URL, description, subscribed event types or `enabled` flag. Omitted fields keep " +
    "their current value, and the signing secret never changes, so receivers keep verifying " +
    "deliveries. Disabling an endpoint stops deliveries without losing its configuration.",
  security: [{ bearerAuth: [] }],
  middleware: requireApiKey({ webhook: ["update"] }),
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
  middleware: requireApiKey({ webhook: ["delete"] }),
  request: { params: EndpointIdParams },
  responses: {
    200: jsonDoc("The endpoint was deleted.", DeletedWebhookEndpoint),
    ...commonErrors,
    404: endpointNotFound,
  },
});

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

  return router;
}
