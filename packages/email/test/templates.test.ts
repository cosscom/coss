import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { EmailError } from "../src/errors.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { hashSendRequest } from "../src/request-hash.ts";
import {
  CreateEmailTemplateRequest,
  type CreateEmailTemplateRequestInput,
  UpdateEmailTemplateDraftRequest,
  type UpdateEmailTemplateDraftRequestInput,
} from "../src/schemas.ts";
import { createEmailService } from "../src/service.ts";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplate,
  getTemplateDraft,
  MAX_TEMPLATES_PER_ENVIRONMENT,
  pageEmailTemplates,
  pageTemplateVersions,
  publishTemplateDraft,
  restoreTemplateVersion,
  saveTemplateDraft,
  toEmailTemplateVersionObject,
  updateEmailTemplate,
} from "../src/templates.ts";
import { memoryDispatchQueue } from "../src/testing.ts";
import { params, sendEnvironment } from "./helpers.ts";

const WELCOME: CreateEmailTemplateRequestInput = {
  name: "Welcome",
  variables: [
    { name: "first_name", type: "string" },
    { name: "plan", type: "string", default: "Free" },
    {
      name: "items",
      type: "list",
      required: false,
      fields: [{ name: "name", type: "string" }],
    },
  ],
  sample_variables: { first_name: "Ada" },
  contents: [
    {
      locale: "en",
      subject: "Welcome, {{first_name}}",
      html: "<p>Hi {{first_name}} ({{plan}})</p>{{#each items}}<li>{{name}}</li>{{/each}}",
      text: "Hi {{first_name}}",
    },
    { locale: "de", subject: "Willkommen, {{first_name}}", html: "<p>Hallo {{first_name}}</p>" },
  ],
};

async function tenantEnv() {
  const tenant = await createTestTenant();
  const env = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
  return { tenant, env };
}

function create(env: { organizationId: string; environmentId: string }, input = WELCOME) {
  return createEmailTemplate(env, CreateEmailTemplateRequest.parse(input));
}

function draft(input: UpdateEmailTemplateDraftRequestInput) {
  return UpdateEmailTemplateDraftRequest.parse(input);
}

async function expectEmailError(promise: Promise<unknown>, code: EmailError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(EmailError);
  expect((error as EmailError).code).toBe(code);
  return error as EmailError;
}

function services() {
  const liveProvider = new FakeEmailProvider({ log: false });
  const sandboxProvider = new FakeEmailProvider({ log: false });
  const queue = memoryDispatchQueue();
  return {
    sandboxProvider,
    queue,
    service: createEmailService({ liveProvider, sandboxProvider, queue }),
  };
}

