import {
  createLogDrain,
  deleteLogDrain,
  getLogDrain,
  getLogDrainBatch,
  LOG_DRAIN_MAX_ATTEMPTS,
  type LogDrainRow,
  listLogDrains,
  MAX_BATCH_BYTES,
  MAX_BATCH_LINES,
  MAX_LOG_DRAINS_PER_ENVIRONMENT,
  pageLogDrainBatches,
  toLogDrainBatchObject,
  toLogDrainObject,
  updateLogDrain,
  type WebhookManagementDeps,
} from "@coss/webhooks";
import {
  CreateLogDrainRequest,
  DeletedLogDrain,
  ListLogDrainBatchesQuery,
  LogDrainBatchList,
  LogDrainBatchObject,
  LogDrainList,
  LogDrainObject,
  LogDrainWithSecret,
  UpdateLogDrainRequest,
} from "@coss/webhooks/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { recordApiAudit } from "../audit.ts";
import { notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { upgradeRequestBody } from "../middleware/api-version.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { billingErrorDoc, commonErrors, errorDoc, jsonDoc } from "./docs.ts";

const DrainIdParams = z.object({
  id: z.string().meta({
    description: "The log drain's id.",
    examples: ["drain_01k7c8m4q2f3e9v6t5r1n0p8yz"],
  }),
});

const BatchParams = DrainIdParams.extend({
  batch_id: z.string().meta({
    description: "The batch's id.",
    examples: ["drainbat_01k7c8n2b5d7f9h1k3m5p7r9tv"],
  }),
});

const SCOPE_NOTE =
  "Log drains belong to the API key's own environment: a `coss_test_…` key only ever sees " +
  "sandbox drains, and a `coss_live_…` key only production ones.";

const drainNotFound = errorDoc(
  "No log drain with this id exists in the API key's environment (`not_found`).",
);

const bodyErrors = {
  400: errorDoc("The body is not valid JSON (`invalid_json`)."),
  413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
  415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
};

export const createLogDrainRoute = createRoute({
  method: "post",
  path: "/log_drains",
  operationId: "createLogDrain",
  tags: ["Log drains"],
  summary: "Create a log drain",
  description:
    "Streams the environment's logs to a URL: every line `GET /v1/logs` returns (API requests, " +
    "email events, webhook attempts) and the environment's audit events, posted as signed NDJSON " +
    `batches of up to ${MAX_BATCH_LINES} lines or ${MAX_BATCH_BYTES / 1_000_000} MB, usually within ` +
    `seconds. ${SCOPE_NOTE} The response carries the signing secret, which is returned only ` +
    "here: store it, and verify every batch with it (`verifyLogDrainBatch` in the SDK).",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ logDrain: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/log_drains"),
  ],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateLogDrainRequest } },
    },
  },
  responses: {
    200: jsonDoc("The drain and its signing secret.", LogDrainWithSecret),
    ...bodyErrors,
    ...commonErrors,
    402: billingErrorDoc(
      "The organization's plan doesn't include log drains (`plan_feature_unavailable`)",
    ),
    422: errorDoc(
      "The body failed validation (`validation_error`), the URL is not a usable https:// URL " +
        "(`invalid_url`), or the environment already has " +
        `${MAX_LOG_DRAINS_PER_ENVIRONMENT} drains (\`too_many_log_drains\`).`,
    ),
  },
});

