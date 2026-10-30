import { beforeAll, describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import { createForm, type FormEnvironment } from "@coss/forms";
import { CreateFormRequest } from "@coss/forms/schemas";
import { testFormChecks } from "@coss/forms/testing";
import { cachedOverrides, clientIpResolver, setRateLimitOverride } from "@coss/ratelimit";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { createTestApp } from "./helpers.ts";

const FORMS_URL = "http://forms.coss.test";

let tenant: TestTenant;
let env: FormEnvironment;

beforeAll(async () => {
  tenant = await createTestTenant();
  env = {
    organizationId: tenant.organization.id,
    projectId: tenant.project.id,
    environmentId: tenant.development.id,
    mode: "sandbox",
  };
});

async function newForm(params: Record<string, unknown> = {}, environment = env) {
  return createForm(environment, CreateFormRequest.parse({ name: "Contact", ...params }), {
    links: { publicUrl: FORMS_URL },
    checks: testFormChecks(),
  });
}

function htmlPost(
  formId: string,
  body: Record<string, string>,
  headers: Record<string, string> = {},
) {
  return new Request(`${FORMS_URL}/f/${formId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      Origin: "https://www.example.com",
      Referer: "https://www.example.com/contact",
      ...headers,
    },
    body: new URLSearchParams(body).toString(),
  });
}

async function latest(formId: string) {
  const { rows } = await pool.query<{ id: string; status: string; data: unknown }>(
    "select id, status, data from form_submission where form_id = $1 order by created_at desc limit 1",
    [formId],
  );
  return rows[0];
}

describe("POST /f/:id", () => {
  test("an HTML post: stored, then the thank-you page", async () => {
    const { app } = createTestApp();
    const form = await newForm();
    const res = await app.fetch(htmlPost(form.id, { email: "ada@example.com", message: "Hi" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(await res.text()).toContain("Thank you");
    expect(await latest(form.id)).toMatchObject({
      status: "accepted",
      data: { email: "ada@example.com", message: "Hi" },
    });
  });

  test("the form's redirect (303) and an allowed _next", async () => {
    const { app } = createTestApp();
    const form = await newForm({
      allowed_origins: ["https://www.example.com"],
      redirect_url: "https://www.example.com/thanks",
    });
    const res = await app.fetch(htmlPost(form.id, { email: "ada@example.com" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://www.example.com/thanks");
    const next = await app.fetch(
      htmlPost(form.id, { email: "ada@example.com", _next: "https://www.example.com/next" }),
    );
    expect(next.headers.get("location")).toBe("https://www.example.com/next");
  });

  test("scripts: JSON in and out, CORS for any origin", async () => {
    const { app } = createTestApp();
    const form = await newForm();
    const res = await app.fetch(
      new Request(`${FORMS_URL}/f/${form.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://app.example.com",
        },
        body: JSON.stringify({ email: "ada@example.com", topics: ["a", "b"], count: 3 }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "received" });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-credentials")).toBeNull();
    expect((await latest(form.id))?.data).toEqual({
      email: "ada@example.com",
      topics: ["a", "b"],
      count: "3",
    });

    const preflight = await app.fetch(
      new Request(`${FORMS_URL}/f/${form.id}`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://app.example.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      }),
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-methods")).toBe("POST");
  });

  test("validation errors: 422 JSON with fields, or a page listing them", async () => {
    const { app } = createTestApp();
    const form = await newForm({ fields: [{ name: "email", type: "email", required: true }] });
    const json = await app.fetch(
      new Request(`${FORMS_URL}/f/${form.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: "" }),
      }),
    );
    expect(json.status).toBe(422);
    expect(await json.json()).toMatchObject({
      ok: false,
      errors: [{ field: "email", code: "required" }],
    });
    const html = await app.fetch(htmlPost(form.id, { email: "nope" }));
    expect(html.status).toBe(422);
    const page = await html.text();
    expect(page).toContain("must be an email address");
    expect(page).toContain('href="https://www.example.com/contact"');
  });

  test("spam is answered like a success", async () => {
    const { app } = createTestApp();
    const form = await newForm();
    const res = await app.fetch(
      new Request(`${FORMS_URL}/f/${form.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bot@example.com", _gotcha: "filled" }),
      }),
    );
    expect(await res.json()).toEqual({ ok: true, status: "received" });
    expect((await latest(form.id))?.status).toBe("spam");
  });

  test("uploads: multipart parts become files", async () => {
    const { app } = createTestApp();
    const form = await newForm({ files: { enabled: true } });
    const body = new FormData();
    body.append("email", "ada@example.com");
    body.append("cv", new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" }));
    const res = await app.fetch(
      new Request(`${FORMS_URL}/f/${form.id}`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body,
      }),
    );
    expect(res.status).toBe(200);
    const submission = await latest(form.id);
    const { rows } = await pool.query(
      "select filename from form_submission_file where submission_id = $1",
      [submission?.id],
    );
    expect(rows).toEqual([{ filename: "cv.pdf" }]);
  });

  test("a refused origin, an unknown form and the forms host", async () => {
    const { app } = createTestApp({ forms: { url: FORMS_URL, hostOnly: true } });
    const form = await newForm({ allowed_origins: ["https://www.example.com"] });
    const refused = await app.fetch(
      htmlPost(form.id, { email: "ada@example.com" }, { Origin: "https://evil.test" }),
    );
    expect(refused.status).toBe(403);
    expect((await app.fetch(htmlPost("form_nope", { a: "b" }))).status).toBe(404);
    // Another host (the API's own) never serves forms when they have their own.
    const elsewhere = await app.fetch(
      new Request(`https://api.coss.test/f/${form.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "email=ada%40example.com",
      }),
    );
    expect(elsewhere.status).toBe(404);
    expect(await elsewhere.text()).toBe("Not found.");
  });

  test("rate limited per client IP", async () => {
    const { app } = createTestApp({
      rateLimiter: memoryLimiter(),
      clientIp: clientIpResolver({ header: "x-forwarded-for" }),
    });
    const form = await newForm();
    let last = 200;
    for (let index = 0; index < 25; index += 1) {
      last = (
        await app.fetch(
          htmlPost(form.id, { message: `hi ${index}` }, { "X-Forwarded-For": "203.0.113.9" }),
        )
      ).status;
    }
    expect(last).toBe(429);
  });

  test("the organization's override of the daily limit applies", async () => {
    const other = await createTestTenant();
    await setRateLimitOverride({
      organizationId: other.organization.id,
      bucket: "forms.submissions.day",
      rule: { limit: 1, periodMs: 86_400_000, burst: 1 },
    });
    const { app } = createTestApp({ rateLimiter: memoryLimiter({ overrides: cachedOverrides() }) });
    const form = await newForm(
      {},
      {
        organizationId: other.organization.id,
        projectId: other.project.id,
        environmentId: other.development.id,
        mode: "sandbox",
      },
    );
    expect((await app.fetch(htmlPost(form.id, { message: "one" }))).status).toBe(200);
    expect((await app.fetch(htmlPost(form.id, { message: "two" }))).status).toBe(429);
  });
});
