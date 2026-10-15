import {
  createEmailTemplate,
  deleteEmailTemplate,
  getTemplateDraft,
  getTemplateVersion,
  MAX_TEMPLATES_PER_ENVIRONMENT,
  pageEmailTemplates,
  pageTemplateVersions,
  publishTemplateDraft,
  requireEmailTemplate,
  restoreTemplateVersion,
  saveTemplateDraft,
  toEmailTemplateObject,
  toEmailTemplateVersionObject,
  updateEmailTemplate,
} from "@coss/email";
import {
  CreateEmailTemplateRequest,
  DEFAULT_TEMPLATE_LIST_LIMIT,
  DEFAULT_TEMPLATE_VERSION_LIST_LIMIT,
  DeletedEmailTemplate,
  EmailTemplateIdParams,
  EmailTemplateList,
  EmailTemplateObject,
  EmailTemplateVersionList,
  EmailTemplateVersionObject,
  EmailTemplateVersionParams,
  ListEmailTemplatesQuery,
  ListEmailTemplateVersionsQuery,
  PublishEmailTemplateRequest,
  UpdateEmailTemplateDraftRequest,
  UpdateEmailTemplateRequest,
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

const TAG = "Email templates";

const SCOPE_NOTE =
  "Templates belong to the API key's own environment: a `coss_test_…` key only ever sees " +
  "sandbox ones. Give a template the same `alias` in every environment to send it by that name.";

const bodyErrors = {
  400: errorDoc("The body is not valid JSON (`invalid_json`)."),
  413: errorDoc("The request body is larger than 5 MB (`payload_too_large`)."),
  415: errorDoc("The body is not sent as `application/json` (`unsupported_media_type`)."),
};

const templateNotFound = errorDoc(
  "No template with this id or alias exists in the API key's environment (`not_found`).",
);

export const createEmailTemplateRoute = createRoute({
  method: "post",
  path: "/email_templates",
  operationId: "createEmailTemplate",
  tags: [TAG],
  summary: "Create an email template",
  description:
    "Creates a template with a draft holding its variables and a subject, HTML and text per " +
    "locale. Sends use it once its draft is published. Not idempotent: retrying after a lost " +
    `response can create a second template (unless it has an \`alias\`). ${SCOPE_NOTE}`,
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ emailTemplate: ["create"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/email_templates"),
  ],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: CreateEmailTemplateRequest } },
    },
  },
  responses: {
    200: jsonDoc("The template.", EmailTemplateObject),
    ...bodyErrors,
    ...commonErrors,
    422: errorDoc(
      "The body failed validation (`validation_error`), another template has the alias " +
        "(`template_alias_taken`), or the environment has " +
        `${MAX_TEMPLATES_PER_ENVIRONMENT} templates (\`template_limit_reached\`).`,
    ),
  },
});

export const listEmailTemplatesRoute = createRoute({
  method: "get",
  path: "/email_templates",
  operationId: "listEmailTemplates",
  tags: [TAG],
  summary: "List email templates",
  description:
    "The environment's templates, newest first. Pass the last `id` as `after` to get the next " +
    "page while `has_more` is true.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ emailTemplate: ["read"] }), rateLimit("api.read")],
  request: { query: ListEmailTemplatesQuery },
  responses: {
    200: jsonDoc("A page of templates.", EmailTemplateList),
    ...commonErrors,
    422: errorDoc("A query parameter failed validation (`validation_error`, see `issues`)."),
  },
});

export const getEmailTemplateRoute = createRoute({
  method: "get",
  path: "/email_templates/{id}",
  operationId: "getEmailTemplate",
  tags: [TAG],
  summary: "Retrieve an email template",
  description: "A template by id or alias. Its content is in its draft and versions.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ emailTemplate: ["read"] }), rateLimit("api.read")],
  request: { params: EmailTemplateIdParams },
  responses: {
    200: jsonDoc("The template.", EmailTemplateObject),
    ...commonErrors,
    404: templateNotFound,
  },
});

export const updateEmailTemplateRoute = createRoute({
  method: "patch",
  path: "/email_templates/{id}",
  operationId: "updateEmailTemplate",
  tags: [TAG],
  summary: "Update an email template",
  description:
    "Changes the template's name, alias or description. Changing the alias changes what sends " +
    "must use. Content changes go to the draft (`PUT /v1/email_templates/{id}/draft`).",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ emailTemplate: ["update"] }),
    rateLimit("api.write"),
    upgradeRequestBody("PATCH /v1/email_templates/{id}"),
  ],
  request: {
    params: EmailTemplateIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateEmailTemplateRequest } },
    },
  },
  responses: {
    200: jsonDoc("The template.", EmailTemplateObject),
    ...bodyErrors,
    ...commonErrors,
    404: templateNotFound,
    422: errorDoc(
      "The body failed validation (`validation_error`), or another template has the alias " +
        "(`template_alias_taken`).",
    ),
  },
});

