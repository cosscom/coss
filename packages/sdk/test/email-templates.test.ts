import { describe, expect, test } from "bun:test";
import {
  Coss,
  type EmailTemplate,
  type EmailTemplateVersion,
  type SendEmailParams,
} from "../src/index.ts";
import { json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
const BASE = "https://api.coss.com/v1/email_templates";

const template: EmailTemplate = {
  object: "email_template",
  id: "etpl_01k5f9yq8re8vb6q2wmz0tb2xd",
  alias: "welcome",
  name: "Welcome",
  description: null,
  published_version: 1,
  published_at: "2026-10-09T12:00:00.000Z",
  has_unpublished_changes: false,
  created_at: "2026-10-09T12:00:00.000Z",
  updated_at: "2026-10-09T12:00:00.000Z",
};

const version: EmailTemplateVersion = {
  object: "email_template_version",
  template_id: template.id,
  version: 1,
  revision: 2,
  default_locale: "en",
  variables: [{ name: "first_name", type: "string", required: true }],
  sample_variables: {},
  contents: [{ locale: "en", subject: "Hi {{first_name}}", html: null, text: "Hello" }],
  problems: [],
  published_at: "2026-10-09T12:00:00.000Z",
  created_at: "2026-10-09T12:00:00.000Z",
  updated_at: "2026-10-09T12:00:00.000Z",
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, fetch }), calls };
}

describe("coss.email.templates", () => {
  test("create POSTs once (never retried) and list/get/update/delete address id or alias", async () => {
    const { coss, calls } = client(
      json(200, template),
      json(200, { object: "list", data: [template], has_more: false }),
      json(200, template),
      json(200, template),
      json(200, { object: "email_template", id: template.id, deleted: true }),
    );
    const templates = coss.email.templates;

    expect(await templates.create({ name: "Welcome", alias: "welcome" })).toEqual({
      data: template,
      error: null,
    });
    expect(calls[0]).toMatchObject({ method: "POST", url: BASE });
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual({ name: "Welcome", alias: "welcome" });

    await templates.list({ limit: 5, after: template.id });
    expect(calls[1]?.url).toBe(`${BASE}?limit=5&after=${template.id}`);
    await templates.get("a/b");
    expect(calls[2]).toMatchObject({ method: "GET", url: `${BASE}/a%2Fb` });
    await templates.update("welcome", { alias: null });
    expect(calls[3]).toMatchObject({ method: "PATCH", url: `${BASE}/welcome` });
    expect(JSON.parse(calls[3]?.body ?? "")).toEqual({ alias: null });
    expect((await templates.delete("welcome")).data?.deleted).toBe(true);
    expect(calls[4]).toMatchObject({ method: "DELETE", url: `${BASE}/welcome` });
  });

  test("drafts are PUT whole, published with a revision, and versions listed and restored", async () => {
    const { coss, calls } = client(json(200, { ...version, version: null }));
    const templates = coss.email.templates;

    await templates.getDraft("welcome");
    expect(calls[0]).toMatchObject({ method: "GET", url: `${BASE}/welcome/draft` });
    await templates.updateDraft("welcome", { revision: 2, contents: [] });
    expect(calls[1]).toMatchObject({ method: "PUT", url: `${BASE}/welcome/draft` });
    expect(JSON.parse(calls[1]?.body ?? "")).toEqual({ revision: 2, contents: [] });
    await templates.publish("welcome");
    expect(calls[2]).toMatchObject({ method: "POST", url: `${BASE}/welcome/publish` });
    expect(JSON.parse(calls[2]?.body ?? "")).toEqual({});
    await templates.versions.list("welcome", { after: 3 });
    expect(calls[3]?.url).toBe(`${BASE}/welcome/versions?after=3`);
    await templates.versions.get("welcome", 2);
    expect(calls[4]?.url).toBe(`${BASE}/welcome/versions/2`);
    await templates.versions.restore("welcome", 1);
    expect(calls[5]).toMatchObject({ method: "POST", url: `${BASE}/welcome/versions/1/restore` });
  });

  test("send takes a template instead of a subject and body", async () => {
    const params: SendEmailParams = {
      from: "Acme <hello@acme.com>",
      to: "user@example.com",
      template_id: "welcome",
      variables: { first_name: "Ada" },
    };
    // @ts-expect-error: a template send has no subject of its own.
    const mixed: SendEmailParams = { ...params, subject: "Hi" };
    expect(mixed.subject).toBe("Hi");
    const { coss, calls } = client(json(202, {}));
    await coss.email.send(params);
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual(params);
  });
});