export const listLogDrainsRoute = createRoute({
  method: "get",
  path: "/log_drains",
  operationId: "listLogDrains",
  tags: ["Log drains"],
  summary: "List log drains",
  description: `Every drain of the API key's environment, oldest first. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ logDrain: ["read"] }), rateLimit("api.read")],
  responses: {
    200: jsonDoc("The environment's log drains.", LogDrainList),
    ...commonErrors,
  },
});

export const getLogDrainRoute = createRoute({
  method: "get",
  path: "/log_drains/{id}",
  operationId: "getLogDrain",
  tags: ["Log drains"],
  summary: "Retrieve a log drain",
  description: "The drain without its signing secret, which is only returned when created.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ logDrain: ["read"] }), rateLimit("api.read")],
  request: { params: DrainIdParams },
  responses: {
    200: jsonDoc("The log drain.", LogDrainObject),
    ...commonErrors,
    404: drainNotFound,
  },
});

export const updateLogDrainRoute = createRoute({
  method: "patch",
  path: "/log_drains/{id}",
  operationId: "updateLogDrain",
  tags: ["Log drains"],
  summary: "Update a log drain",
  description:
    "Changes the URL, description, sources or `enabled` flag. Omitted fields keep their current " +
    "value, and the signing secret stays the same. Disabling a drain drops the lines still " +
    "waiting for it, and nothing is kept for it while it is disabled; enabling it again (also " +
    "after coss.com disabled it for failing) sends lines logged from then on.",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ logDrain: ["update"] }),
    rateLimit("api.write"),
    upgradeRequestBody("PATCH /v1/log_drains/{id}"),
  ],
  request: {
    params: DrainIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateLogDrainRequest } },
    },
  },
  responses: {
    200: jsonDoc("The updated drain.", LogDrainObject),
    ...bodyErrors,
    ...commonErrors,
    402: billingErrorDoc(
      "Re-enabling the drain needs a plan with log drains (`plan_feature_unavailable`)",
    ),
    404: drainNotFound,
    422: errorDoc(
      "The body failed validation (`validation_error`) or the URL is not a usable https:// URL " +
        "(`invalid_url`).",
    ),
  },
});

export const deleteLogDrainRoute = createRoute({
  method: "delete",
  path: "/log_drains/{id}",
  operationId: "deleteLogDrain",
  tags: ["Log drains"],
  summary: "Delete a log drain",
  description:
    "Removes the drain and its batch log. Lines still waiting for it are dropped. To stop it " +
    "temporarily, set `enabled` to `false` instead.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ logDrain: ["delete"] }), rateLimit("api.write")],
  request: { params: DrainIdParams },
  responses: {
    200: jsonDoc("The drain was deleted.", DeletedLogDrain),
    ...commonErrors,
    404: drainNotFound,
  },
});

const batchNotFound = errorDoc(
  "No log drain with this id exists in the API key's environment, or the drain has no batch " +
    "with this id (`not_found`).",
);

export const listLogDrainBatchesRoute = createRoute({
  method: "get",
  path: "/log_drains/{id}/batches",
  operationId: "listLogDrainBatches",
  tags: ["Log drains"],
  summary: "List a drain's batches",
  description:
    "The drain's delivery log, newest first: one batch per NDJSON request, with every HTTP " +
    `attempt. A failing batch is retried with backoff for about a day (${LOG_DRAIN_MAX_ATTEMPTS} ` +
    "attempts); if every attempt fails, the drain is disabled. Pass the last `id` as `after` to " +
    "get the next page while `has_more` is true.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ logDrain: ["read"] }), rateLimit("api.read")],
  request: { params: DrainIdParams, query: ListLogDrainBatchesQuery },
  responses: {
    200: jsonDoc("A page of batches.", LogDrainBatchList),
    ...commonErrors,
    404: drainNotFound,
    422: errorDoc("A query parameter failed validation (`validation_error`, see `issues`)."),
  },
});

export const getLogDrainBatchRoute = createRoute({
  method: "get",
  path: "/log_drains/{id}/batches/{batch_id}",
  operationId: "getLogDrainBatch",
  tags: ["Log drains"],
  summary: "Retrieve a batch",
  description: "One batch of the drain, with every HTTP attempt.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ logDrain: ["read"] }), rateLimit("api.read")],
  request: { params: BatchParams },
  responses: {
    200: jsonDoc("The batch.", LogDrainBatchObject),
    ...commonErrors,
    404: batchNotFound,
  },
});

export function createLogDrainRoutes(deps: WebhookManagementDeps): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  /** The drain addressed by the path, checked to belong to the key's own environment. */
  async function requireDrain(auth: AppEnv["Variables"]["auth"], id: string): Promise<LogDrainRow> {
    const row = await getLogDrain({ organizationId: auth.organizationId, id });
    // Malformed, unknown, other-environment and other-organization ids are all a 404.
    if (!row || row.environmentId !== auth.environmentId) {
      throw notFound("No log drain with this id exists in this API key's environment.");
    }
    return row;
  }

  router.openapi(createLogDrainRoute, async (c) => {
    const body = c.req.valid("json");
    const { organizationId, environmentId } = c.var.auth;
    // Tenancy always comes from the authenticated key, never from the request.
    const { drain, secret } = await createLogDrain(
      {
        organizationId,
        environmentId,
        url: body.url,
        description: body.description,
        // Omitted means every source, including ones added later.
        sources: body.sources ?? [],
        userId: null,
      },
      deps,
    );
    await recordApiAudit(c, {
      action: "log_drain.created",
      target: { type: "log_drain", id: drain.id, label: drain.url },
      metadata: { sources: drain.sources },
    });
    return c.json({ ...toLogDrainObject(drain), secret }, 200);
  });

  router.openapi(listLogDrainsRoute, async (c) => {
    const { organizationId, environmentId } = c.var.auth;
    const rows = await listLogDrains({ organizationId, environmentId });
    return c.json(
      { object: "list" as const, data: rows.map(toLogDrainObject), has_more: false },
      200,
    );
  });

  router.openapi(getLogDrainRoute, async (c) => {
    const row = await requireDrain(c.var.auth, c.req.valid("param").id);
    return c.json(toLogDrainObject(row), 200);
  });

  router.openapi(updateLogDrainRoute, async (c) => {
    const body = c.req.valid("json");
    const row = await requireDrain(c.var.auth, c.req.valid("param").id);
    const updated = await updateLogDrain(
      {
        organizationId: row.organizationId,
        id: row.id,
        url: body.url,
        description: body.description,
        sources: body.sources,
        enabled: body.enabled,
      },
      deps,
    );
    await recordApiAudit(c, {
      action: "log_drain.updated",
      target: { type: "log_drain", id: updated.id, label: updated.url },
      metadata: { fields: Object.keys(body) },
    });
    return c.json(toLogDrainObject(updated), 200);
  });

  router.openapi(deleteLogDrainRoute, async (c) => {
    const row = await requireDrain(c.var.auth, c.req.valid("param").id);
    await deleteLogDrain({ organizationId: row.organizationId, id: row.id });
    await recordApiAudit(c, {
      action: "log_drain.deleted",
      target: { type: "log_drain", id: row.id, label: row.url },
    });
    return c.json({ object: "log_drain" as const, id: row.id, deleted: true as const }, 200);
  });

  router.openapi(listLogDrainBatchesRoute, async (c) => {
    const query = c.req.valid("query");
    const drain = await requireDrain(c.var.auth, c.req.valid("param").id);
    const page = await pageLogDrainBatches({
      organizationId: drain.organizationId,
      drainId: drain.id,
      status: query.status,
      limit: query.limit,
      after: query.after,
    });
    return c.json(
      {
        object: "list" as const,
        data: page.batches.map(toLogDrainBatchObject),
        has_more: page.hasMore,
      },
      200,
    );
  });

  router.openapi(getLogDrainBatchRoute, async (c) => {
    const { id, batch_id } = c.req.valid("param");
    const drain = await requireDrain(c.var.auth, id);
    const batch = await getLogDrainBatch({
      organizationId: drain.organizationId,
      drainId: drain.id,
      id: batch_id,
    });
    if (!batch) throw notFound("This log drain has no batch with this id.");
    return c.json(toLogDrainBatchObject(batch), 200);
  });

  return router;
}