export const deleteEmailTemplateRoute = createRoute({
  method: "delete",
  path: "/email_templates/{id}",
  operationId: "deleteEmailTemplate",
  tags: [TAG],
  summary: "Delete an email template",
  description:
    "Deletes the template with its draft and every version. Emails already sent or scheduled " +
    "from it keep their content; new sends naming it fail with `template_not_found`.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ emailTemplate: ["delete"] }), rateLimit("api.write")],
  request: { params: EmailTemplateIdParams },
  responses: {
    200: jsonDoc("The template was deleted.", DeletedEmailTemplate),
    ...commonErrors,
    404: templateNotFound,
  },
});

export const getEmailTemplateDraftRoute = createRoute({
  method: "get",
  path: "/email_templates/{id}/draft",
  operationId: "getEmailTemplateDraft",
  tags: [TAG],
  summary: "Retrieve a template's draft",
  description:
    "The draft (`version: null`): what the next publish makes sends use. `problems` lists syntax " +
    "errors and undeclared variables, which keep it from being published.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ emailTemplate: ["read"] }), rateLimit("api.read")],
  request: { params: EmailTemplateIdParams },
  responses: {
    200: jsonDoc("The draft.", EmailTemplateVersionObject),
    ...commonErrors,
    404: templateNotFound,
  },
});

export const updateEmailTemplateDraftRoute = createRoute({
  method: "put",
  path: "/email_templates/{id}/draft",
  operationId: "updateEmailTemplateDraft",
  tags: [TAG],
  summary: "Update a template's draft",
  description:
    "Replaces the draft's variables and content. Sends keep using the published version until " +
    "the draft is published. Pass the `revision` you read to refuse overwriting someone else's " +
    "changes. A draft with problems is saved (and reported in `problems`).",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ emailTemplate: ["update"] }),
    rateLimit("api.write"),
    upgradeRequestBody("PUT /v1/email_templates/{id}/draft"),
  ],
  request: {
    params: EmailTemplateIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: UpdateEmailTemplateDraftRequest } },
    },
  },
  responses: {
    200: jsonDoc("The saved draft.", EmailTemplateVersionObject),
    ...bodyErrors,
    ...commonErrors,
    404: templateNotFound,
    422: errorDoc(
      "The body failed validation (`validation_error`), or the draft changed since `revision` " +
        "(`template_revision_mismatch`).",
    ),
  },
});

export const publishEmailTemplateRoute = createRoute({
  method: "post",
  path: "/email_templates/{id}/publish",
  operationId: "publishEmailTemplate",
  tags: [TAG],
  summary: "Publish a template's draft",
  description:
    "Copies the draft into the next version, which sends use from then on. Emails already " +
    "accepted keep the content they were rendered with. A draft without changes since the last " +
    "publish returns that version, so retrying with the `revision` you reviewed is safe (without " +
    "it, a retry could publish edits saved in between).",
  security: [{ bearerAuth: [] }],
  middleware: [
    requireApiKey({ emailTemplate: ["publish"] }),
    rateLimit("api.write"),
    upgradeRequestBody("POST /v1/email_templates/{id}/publish"),
  ],
  request: {
    params: EmailTemplateIdParams,
    body: {
      required: true,
      content: { "application/json": { schema: PublishEmailTemplateRequest } },
    },
  },
  responses: {
    200: jsonDoc("The published version.", EmailTemplateVersionObject),
    ...bodyErrors,
    ...commonErrors,
    404: templateNotFound,
    422: errorDoc(
      "The draft has problems or no content for its default locale (`template_invalid`, see " +
        "`issues`), or changed since `revision` (`template_revision_mismatch`).",
    ),
  },
});

export const listEmailTemplateVersionsRoute = createRoute({
  method: "get",
  path: "/email_templates/{id}/versions",
  operationId: "listEmailTemplateVersions",
  tags: [TAG],
  summary: "List a template's versions",
  description:
    "Published versions, newest first. Pass the last `version` as `after` to get the next page " +
    "while `has_more` is true.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ emailTemplate: ["read"] }), rateLimit("api.read")],
  request: { params: EmailTemplateIdParams, query: ListEmailTemplateVersionsQuery },
  responses: {
    200: jsonDoc("A page of versions.", EmailTemplateVersionList),
    ...commonErrors,
    404: templateNotFound,
    422: errorDoc("A query parameter failed validation (`validation_error`, see `issues`)."),
  },
});

export const getEmailTemplateVersionRoute = createRoute({
  method: "get",
  path: "/email_templates/{id}/versions/{version}",
  operationId: "getEmailTemplateVersion",
  tags: [TAG],
  summary: "Retrieve a template version",
  description: "A published version, which never changes.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ emailTemplate: ["read"] }), rateLimit("api.read")],
  request: { params: EmailTemplateVersionParams },
  responses: {
    200: jsonDoc("The version.", EmailTemplateVersionObject),
    ...commonErrors,
    404: errorDoc(
      "No template with this id or alias exists in the API key's environment, or it has no such " +
        "version (`not_found`).",
    ),
  },
});

