import { getStorageSettings, toStorageSettingsObject, updateStorageSettings } from "@coss/email";
import { StorageSettings, UpdateStorageSettingsRequest } from "@coss/email/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { recordApiAudit } from "../audit.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { upgradeRequestBody } from "../middleware/api-version.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, jsonDoc } from "./docs.ts";

// Like tracking settings: the setting changes what later sends of the environment keep, so it
// needs `email:send` rather than a permission of its own (and existing keys need no backfill).
const READ = requireApiKey({ email: ["read"] });
const WRITE = requireApiKey({ email: ["send"] });

const SCOPE_NOTE =
  "Settings belong to the API key's own environment: a `coss_test_…` key only ever changes " +
  "sandbox settings. Emails keep the setting that applied when they were sent.";

export const getStorageSettingsRoute = createRoute({
  method: "get",
  path: "/storage_settings",
  operationId: "getStorageSettings",
  tags: ["Content storage"],
  summary: "Retrieve storage settings",
  description:
    "Whether coss.com keeps the content of the environment's emails (`content_storage: " +
    '"store"`, the default) or only until each email is sent, fails or is canceled ' +
    `(\`"discard"\`). ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [READ, rateLimit("api.read")],
  responses: {
    200: jsonDoc("The environment's storage settings.", StorageSettings),
    ...commonErrors,
  },
});

export const updateStorageSettingsRoute = createRoute({
  method: "patch",
  path: "/storage_settings",
  operationId: "updateStorageSettings",
  tags: ["Content storage"],
  summary: "Update storage settings",
  description:
    'With `content_storage: "discard"`, emails sent from now on keep their subject, body, ' +
    "headers, template variables and attachment filenames only until they are sent, fail or " +
    "are canceled (scheduled emails keep them until their time comes); request logs never " +
    "keep them. Their metadata (addresses, tags, category, status, recipients, events) is kept " +
    `as usual. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [WRITE, rateLimit("api.write"), upgradeRequestBody("PATCH /v1/storage_settings")],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: UpdateStorageSettingsRequest } },
    },
  },
  responses: {
    200: jsonDoc("The environment's storage settings.", StorageSettings),
    400: errorDoc("The body is not valid JSON (`invalid_json`)."),
    413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
    415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
    ...commonErrors,
    422: errorDoc("The body failed validation (`validation_error`, see `issues`)."),
  },
});

export function createStorageSettingsRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(getStorageSettingsRoute, async (c) => {
    const { organizationId, environmentId } = c.var.auth;
    const settings = await getStorageSettings({ organizationId, environmentId });
    return c.json(toStorageSettingsObject(settings), 200);
  });

  router.openapi(updateStorageSettingsRoute, async (c) => {
    const { organizationId, environmentId } = c.var.auth;
    const { content_storage } = c.req.valid("json");
    const settings = await updateStorageSettings(
      { organizationId, environmentId },
      { contentStorage: content_storage },
    );
    // The key's environment always exists while the key authenticates.
    if (!settings) throw new Error(`Environment ${environmentId} not found.`);
    await recordApiAudit(c, {
      action: "storage_settings.updated",
      target: { type: "environment", id: environmentId },
      metadata: { content_storage },
    });
    return c.json(toStorageSettingsObject(settings), 200);
  });

  return router;
}
