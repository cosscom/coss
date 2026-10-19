import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import type {
  EmailObjectOutput,
  EmailTemplateListOutput,
  EmailTemplateObjectOutput,
  EmailTemplateVersionListOutput,
  EmailTemplateVersionObjectOutput,
  RenderedEmailTemplateObjectOutput,
} from "@coss/email/schemas";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  sendEmail,
  setKeyPermissions,
  type TestApp,
} from "./helpers.ts";

const TEMPLATE = {
  name: "Welcome",
  variables: [
    { name: "first_name", type: "string" },
    { name: "items", type: "list", required: false, fields: [{ name: "name", type: "string" }] },
  ],
  sample_variables: { first_name: "Ada" },
  contents: [
    {
      locale: "en",
      subject: "Welcome, {{first_name}}",
      html: "<p>Hi {{first_name}}</p>{{#each items}}<li>{{name}}</li>{{/each}}",
    },
    { locale: "de", subject: "Willkommen, {{first_name}}", text: "Hallo {{first_name}}" },
  ],
};

async function json<T>(response: Response, status = 200): Promise<T> {
  if (response.status !== status) {
    throw new Error(`expected ${status}, got ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function createTemplate(app: TestApp, key: string, body: object = TEMPLATE) {
  return json<EmailTemplateObjectOutput>(
    await apiRequest(app, "POST", "/v1/email_templates", { key, body }),
  );
}

async function auditActions(tenant: TestTenant): Promise<string[]> {
  const { rows } = await pool.query<{ action: string }>(
    "select action from org_audit_event where organization_id = $1 and actor_type = 'api_key' order by id",
    [tenant.organization.id],
  );
  return rows.map((row) => row.action);
}

describe("/v1/email_templates", () => {
  test("creates, edits, publishes and sends a template by alias", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch, sandboxProvider } = createTestApp();
    const key = tenant.sandboxKey;
    const alias = `welcome-${uniqueSuffix()}`;

    const template = await createTemplate(app, key, { ...TEMPLATE, alias });
    expect(template).toMatchObject({
      object: "email_template",
      alias,
      name: "Welcome",
      published_version: null,
      has_unpublished_changes: true,
    });
    expect(template.id).toStartWith("etpl_");

    // Not sendable before it is published.
    const unpublished = await sendEmail(app, key, {
      from: "Acme <hello@acme.com>",
      to: "user@example.com",
      template_id: alias,
      variables: { first_name: "Ada" },
    });
    expect(unpublished.status).toBe(422);
    expect(await errorOf(unpublished)).toMatchObject({
      type: "invalid_request_error",
      code: "template_not_published",
      param: "template_id",
    });

    const draft = await json<EmailTemplateVersionObjectOutput>(
      await apiRequest(app, "GET", `/v1/email_templates/${alias}/draft`, { key }),
    );
    expect(draft).toMatchObject({ version: null, revision: 1, default_locale: "en", problems: [] });

    const published = await json<EmailTemplateVersionObjectOutput>(
      await apiRequest(app, "POST", `/v1/email_templates/${template.id}/publish`, {
        key,
        body: { revision: 1 },
      }),
    );
    expect(published).toMatchObject({ version: 1, revision: 1, problems: [] });

    const sent = await json<EmailObjectOutput>(
      await sendEmail(app, key, {
        from: "Acme <hello@acme.com>",
        to: "user@example.com",
        template_id: alias,
        locale: "de-CH",
        variables: { first_name: "Ada" },
      }),
      202,
    );
    expect(sent).toMatchObject({
      subject: "Willkommen, Ada",
      html: null,
      text: "Hallo Ada",
      template: { id: template.id, version: 1, locale: "de" },
    });
    await dispatch();
    expect(sandboxProvider.sent.at(-1)?.subject).toBe("Willkommen, Ada");

    // A new draft doesn't change sends until it is published.
    const saved = await json<EmailTemplateVersionObjectOutput>(
      await apiRequest(app, "PUT", `/v1/email_templates/${template.id}/draft`, {
        key,
        body: {
          revision: 1,
          variables: TEMPLATE.variables,
          contents: [{ locale: "en", subject: "Hey {{first_name}}", text: "v2" }],
        },
      }),
    );
    expect(saved.revision).toBe(2);
    const stale = await apiRequest(app, "PUT", `/v1/email_templates/${template.id}/draft`, {
      key,
      body: { revision: 1 },
    });
    expect(await errorOf(stale)).toMatchObject({
      code: "template_revision_mismatch",
      param: "revision",
    });
    const second = await json<EmailTemplateVersionObjectOutput>(
      await apiRequest(app, "POST", `/v1/email_templates/${alias}/publish`, { key, body: {} }),
    );
    expect(second.version).toBe(2);

    const versions = await json<EmailTemplateVersionListOutput>(
      await apiRequest(app, "GET", `/v1/email_templates/${alias}/versions?limit=1`, { key }),
    );
    expect(versions.data.map((version) => version.version)).toEqual([2]);
    expect(versions.has_more).toBe(true);
    const v1 = await json<EmailTemplateVersionObjectOutput>(
      await apiRequest(app, "GET", `/v1/email_templates/${alias}/versions/1`, { key }),
    );
    expect(v1.contents.map((content) => content.locale)).toEqual(["de", "en"]);
    const missing = await apiRequest(app, "GET", `/v1/email_templates/${alias}/versions/9`, {
      key,
    });
    expect(missing.status).toBe(404);

    const restored = await json<EmailTemplateVersionObjectOutput>(
      await apiRequest(app, "POST", `/v1/email_templates/${alias}/versions/1/restore`, { key }),
    );
    expect(restored).toMatchObject({ version: null, revision: 3 });

    const renamed = await json<EmailTemplateObjectOutput>(
      await apiRequest(app, "PATCH", `/v1/email_templates/${alias}`, {
        key,
        body: { name: "Welcome v2" },
      }),
    );
    expect(renamed).toMatchObject({ name: "Welcome v2", has_unpublished_changes: true });

    const list = await json<EmailTemplateListOutput>(
      await apiRequest(app, "GET", "/v1/email_templates", { key }),
    );
    expect(list.data.map((item) => item.id)).toEqual([template.id]);

    expect(
      await json<object>(await apiRequest(app, "DELETE", `/v1/email_templates/${alias}`, { key })),
    ).toEqual({ object: "email_template", id: template.id, deleted: true });
    const gone = await apiRequest(app, "GET", `/v1/email_templates/${template.id}`, { key });
    expect(await errorOf(gone)).toMatchObject({ type: "not_found_error", code: "not_found" });

    expect(await auditActions(tenant)).toEqual([
      "email_template.created",
      "email_template.published",
      "email_template.draft_saved",
      "email_template.published",
      "email_template.version_restored",
      "email_template.updated",
      "email_template.deleted",
    ]);
  });

  test("reports invalid variables and drafts with issues", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    const template = await createTemplate(app, key);
    await json(
      await apiRequest(app, "POST", `/v1/email_templates/${template.id}/publish`, {
        key,
        body: {},
      }),
    );

    const invalid = await sendEmail(app, key, {
      from: "Acme <hello@acme.com>",
      to: "user@example.com",
      template_id: template.id,
      variables: { items: [{ name: 1 }] },
    });
    expect(invalid.status).toBe(422);
    expect(await errorOf(invalid)).toMatchObject({
      type: "invalid_request_error",
      code: "invalid_template_variables",
      param: "variables.first_name",
      issues: [
        { path: "variables.first_name", message: "Required." },
        { path: "variables.items.0.name", message: "Expected a string." },
      ],
    });

    const batch = await apiRequest(app, "POST", "/v1/emails/batch", {
      key,
      body: {
        emails: [
          { from: "a@acme.com", to: "b@example.com", subject: "Plain", text: "x" },
          { from: "a@acme.com", to: "b@example.com", template_id: "missing" },
        ],
      },
    });
    expect(await errorOf(batch)).toMatchObject({
      code: "template_not_found",
      param: "emails.1.template_id",
    });

    // Content next to a template is a validation error.
    const both = await sendEmail(app, key, {
      from: "a@acme.com",
      to: "b@example.com",
      subject: "x",
      template_id: template.id,
    });
    expect(await errorOf(both)).toMatchObject({
      code: "validation_error",
      issues: [
        { path: "subject", message: "Not allowed with `template_id`: the template provides it." },
      ],
    });

    await json(
      await apiRequest(app, "PUT", `/v1/email_templates/${template.id}/draft`, {
        key,
        body: { contents: [{ locale: "en", subject: "{{nope}}", text: "{{#if x}}" }] },
      }),
    );
    const publish = await apiRequest(app, "POST", `/v1/email_templates/${template.id}/publish`, {
      key,
      body: {},
    });
    expect(await errorOf(publish)).toMatchObject({
      code: "template_invalid",
      issues: [
        {
          path: "contents.en.subject",
          message: 'Line 1, column 1: "nope" is not a declared variable.',
        },
        {
          path: "contents.en.text",
          message: "Line 1, column 1: Unclosed {{#if x}}: expected {{/if}}.",
        },
      ],
    });
  });

  test("renders the draft or a version without sending", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = createTestApp();
    const key = tenant.sandboxKey;
    const template = await createTemplate(app, key, { ...TEMPLATE, alias: "welcome" });
    const render = (body: object, ref = "welcome") =>
      apiRequest(app, "POST", `/v1/email_templates/${ref}/render`, { key, body });

    // The draft, with its sample variables.
    expect(await json<RenderedEmailTemplateObjectOutput>(await render({}))).toEqual({
      object: "email_template_render",
      template_id: template.id,
      version: null,
      locale: "en",
      subject: "Welcome, Ada",
      html: "<p>Hi Ada</p>",
      text: null,
    });
    expect(
      await json<RenderedEmailTemplateObjectOutput>(
        await render({ locale: "de-AT", variables: { first_name: "Grace", items: [] } }),
      ),
    ).toMatchObject({ locale: "de", subject: "Willkommen, Grace", text: "Hallo Grace" });

    await json(
      await apiRequest(app, "POST", `/v1/email_templates/${template.id}/publish`, {
        key,
        body: {},
      }),
    );
    await json(
      await apiRequest(app, "PUT", `/v1/email_templates/${template.id}/draft`, {
        key,
        body: { contents: [{ locale: "en", subject: "{{nope}}", text: "x" }] },
      }),
    );
    // A published version still renders; the broken draft is refused like a publish.
    expect(
      await json<RenderedEmailTemplateObjectOutput>(await render({ version: 1 })),
    ).toMatchObject({
      version: 1,
      subject: "Welcome, Ada",
    });
    expect(await errorOf(await render({}))).toMatchObject({
      code: "template_invalid",
      issues: [{ path: "contents.en.subject" }],
    });
    expect(await errorOf(await render({ version: 1, variables: {} }))).toMatchObject({
      code: "invalid_template_variables",
      param: "variables.first_name",
    });
    expect(await errorOf(await render({ version: 9 }))).toMatchObject({
      code: "template_version_not_found",
      param: "version",
    });
    expect((await render({}, "missing")).status).toBe(404);

    // Nothing was sent.
    await dispatch();
    const emails = await json<{ data: unknown[] }>(
      await apiRequest(app, "GET", "/v1/emails", { key }),
    );
    expect(emails.data).toEqual([]);
  });

  test("keeps templates in their environment and refuses taken aliases", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const template = await createTemplate(app, tenant.sandboxKey, {
      ...TEMPLATE,
      alias: "welcome",
    });
    const taken = await apiRequest(app, "POST", "/v1/email_templates", {
      key: tenant.sandboxKey,
      body: { ...TEMPLATE, alias: "welcome" },
    });
    expect(await errorOf(taken)).toMatchObject({ code: "template_alias_taken", param: "alias" });
    // The same alias in another environment is fine (and is how sends stay the same everywhere).
    await createTemplate(app, tenant.liveKey, { ...TEMPLATE, alias: "welcome" });
    const other = await apiRequest(app, "GET", `/v1/email_templates/${template.id}`, {
      key: tenant.liveKey,
    });
    expect(other.status).toBe(404);
  });

  test("needs the emailTemplate permissions", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    const template = await createTemplate(app, key);
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["send", "read"],
      emailTemplate: ["read"],
    });
    expect((await apiRequest(app, "GET", "/v1/email_templates", { key })).status).toBe(200);
    for (const [method, path, body] of [
      ["POST", "/v1/email_templates", TEMPLATE],
      ["PATCH", `/v1/email_templates/${template.id}`, { name: "x" }],
      ["DELETE", `/v1/email_templates/${template.id}`, undefined],
      ["PUT", `/v1/email_templates/${template.id}/draft`, {}],
      ["POST", `/v1/email_templates/${template.id}/publish`, {}],
      ["POST", `/v1/email_templates/${template.id}/versions/1/restore`, undefined],
    ] as const) {
      const res = await apiRequest(app, method, path, { key, body });
      expect(res.status).toBe(403);
      expect(await errorOf(res)).toMatchObject({ code: "insufficient_permissions" });
    }
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["send", "read"],
    });
    expect((await apiRequest(app, "GET", "/v1/email_templates", { key })).status).toBe(403);
    // Authentication comes before validation.
    const unauthenticated = await apiRequest(app, "POST", "/v1/email_templates", {
      key: null,
      body: { bad: true },
    });
    expect(unauthenticated.status).toBe(401);
  });
});