export const restoreEmailTemplateVersionRoute = createRoute({
  method: "post",
  path: "/email_templates/{id}/versions/{version}/restore",
  operationId: "restoreEmailTemplateVersion",
  tags: [TAG],
  summary: "Restore a template version",
  description:
    "Replaces the draft with a published version's variables and content. Publish the draft to " +
    "make sends use it again.",
  security: [{ bearerAuth: [] }],
  middleware: [requireApiKey({ emailTemplate: ["update"] }), rateLimit("api.write")],
  request: { params: EmailTemplateVersionParams },
  responses: {
    200: jsonDoc("The draft.", EmailTemplateVersionObject),
    ...commonErrors,
    404: templateNotFound,
    422: errorDoc("The template has no such version (`template_version_not_found`)."),
  },
});

function scope(c: Context<AppEnv>) {
  const { organizationId, environmentId } = c.var.auth;
  return { organizationId, environmentId };
}

export function createEmailTemplateRoutes(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(createEmailTemplateRoute, async (c) => {
    const body = c.req.valid("json");
    const template = await createEmailTemplate(scope(c), body);
    await recordApiAudit(c, {
      action: "email_template.created",
      target: { type: "email_template", id: template.id, label: template.name },
    });
    return c.json(toEmailTemplateObject(template), 200);
  });

  router.openapi(listEmailTemplatesRoute, async (c) => {
    const query = c.req.valid("query");
    const page = await pageEmailTemplates(scope(c), {
      limit: query.limit ?? DEFAULT_TEMPLATE_LIST_LIMIT,
      after: query.after,
    });
    return c.json(
      {
        object: "list" as const,
        data: page.templates.map(toEmailTemplateObject),
        has_more: page.hasMore,
      },
      200,
    );
  });

  router.openapi(getEmailTemplateRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(toEmailTemplateObject(await requireEmailTemplate(scope(c), id)), 200);
  });

  router.openapi(updateEmailTemplateRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const template = await updateEmailTemplate(scope(c), id, body);
    await recordApiAudit(c, {
      action: "email_template.updated",
      target: { type: "email_template", id: template.id, label: template.name },
      metadata: { fields: Object.keys(body) },
    });
    return c.json(toEmailTemplateObject(template), 200);
  });

  router.openapi(deleteEmailTemplateRoute, async (c) => {
    const { id } = c.req.valid("param");
    const template = await requireEmailTemplate(scope(c), id);
    await deleteEmailTemplate(scope(c), template.id);
    await recordApiAudit(c, {
      action: "email_template.deleted",
      target: { type: "email_template", id: template.id, label: template.name },
    });
    return c.json(
      { object: "email_template" as const, id: template.id, deleted: true as const },
      200,
    );
  });

  router.openapi(getEmailTemplateDraftRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { draft } = await getTemplateDraft(scope(c), id);
    return c.json(toEmailTemplateVersionObject(draft), 200);
  });

  router.openapi(updateEmailTemplateDraftRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { template, draft } = await saveTemplateDraft(scope(c), id, c.req.valid("json"));
    await recordApiAudit(c, {
      action: "email_template.draft_saved",
      target: { type: "email_template", id: template.id, label: template.name },
      metadata: { revision: draft.revision },
    });
    return c.json(toEmailTemplateVersionObject(draft), 200);
  });

  router.openapi(publishEmailTemplateRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { template, version, published } = await publishTemplateDraft(
      scope(c),
      id,
      c.req.valid("json"),
    );
    if (published) {
      await recordApiAudit(c, {
        action: "email_template.published",
        target: { type: "email_template", id: template.id, label: template.name },
        metadata: { version: version.version },
      });
    }
    return c.json(toEmailTemplateVersionObject(version), 200);
  });

  router.openapi(listEmailTemplateVersionsRoute, async (c) => {
    const { id } = c.req.valid("param");
    const query = c.req.valid("query");
    const page = await pageTemplateVersions(scope(c), id, {
      limit: query.limit ?? DEFAULT_TEMPLATE_VERSION_LIST_LIMIT,
      after: query.after,
    });
    return c.json(
      {
        object: "list" as const,
        data: page.versions.map(toEmailTemplateVersionObject),
        has_more: page.hasMore,
      },
      200,
    );
  });

  router.openapi(getEmailTemplateVersionRoute, async (c) => {
    const { id, version } = c.req.valid("param");
    const found = await getTemplateVersion(scope(c), id, version);
    if (!found.version) throw notFound(`The template has no version ${version}.`);
    return c.json(toEmailTemplateVersionObject(found.version), 200);
  });

  router.openapi(restoreEmailTemplateVersionRoute, async (c) => {
    const { id, version } = c.req.valid("param");
    const { template, draft } = await restoreTemplateVersion(scope(c), id, version);
    await recordApiAudit(c, {
      action: "email_template.version_restored",
      target: { type: "email_template", id: template.id, label: template.name },
      metadata: { version },
    });
    return c.json(toEmailTemplateVersionObject(draft), 200);
  });

  return router;
}
