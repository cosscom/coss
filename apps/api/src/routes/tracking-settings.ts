import {
  deleteTrackingRuleFor,
  getTrackingSettings,
  toTrackingRuleObject,
  toTrackingSettingsObject,
  updateTrackingRule,
} from "@coss/email";
import {
  DeletedTrackingRule,
  TrackingCategoryParams,
  TrackingRule,
  TrackingSettings,
  UpdateTrackingRuleRequest,
  type UpdateTrackingRuleRequestOutput,
} from "@coss/email/schemas";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { recordApiAudit } from "../audit.ts";
import { notFound } from "../errors.ts";
import { requireApiKey } from "../middleware/api-key.ts";
import { upgradeRequestBody } from "../middleware/api-version.ts";
import { rateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";
import { commonErrors, errorDoc, jsonDoc } from "./docs.ts";

// Settings change what every later send of the environment tracks, which a key that can send
// already decides per email (`tracking`), so they need `email:send` rather than a permission of
// their own (and existing keys need no backfill).
const READ = requireApiKey({ email: ["read"] });
const WRITE = requireApiKey({ email: ["send"] });

const SCOPE_NOTE =
  "Settings belong to the API key's own environment: a `coss_test_…` key only ever changes " +
  "sandbox settings. Emails keep the settings that applied when they were sent.";

const bodyErrors = {
  400: errorDoc("The body is not valid JSON (`invalid_json`)."),
  413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
  415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
};

export const getTrackingSettingsRoute = createRoute({
  method: "get",
  path: "/tracking_settings",
  operationId: "getTrackingSettings",
  tags: ["Tracking"],
  summary: "Retrieve tracking settings",
  description:
    "The environment's open and click tracking default and its category rules. For each of " +
    "`opens` and `clicks`, a send's own `tracking` wins, then the rule for its `category`, then " +
    `the default, then off. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [READ, rateLimit("api.read")],
  responses: {
    200: jsonDoc("The environment's tracking settings.", TrackingSettings),
    ...commonErrors,
  },
});

export const updateTrackingDefaultRoute = createRoute({
  method: "patch",
  path: "/tracking_settings/default",
  operationId: "updateTrackingDefault",
  tags: ["Tracking"],
  summary: "Update the tracking default",
  description:
    "Sets the environment default, which applies to emails without a rule for their category. " +
    "Fields left out keep their value; if there is no default yet, it is created with them off. " +
    SCOPE_NOTE,
  security: [{ bearerAuth: [] }],
  middleware: [
    WRITE,
    rateLimit("api.write"),
    upgradeRequestBody("PATCH /v1/tracking_settings/default"),
  ],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: UpdateTrackingRuleRequest } },
    },
  },
  responses: {
    200: jsonDoc("The environment default.", TrackingRule),
    ...bodyErrors,
    ...commonErrors,
    422: errorDoc("The body failed validation (`validation_error`, see `issues`)."),
  },
});

export const deleteTrackingDefaultRoute = createRoute({
  method: "delete",
  path: "/tracking_settings/default",
  operationId: "deleteTrackingDefault",
  tags: ["Tracking"],
  summary: "Remove the tracking default",
  description:
    "Removes the environment default: emails without a rule for their category are then not " +
    `tracked unless the send asks. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [WRITE, rateLimit("api.write")],
  responses: {
    200: jsonDoc("The default was removed.", DeletedTrackingRule),
    ...commonErrors,
    404: errorDoc("The environment has no default (`not_found`)."),
  },
});

export const updateTrackingCategoryRoute = createRoute({
  method: "patch",
  path: "/tracking_settings/categories/{category}",
  operationId: "updateTrackingCategory",
  tags: ["Tracking"],
  summary: "Update a category's tracking rule",
  description:
    "Sets the rule for emails sent with this `category`, which wins over the environment " +
    "default, e.g. to track `marketing` but never `password-reset`. Fields left out keep their " +
    `value; a new rule is created with them off. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [
    WRITE,
    rateLimit("api.write"),
    upgradeRequestBody("PATCH /v1/tracking_settings/categories/{category}"),
  ],
  request: {
    params: TrackingCategoryParams,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateTrackingRuleRequest } },
    },
  },
  responses: {
    200: jsonDoc("The category's rule.", TrackingRule),
    ...bodyErrors,
    ...commonErrors,
    422: errorDoc("The category or the body failed validation (`validation_error`, see `issues`)."),
  },
});

export const deleteTrackingCategoryRoute = createRoute({
  method: "delete",
  path: "/tracking_settings/categories/{category}",
  operationId: "deleteTrackingCategory",
  tags: ["Tracking"],
  summary: "Remove a category's tracking rule",
  description: `Removes the rule: emails of this category follow the environment default again. ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [WRITE, rateLimit("api.write")],
  request: { params: TrackingCategoryParams },
  responses: {
    200: jsonDoc("The rule was removed.", DeletedTrackingRule),
    ...commonErrors,
    404: errorDoc("The environment has no rule for this category (`not_found`)."),
    422: errorDoc("The category failed validation (`validation_error`, see `issues`)."),
  },
});

async function saveRule(
  c: Context<AppEnv>,
  category: string | null,
  body: UpdateTrackingRuleRequestOutput,
) {
  const { organizationId, environmentId } = c.var.auth;
  const row = await updateTrackingRule({ organizationId, environmentId }, category, body);
  // The key's environment always exists while the key authenticates.
  if (!row) throw new Error(`Environment ${environmentId} not found.`);
  await recordApiAudit(c, {
    action: "tracking_rule.saved",
    target: { type: "tracking_rule", id: row.id, label: category },
    metadata: { category, opens: row.opens, clicks: row.clicks },
  });
  return toTrackingRuleObject(row);
}

async function deleteRule(c: Context<AppEnv>, category: string | null, message: string) {
  const { organizationId, environmentId } = c.var.auth;
  const row = await deleteTrackingRuleFor({ organizationId, environmentId }, category);
  if (!row) throw notFound(message);
  await recordApiAudit(c, {
    action: "tracking_rule.deleted",
    target: { type: "tracking_rule", id: row.id, label: category },
    metadata: { category },
  });
  return { object: "tracking_rule" as const, id: row.id, category, deleted: true as const };
}

export function createTrackingSettingsRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(getTrackingSettingsRoute, async (c) => {
    const { organizationId, environmentId } = c.var.auth;
    const settings = await getTrackingSettings({ organizationId, environmentId });
    return c.json(toTrackingSettingsObject(settings), 200);
  });

  router.openapi(updateTrackingDefaultRoute, async (c) =>
    c.json(await saveRule(c, null, c.req.valid("json")), 200),
  );

  router.openapi(deleteTrackingDefaultRoute, async (c) =>
    c.json(await deleteRule(c, null, "This API key's environment has no tracking default."), 200),
  );

  router.openapi(updateTrackingCategoryRoute, async (c) => {
    const { category } = c.req.valid("param");
    return c.json(await saveRule(c, category, c.req.valid("json")), 200);
  });

  router.openapi(deleteTrackingCategoryRoute, async (c) => {
    const { category } = c.req.valid("param");
    return c.json(
      await deleteRule(
        c,
        category,
        "This API key's environment has no tracking rule for this category.",
      ),
      200,
    );
  });

  return router;
}
