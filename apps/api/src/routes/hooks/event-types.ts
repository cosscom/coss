import {
  createHookEventType,
  getHookEventType,
  HookError,
  MAX_EVENT_TYPES,
  pageHookEventTypes,
  toHookEventTypeObject,
  updateHookEventType,
} from "@coss/hooks";
import {
  CreateHookEventTypeRequest,
  HookEventTypeList,
  HookEventTypeObject,
  ListHookEventTypesQuery,
  UpdateHookEventTypeRequest,
} from "@coss/hooks/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { recordApiAudit } from "../../audit.ts";
import { requireApiKey } from "../../middleware/api-key.ts";
import { upgradeRequestBody } from "../../middleware/api-version.ts";
import { rateLimit } from "../../middleware/rate-limit.ts";
import type { AppEnv } from "../../types.ts";
import { commonErrors, errorDoc, jsonDoc } from "../docs.ts";
import { bodyErrors, SCOPE_NOTE, TAGS } from "./shared.ts";

const NameParams = z.object({
  name: z.string().meta({ description: "The event type's name.", examples: ["invoice.paid"] }),
});

const eventTypeNotFound = errorDoc(
  "No event type with this name exists in the API key's environment (`not_found`).",
);

export const createHookEventTypeRoute = createRoute({
  method: "post",
  path: "/hooks/event_types",
  operationId: "createHookEventType",
  tags: [TAGS.eventTypes],
  summary: "Create an event type",
  description:
    "Adds a type to the catalog your applications' users subscribe from (in the portal, or the " +
    "`filter_types` of an endpoint), with a description, a JSON Schema and examples to show them. " +
    `Messages can be sent with any type, registered or not. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ hook: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/hooks/event_types"),
  ],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateHookEventTypeRequest } },
    },
  },
  responses: {
    200: jsonDoc("The event type.", HookEventTypeObject),
    ...bodyErrors,
    ...commonErrors,
    422: errorDoc(
      "The body failed validation (`validation_error`), the type exists (`event_type_exists`), " +
        "its schema and examples are larger than 64 KB (`payload_too_large`), or the environment " +
        `has ${MAX_EVENT_TYPES} types (\`too_many_event_types\`).`,
    ),
  },
});

export const listHookEventTypesRoute = createRoute({
  method: "get",
  path: "/hooks/event_types",
  operationId: "listHookEventTypes",
  tags: [TAGS.eventTypes],
  summary: "List event types",
  description: "The environment's event types by name; archived ones only with `include_archived`.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ hook: ["read"] }), rateLimit("api.read")],
  request: { query: ListHookEventTypesQuery },
  responses: {
    200: jsonDoc("A page of event types.", HookEventTypeList),
    ...commonErrors,
  },
});

export const getHookEventTypeRoute = createRoute({
  method: "get",
  path: "/hooks/event_types/{name}",
  operationId: "getHookEventType",
  tags: [TAGS.eventTypes],
  summary: "Retrieve an event type",
  description: "An event type of the API key's environment, archived or not.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ hook: ["read"] }), rateLimit("api.read")],
  request: { params: NameParams },
  responses: {
    200: jsonDoc("The event type.", HookEventTypeObject),
    ...commonErrors,
    404: eventTypeNotFound,
  },
});

export const updateHookEventTypeRoute = createRoute({
  method: "patch",
  path: "/hooks/event_types/{name}",
  operationId: "updateHookEventType",
  tags: [TAGS.eventTypes],
  summary: "Update an event type",
  description: "Changes its description, schema or examples, or archives or restores it.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ hook: ["update"] }),
    rateLimit("api.write"),
    upgradeRequestBody("PATCH /v1/hooks/event_types/{name}"),
  ],
  request: {
    params: NameParams,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateHookEventTypeRequest } },
    },
  },
  responses: {
    200: jsonDoc("The event type.", HookEventTypeObject),
    ...bodyErrors,
    ...commonErrors,
    404: eventTypeNotFound,
    422: errorDoc("The body failed validation (`validation_error`, `payload_too_large`)."),
  },
});

export const archiveHookEventTypeRoute = createRoute({
  method: "delete",
  path: "/hooks/event_types/{name}",
  operationId: "archiveHookEventType",
  tags: [TAGS.eventTypes],
  summary: "Archive an event type",
  description:
    "Hides the type from the portal and from new subscriptions. Endpoints already subscribed keep " +
    "receiving it. Restore it with `PATCH … { archived: false }`.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ hook: ["delete"] }), rateLimit("api.write")],
  request: { params: NameParams },
  responses: {
    200: jsonDoc("The archived event type.", HookEventTypeObject),
    ...commonErrors,
    404: eventTypeNotFound,
  },
});

export function createHookEventTypeRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(createHookEventTypeRoute, async (c) => {
    const body = c.req.valid("json");
    const { organizationId, environmentId } = c.var.auth;
    const row = await createHookEventType({ organizationId, environmentId, ...body });
    await recordApiAudit(c, {
      action: "hook_event_type.created",
      target: { type: "hook_event_type", id: row.id, label: row.name },
    });
    return c.json(toHookEventTypeObject(row), 200);
  });

  router.openapi(listHookEventTypesRoute, async (c) => {
    const query = c.req.valid("query");
    const { organizationId, environmentId } = c.var.auth;
    const page = await pageHookEventTypes({
      organizationId,
      environmentId,
      includeArchived: query.include_archived === "true",
      limit: query.limit,
      after: query.after,
    });
    return c.json(
      {
        object: "list" as const,
        data: page.eventTypes.map(toHookEventTypeObject),
        has_more: page.hasMore,
      },
      200,
    );
  });

  router.openapi(getHookEventTypeRoute, async (c) => {
    const { organizationId, environmentId } = c.var.auth;
    const row = await getHookEventType({
      organizationId,
      environmentId,
      name: c.req.valid("param").name,
    });
    if (!row) throw new HookError("not_found", "Event type not found.");
    return c.json(toHookEventTypeObject(row), 200);
  });

  router.openapi(updateHookEventTypeRoute, async (c) => {
    const body = c.req.valid("json");
    const { organizationId, environmentId } = c.var.auth;
    const row = await updateHookEventType({
      organizationId,
      environmentId,
      name: c.req.valid("param").name,
      ...body,
    });
    await recordApiAudit(c, {
      action: "hook_event_type.updated",
      target: { type: "hook_event_type", id: row.id, label: row.name },
      metadata: { fields: Object.keys(body) },
    });
    return c.json(toHookEventTypeObject(row), 200);
  });

  router.openapi(archiveHookEventTypeRoute, async (c) => {
    const { organizationId, environmentId } = c.var.auth;
    const row = await updateHookEventType({
      organizationId,
      environmentId,
      name: c.req.valid("param").name,
      archived: true,
    });
    await recordApiAudit(c, {
      action: "hook_event_type.archived",
      target: { type: "hook_event_type", id: row.id, label: row.name },
    });
    return c.json(toHookEventTypeObject(row), 200);
  });

  return router;
}