describe("email template management", () => {
  test("creates a template with its draft, addressable by id and alias in its environment only", async () => {
    const { tenant, env } = await tenantEnv();
    const alias = `welcome-${uniqueSuffix()}`;
    const template = await create(env, { ...WELCOME, alias });
    expect(template).toMatchObject({
      name: "Welcome",
      alias,
      publishedVersion: null,
      hasUnpublishedChanges: true,
    });
    expect((await getEmailTemplate(env, alias))?.id).toBe(template.id);
    expect((await getEmailTemplate(env, template.id))?.id).toBe(template.id);
    // Other environments and organizations see nothing.
    expect(
      await getEmailTemplate(
        { organizationId: env.organizationId, environmentId: tenant.production.id },
        template.id,
      ),
    ).toBeNull();
    const other = await tenantEnv();
    expect(
      await getEmailTemplate(
        { organizationId: other.env.organizationId, environmentId: env.environmentId },
        template.id,
      ),
    ).toBeNull();

    const { draft } = await getTemplateDraft(env, template.id);
    expect(toEmailTemplateVersionObject(draft)).toMatchObject({
      object: "email_template_version",
      version: null,
      revision: 1,
      default_locale: "en",
      contents: [
        { locale: "de", subject: "Willkommen, {{first_name}}", text: null },
        { locale: "en", subject: "Welcome, {{first_name}}" },
      ],
      problems: [],
    });
  });

  test("refuses a taken alias, on create and update", async () => {
    const { env } = await tenantEnv();
    await create(env, { ...WELCOME, alias: "taken" });
    const second = await create(env, { ...WELCOME, alias: "free" });
    const error = await expectEmailError(
      create(env, { ...WELCOME, alias: "taken" }),
      "template_alias_taken",
    );
    expect(error.param).toBe("alias");
    await expectEmailError(
      updateEmailTemplate(env, second.id, { alias: "taken" }),
      "template_alias_taken",
    );
    const renamed = await updateEmailTemplate(env, "free", { name: "Renamed", alias: null });
    expect(renamed).toMatchObject({ name: "Renamed", alias: null });
  });

  test("pages templates newest first", async () => {
    const { env } = await tenantEnv();
    const created = [];
    for (let i = 0; i < 3; i++) created.push(await create(env, { ...WELCOME, name: `T${i}` }));
    const first = await pageEmailTemplates(env, { limit: 2 });
    expect(first.templates.map((t) => t.name)).toEqual(["T2", "T1"]);
    expect(first.hasMore).toBe(true);
    const second = await pageEmailTemplates(env, { limit: 2, after: first.templates[1]?.id });
    expect(second.templates.map((t) => t.name)).toEqual(["T0"]);
    expect(second.hasMore).toBe(false);
  });

  test("holds the per-environment limit under concurrent creates", async () => {
    const { tenant, env } = await tenantEnv();
    const rows = Array.from({ length: MAX_TEMPLATES_PER_ENVIRONMENT - 1 }, (_, i) => ({
      organizationId: env.organizationId,
      projectId: tenant.project.id,
      environmentId: env.environmentId,
      name: `T${i}`,
    }));
    await db.insert(schema.emailTemplate).values(rows);
    const results = await Promise.allSettled([create(env), create(env), create(env)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    for (const result of results) {
      if (result.status === "rejected") {
        expect((result.reason as EmailError).code).toBe("template_limit_reached");
      }
    }
  });

  test("saves drafts with revisions, reports problems and refuses stale revisions", async () => {
    const { env } = await tenantEnv();
    const template = await create(env);
    const saved = await saveTemplateDraft(
      env,
      template.id,
      draft({
        revision: 1,
        contents: [{ locale: "en", subject: "Hi {{name}}", text: "{{#if x}}" }],
      }),
    );
    expect(saved.draft.revision).toBe(2);
    expect(toEmailTemplateVersionObject(saved.draft).problems).toEqual([
      {
        locale: "en",
        field: "subject",
        message: '"name" is not a declared variable.',
        line: 1,
        column: 4,
      },
      {
        locale: "en",
        field: "text",
        message: "Unclosed {{#if x}}: expected {{/if}}.",
        line: 1,
        column: 1,
      },
    ]);
    const error = await expectEmailError(
      saveTemplateDraft(env, template.id, draft({ revision: 1 })),
      "template_revision_mismatch",
    );
    expect(error.param).toBe("revision");
    // Problems keep it from being published.
    const invalid = await expectEmailError(
      publishTemplateDraft(env, template.id),
      "template_invalid",
    );
    expect(invalid.issues?.map((issue) => issue.path)).toEqual([
      "contents.en.subject",
      "contents.en.text",
    ]);
  });

  test("publishes numbered versions, idempotently, and restores old ones", async () => {
    const { env } = await tenantEnv();
    const template = await create(env);
    const first = await publishTemplateDraft(env, template.id, { revision: 1 });
    expect(first).toMatchObject({ published: true, version: { version: 1, revision: 1 } });
    expect(first.template).toMatchObject({ publishedVersion: 1, hasUnpublishedChanges: false });

    // Nothing changed: the same version comes back.
    const again = await publishTemplateDraft(env, template.id);
    expect(again).toMatchObject({ published: false, version: { version: 1 } });

    const { name: _, ...fields } = WELCOME;
    await saveTemplateDraft(
      env,
      template.id,
      draft({ ...fields, contents: [{ locale: "en", subject: "V2", text: "two" }] }),
    );
    expect((await getEmailTemplate(env, template.id))?.hasUnpublishedChanges).toBe(true);
    const second = await publishTemplateDraft(env, template.id);
    expect(second.version).toMatchObject({ version: 2, defaultLocale: "en" });

    const page = await pageTemplateVersions(env, template.id, { limit: 1 });
    expect(page.versions.map((version) => version.version)).toEqual([2]);
    expect(page.hasMore).toBe(true);
    const rest = await pageTemplateVersions(env, template.id, { limit: 5, after: 2 });
    expect(rest.versions.map((version) => version.version)).toEqual([1]);

    const restored = await restoreTemplateVersion(env, template.id, 1);
    expect(restored.template.hasUnpublishedChanges).toBe(true);
    expect(restored.draft.contents.map((content) => content.locale)).toEqual(["de", "en"]);
    const third = await publishTemplateDraft(env, template.id);
    expect(third.version.version).toBe(3);
    // Restoring what sends already use leaves nothing to publish.
    const current = await restoreTemplateVersion(env, template.id, 3);
    expect(current.template.hasUnpublishedChanges).toBe(false);
    await expectEmailError(
      restoreTemplateVersion(env, template.id, 9),
      "template_version_not_found",
    );
  });

  test("deletes a template with its versions", async () => {
    const { env } = await tenantEnv();
    const template = await create(env);
    await publishTemplateDraft(env, template.id);
    await deleteEmailTemplate(env, template.id);
    expect(await getEmailTemplate(env, template.id)).toBeNull();
    const versions = await db
      .select()
      .from(schema.emailTemplateVersion)
      .where(eq(schema.emailTemplateVersion.templateId, template.id));
    expect(versions).toEqual([]);
    await expectEmailError(deleteEmailTemplate(env, template.id), "not_found");
  });
});

describe("sending with a template", () => {
  const templateParams = (overrides: Record<string, unknown>) =>
    params({ subject: undefined, text: undefined, ...overrides });

  test("renders the published version by alias, picks the locale and records the template", async () => {
    const { tenant, env } = await tenantEnv();
    const { service, queue, sandboxProvider } = services();
    const template = await create(env, { ...WELCOME, alias: "welcome" });
    await publishTemplateDraft(env, template.id);

    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: templateParams({
        template_id: "welcome",
        locale: "de-AT",
        variables: { first_name: "<Ada>" },
      }),
    });
    expect(email).toMatchObject({
      subject: "Willkommen, <Ada>",
      html: "<p>Hallo &lt;Ada&gt;</p>",
      text: null,
      template: { id: template.id, version: 1, locale: "de" },
    });

    const english = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: templateParams({
        template_id: template.id,
        variables: { first_name: "Ada", items: [{ name: "One" }, { name: "Two" }] },
      }),
    });
    expect(english.email).toMatchObject({
      subject: "Welcome, Ada",
      html: "<p>Hi Ada (Free)</p><li>One</li><li>Two</li>",
      text: "Hi Ada",
      template: { id: template.id, version: 1, locale: "en" },
    });

    await queue.drain(service);
    expect(sandboxProvider.sent.map((message) => message.subject)).toEqual([
      "Willkommen, <Ada>",
      "Welcome, Ada",
    ]);
  });

  test("keeps stored emails as rendered, and pins versions", async () => {
    const { tenant, env } = await tenantEnv();
    const { service } = services();
    const template = await create(env);
    await publishTemplateDraft(env, template.id);
    await saveTemplateDraft(
      env,
      template.id,
      draft({
        variables: [{ name: "first_name", type: "string" }],
        contents: [{ locale: "en", subject: "V2 {{first_name}}", text: "two" }],
      }),
    );
    const send = (overrides: Record<string, unknown>) =>
      service.send({
        environment: sendEnvironment(tenant.development),
        apiKeyId: null,
        params: templateParams({
          template_id: template.id,
          variables: { first_name: "Ada" },
          ...overrides,
        }),
      });
    // The draft isn't what sends use until it is published.
    expect((await send({})).email.subject).toBe("Welcome, Ada");
    await publishTemplateDraft(env, template.id);
    expect((await send({})).email).toMatchObject({ subject: "V2 Ada", template: { version: 2 } });
    expect((await send({ template_version: 1 })).email.subject).toBe("Welcome, Ada");
    const missing = await expectEmailError(
      send({ template_version: 7 }),
      "template_version_not_found",
    );
    expect(missing.param).toBe("template_version");
  });

  test("refuses unknown, unpublished templates and invalid variables, naming the fields", async () => {
    const { tenant, env } = await tenantEnv();
    const { service } = services();
    const send = (overrides: Record<string, unknown>) =>
      service.send({
        environment: sendEnvironment(tenant.development),
        apiKeyId: null,
        params: templateParams(overrides),
      });
    const unknown = await expectEmailError(send({ template_id: "nope" }), "template_not_found");
    expect(unknown.param).toBe("template_id");

    const template = await create(env);
    await expectEmailError(send({ template_id: template.id }), "template_not_published");
    await publishTemplateDraft(env, template.id);

    const invalid = await expectEmailError(
      send({ template_id: template.id, variables: { plan: 3, extra: "x", items: [{}] } }),
      "invalid_template_variables",
    );
    expect(invalid.param).toBe("variables.extra");
    expect(invalid.issues).toEqual([
      { path: "variables.extra", message: 'The template declares no variable "extra".' },
      { path: "variables.first_name", message: "Required." },
      { path: "variables.plan", message: "Expected a string." },
      { path: "variables.items.0.name", message: "Required." },
    ]);
    expect(invalid.message).toBe(
      'variables.extra: The template declares no variable "extra". (and 3 more)',
    );

    const badSubject = await expectEmailError(
      send({ template_id: template.id, variables: { first_name: "Ada\r\nBcc: x@example.com" } }),
      "template_render_failed",
    );
    expect(badSubject.message).toStartWith("The rendered subject is invalid:");
  });

  test("names each batch email's fields and caches versions per request", async () => {
    const { tenant, env } = await tenantEnv();
    const { service } = services();
    const template = await create(env);
    await publishTemplateDraft(env, template.id);
    const environment = sendEnvironment(tenant.development);
    const ok = templateParams({ template_id: template.id, variables: { first_name: "Ada" } });
    const error = await expectEmailError(
      service.sendBatch({
        environment,
        apiKeyId: null,
        emails: [ok, params(), templateParams({ template_id: template.id })],
      }),
      "invalid_template_variables",
    );
    expect(error.param).toBe("emails.2.variables.first_name");

    const { batch } = await service.sendBatch({
      environment,
      apiKeyId: null,
      emails: [ok, params({ subject: "Plain" }), ok],
    });
    expect(batch.data.map((email) => email.subject)).toEqual([
      "Welcome, Ada",
      "Plain",
      "Welcome, Ada",
    ]);
    expect(batch.data.map((email) => email.template?.version ?? null)).toEqual([1, null, 1]);
  });

  test("replays an idempotent retry after the template was deleted", async () => {
    const { tenant, env } = await tenantEnv();
    const { service } = services();
    const template = await create(env);
    await publishTemplateDraft(env, template.id);
    const input = {
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: templateParams({ template_id: template.id, variables: { first_name: "Ada" } }),
      idempotencyKey: `key-${uniqueSuffix()}`,
    };
    const first = await service.send(input);
    await deleteEmailTemplate(env, template.id);
    const retry = await service.send(input);
    expect(retry).toMatchObject({ replayed: true, email: { id: first.email.id } });
    // The email keeps its rendered content and template reference.
    const [row] = await db
      .select()
      .from(schema.email)
      .where(and(eq(schema.email.id, first.email.id), eq(schema.email.templateId, template.id)));
    expect(row?.subject).toBe("Welcome, Ada");
  });

  test("renders a draft only for internal test sends, refusing one with problems", async () => {
    const { tenant, env } = await tenantEnv();
    const { service } = services();
    const template = await create(env);
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: templateParams({ template_id: template.id, variables: { first_name: "Ada" } }),
      templateDraft: true,
    });
    expect(email.template).toEqual({ id: template.id, version: null, locale: "en" });

    await saveTemplateDraft(
      env,
      template.id,
      draft({ contents: [{ locale: "en", subject: "{{oops}}", text: "x" }] }),
    );
    await expectEmailError(
      service.send({
        environment: sendEnvironment(tenant.development),
        apiKeyId: null,
        params: templateParams({ template_id: template.id }),
        templateDraft: true,
      }),
      "template_invalid",
    );
  });

  test("hashes the request, not the rendered output, and leaves other hashes alone", () => {
    // Pinned: sends without a template hash exactly as before templates existed.
    expect(hashSendRequest(params())).toBe(
      hashSendRequest({
        from: "Acme <hello@acme.com>",
        to: ["user@example.com"],
        cc: [],
        bcc: [],
        reply_to: [],
        subject: "Welcome",
        html: null,
        text: "Hello!",
        headers: {},
        tags: [],
      }),
    );
    const a = templateParams({ template_id: "welcome", variables: { first_name: "Ada" } });
    const b = templateParams({ template_id: "welcome", variables: { first_name: "Grace" } });
    expect(hashSendRequest(a)).not.toBe(hashSendRequest(b));
  });
});
