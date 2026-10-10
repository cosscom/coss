import {
  addSuppression,
  checkSuppression,
  getSuppression,
  listSuppressions,
  removeSuppression,
} from "@coss/email";
import {
  CheckSuppressionQuery,
  CreateSuppressionRequest,
  DeletedSuppression,
  ListSuppressionsQuery,
  Suppression,
  SuppressionCheck,
  SuppressionList,
} from "@coss/email/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, requestIdHeader } from "./docs.ts";

const SuppressionIdParams = z.object({
  id: z.string().meta({
    description: "The suppression's id.",
    example: "sup_01k7c8m4q2f3e9v6t5r1n0p8yz",
  }),
});

const notFoundDoc = errorDoc(
  "No suppression with this id exists in the API key's environment (`not_found`).",
);

function json<T extends z.ZodType>(description: string, schema: T) {
  return {
    description,
    headers: { "X-Request-Id": requestIdHeader },
    content: { "application/json": { schema } },
  };
}

export const createSuppressionRoute = createRoute({
  method: "post",
  path: "/suppressions",
  operationId: "createSuppression",
  tags: ["Suppressions"],
  summary: "Add an address to the suppression list",
  description:
    "Suppresses an address in the API key's environment: later sends skip it, either for every " +
    'email (`scope: "*"`, the default) or only for emails with the given `category` (e.g. to ' +
    "back an unsubscribe link). Adding an address that is already suppressed with the same " +
    "scope returns the existing entry with status 200.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ suppression: ["create"] }), rateLimit("api.write")],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateSuppressionRequest } },
    },
  },
  responses: {
    200: json("The address already had an entry with this scope.", Suppression),
    201: json("The new entry.", Suppression),
    400: errorDoc("The body is not valid JSON (`invalid_json`)."),
    ...commonErrors,
    413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
    415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
    422: errorDoc("The body failed validation (`validation_error`, see `issues`)."),
  },
});

export const listSuppressionsRoute = createRoute({
  method: "get",
  path: "/suppressions",
  operationId: "listSuppressions",
  tags: ["Suppressions"],
  summary: "List suppressed addresses",
  description:
    "The suppression list of the API key's environment, newest first. Pass the last `id` as " +
    "`after` to get the next page while `has_more` is true.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ suppression: ["read"] }), rateLimit("api.read")],
  request: { query: ListSuppressionsQuery },
  responses: {
    200: json("A page of entries.", SuppressionList),
    ...commonErrors,
    422: errorDoc("A query parameter failed validation (`validation_error`, see `issues`)."),
  },
});

export const checkSuppressionRoute = createRoute({
  method: "get",
  path: "/suppressions/check",
  operationId: "checkSuppression",
  tags: ["Suppressions"],
  summary: "Check whether an address is suppressed",
  description:
    "Whether a send to `address` (with `category`, if given) would skip it, and the entries " +
    "that match: those with scope `*` and, with a `category`, those for that category.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ suppression: ["read"] }), rateLimit("api.read")],
  request: { query: CheckSuppressionQuery },
  responses: {
    200: json("The result.", SuppressionCheck),
    ...commonErrors,
    422: errorDoc("A query parameter failed validation (`validation_error`, see `issues`)."),
  },
});

export const getSuppressionRoute = createRoute({
  method: "get",
  path: "/suppressions/{id}",
  operationId: "getSuppression",
  tags: ["Suppressions"],
  summary: "Retrieve a suppression",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ suppression: ["read"] }), rateLimit("api.read")],
  request: { params: SuppressionIdParams },
  responses: {
    200: json("The entry.", Suppression),
    ...commonErrors,
    404: notFoundDoc,
  },
});

export const deleteSuppressionRoute = createRoute({
  method: "delete",
  path: "/suppressions/{id}",
  operationId: "deleteSuppression",
  tags: ["Suppressions"],
  summary: "Remove a suppression",
  description:
    "Removes the entry, so later sends reach the address again (unless another entry still " +
    "matches). Entries added for bounces and complaints can be removed too.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ suppression: ["delete"] }), rateLimit("api.write")],
  request: { params: SuppressionIdParams },
  responses: {
    200: json("The entry was removed.", DeletedSuppression),
    ...commonErrors,
    404: notFoundDoc,
  },
});

const NOT_FOUND_MESSAGE = "No suppression with this id exists in this API key's environment.";

export function createSuppressionRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(createSuppressionRoute, async (c) => {
    const params = c.req.valid("json");
    const { organizationId, environmentId } = c.var.auth;
    const result = await addSuppression({ organizationId, environmentId }, params);
    // The key's environment always exists while the key authenticates.
    if (!result) throw new Error(`Environment ${environmentId} not found.`);
    return result.created ? c.json(result.suppression, 201) : c.json(result.suppression, 200);
  });

  router.openapi(listSuppressionsRoute, async (c) => {
    const query = c.req.valid("query");
    const { organizationId, environmentId } = c.var.auth;
    return c.json(await listSuppressions({ organizationId, environmentId }, query), 200);
  });

  // Registered before `/suppressions/{id}`, which would otherwise match `check`.
  router.openapi(checkSuppressionRoute, async (c) => {
    const query = c.req.valid("query");
    const { organizationId, environmentId } = c.var.auth;
    return c.json(await checkSuppression({ organizationId, environmentId }, query), 200);
  });

  router.openapi(getSuppressionRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    const suppression = await getSuppression({ organizationId, environmentId }, id);
    if (!suppression) throw notFound(NOT_FOUND_MESSAGE);
    return c.json(suppression, 200);
  });

  router.openapi(deleteSuppressionRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { organizationId, environmentId } = c.var.auth;
    if (!(await removeSuppression({ organizationId, environmentId }, id))) {
      throw notFound(NOT_FOUND_MESSAGE);
    }
    return c.json({ object: "suppression" as const, id, deleted: true as const }, 200);
  });

  return router;
}
