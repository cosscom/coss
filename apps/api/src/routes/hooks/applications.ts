import {
  createHookApplication,
  deleteHookApplication,
  MAX_APPLICATIONS,
  pageHookApplications,
  toHookApplicationObject,
  updateHookApplication,
} from "@coss/hooks";
import {
  CreateHookApplicationRequest,
  DeletedHookApplication,
  HookApplicationList,
  HookApplicationObject,
  ListHookApplicationsQuery,
  UpdateHookApplicationRequest,
} from "@coss/hooks/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { recordApiAudit } from "../../audit.ts";
import { requireApiKey } from "../../middleware/api-key.ts";
import { upgradeRequestBody } from "../../middleware/api-version.ts";
import { rateLimit } from "../../middleware/rate-limit.ts";
import type { AppEnv } from "../../types.ts";
import { commonErrors, errorDoc, jsonDoc } from "../docs.ts";
import {
  ApplicationParams,
  applicationNotFound,
  bodyErrors,
  requireApplication,
  SCOPE_NOTE,
  TAGS,
} from "./shared.ts";

export const createHookApplicationRoute = createRoute({
  method: "post",
  path: "/hooks/applications",
  operationId: "createHookApplication",
  tags: [TAGS.applications],
  summary: "Create an application",
  description:
    "Creates an application: one of your customers (or users), who gets their own endpoints and " +
    `portal. Give it a \`uid\` (e.g. your customer's id) to address it by in every path. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ hook: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/hooks/applications"),
  ],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateHookApplicationRequest } },
    },
  },
  responses: {
    200: jsonDoc("The application.", HookApplicationObject),
    ...bodyErrors,
    ...commonErrors,
    422: errorDoc(
      "The body failed validation (`validation_error`), the `uid` is taken (`uid_taken`), or the " +
        `environment has the most applications it can (${MAX_APPLICATIONS.live.toLocaleString("en-US")} ` +
        `live, ${MAX_APPLICATIONS.sandbox} sandbox: \`too_many_applications\`).`,
    ),
  },
});

export const listHookApplicationsRoute = createRoute({
  method: "get",
  path: "/hooks/applications",
  operationId: "listHookApplications",
  tags: [TAGS.applications],
  summary: "List applications",
  description: `The environment's applications, newest first. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ hook: ["read"] }), rateLimit("api.read")],
  request: { query: ListHookApplicationsQuery },
  responses: {
    200: jsonDoc("A page of applications.", HookApplicationList),
    ...commonErrors,
  },
});

export const getHookApplicationRoute = createRoute({
  method: "get",
  path: "/hooks/applications/{application}",
  operationId: "getHookApplication",
  tags: [TAGS.applications],
  summary: "Retrieve an application",
  description: "An application of the API key's environment, by its id or uid.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ hook: ["read"] }), rateLimit("api.read")],
  request: { params: ApplicationParams },
  responses: {
    200: jsonDoc("The application.", HookApplicationObject),
    ...commonErrors,
    404: applicationNotFound,
  },
});

export const updateHookApplicationRoute = createRoute({
  method: "patch",
  path: "/hooks/applications/{application}",
  operationId: "updateHookApplication",
  tags: [TAGS.applications],
  summary: "Update an application",
  description: "Changes the name, uid or metadata. Fields left out keep their value.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ hook: ["update"] }),
    rateLimit("api.write"),
    upgradeRequestBody("PATCH /v1/hooks/applications/{application}"),
  ],
  request: {
    params: ApplicationParams,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateHookApplicationRequest } },
    },
  },
  responses: {
    200: jsonDoc("The application.", HookApplicationObject),
    ...bodyErrors,
    ...commonErrors,
    404: applicationNotFound,
    422: errorDoc(
      "The body failed validation (`validation_error`) or the uid is taken (`uid_taken`).",
    ),
  },
});

export const deleteHookApplicationRoute = createRoute({
  method: "delete",
  path: "/hooks/applications/{application}",
  operationId: "deleteHookApplication",
  tags: [TAGS.applications],
  summary: "Delete an application",
  description:
    "Deletes the application with its endpoints and portal sessions; pending deliveries stop. Its " +
    "messages are no longer reachable and are deleted with the rest of their day's data.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ hook: ["delete"] }), rateLimit("api.write")],
  request: { params: ApplicationParams },
  responses: {
    200: jsonDoc("The application was deleted.", DeletedHookApplication),
    ...commonErrors,
    404: applicationNotFound,
  },
});

export function createHookApplicationRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(createHookApplicationRoute, async (c) => {
    const body = c.req.valid("json");
    const { organizationId, environmentId } = c.var.auth;
    const row = await createHookApplication({
      organizationId,
      environmentId,
      name: body.name,
      uid: body.uid,
      metadata: body.metadata,
    });
    await recordApiAudit(c, {
      action: "hook_application.created",
      target: { type: "hook_application", id: row.id, label: row.uid ?? row.name },
    });
    return c.json(toHookApplicationObject(row), 200);
  });

  router.openapi(listHookApplicationsRoute, async (c) => {
    const query = c.req.valid("query");
    const { organizationId, environmentId } = c.var.auth;
    const page = await pageHookApplications({
      organizationId,
      environmentId,
      limit: query.limit,
      after: query.after,
    });
    return c.json(
      {
        object: "list" as const,
        data: page.applications.map(toHookApplicationObject),
        has_more: page.hasMore,
      },
      200,
    );
  });

  router.openapi(getHookApplicationRoute, async (c) => {
    const row = await requireApplication(c.var.auth, c.req.valid("param").application);
    return c.json(toHookApplicationObject(row), 200);
  });

  router.openapi(updateHookApplicationRoute, async (c) => {
    const existing = await requireApplication(c.var.auth, c.req.valid("param").application);
    const body = c.req.valid("json");
    const row = await updateHookApplication({
      organizationId: existing.organizationId,
      id: existing.id,
      name: body.name,
      uid: body.uid,
      metadata: body.metadata,
    });
    await recordApiAudit(c, {
      action: "hook_application.updated",
      target: { type: "hook_application", id: row.id, label: row.uid ?? row.name },
      metadata: { fields: Object.keys(body) },
    });
    return c.json(toHookApplicationObject(row), 200);
  });

  router.openapi(deleteHookApplicationRoute, async (c) => {
    const existing = await requireApplication(c.var.auth, c.req.valid("param").application);
    await deleteHookApplication({ organizationId: existing.organizationId, id: existing.id });
    await recordApiAudit(c, {
      action: "hook_application.deleted",
      target: { type: "hook_application", id: existing.id, label: existing.uid ?? existing.name },
    });
    return c.json(
      { object: "hook_application" as const, id: existing.id, deleted: true as const },
      200,
    );
  });

  return router;
}
