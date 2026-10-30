import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import { createVerifiedDomain } from "@coss/email/testing";
import { memoryLogWriter } from "@coss/logs/testing";
import { createEnvironmentApiKey } from "@coss/tenancy";
import { createTestTenant } from "@coss/tenancy/testing";
import { apiRequest, createTestApp, errorOf } from "./helpers.ts";

describe("/v1/forms", () => {
  test("create, read, update and delete, audited", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ forms: { url: "https://forms.coss.test" } });
    const created = await apiRequest(app, "POST", "/v1/forms", {
      key: tenant.sandboxKey,
      body: { name: "Contact", allowed_origins: ["http://localhost:5173"] },
    });
    expect(created.status).toBe(201);
    const form = (await created.json()) as { id: string; endpoint: string };
    expect(form.endpoint).toBe(`https://forms.coss.test/f/${form.id}`);

    const patched = await apiRequest(app, "PATCH", `/v1/forms/${form.id}`, {
      key: tenant.sandboxKey,
      body: { enabled: false },
    });
    expect(((await patched.json()) as { enabled: boolean }).enabled).toBe(false);
    expect(
      (await apiRequest(app, "DELETE", `/v1/forms/${form.id}`, { key: tenant.sandboxKey })).status,
    ).toBe(200);
    const { rows } = await pool.query<{ action: string }>(
      "select action from org_audit_event where organization_id = $1 and actor_type = 'api_key' order by id",
      [tenant.organization.id],
    );
    expect(rows.map((row) => row.action)).toEqual(["form.created", "form.updated", "form.deleted"]);
  });

  test("permissions, other environments and validation", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const reader = await createEnvironmentApiKey({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      name: "Forms reader",
      userId: tenant.owner.id,
      permissions: { form: ["read"] },
    });
    const refused = await apiRequest(app, "POST", "/v1/forms", {
      key: reader.key,
      body: { name: "Contact" },
    });
    expect(refused.status).toBe(403);
    expect((await apiRequest(app, "GET", "/v1/forms", { key: reader.key })).status).toBe(200);

    const created = await apiRequest(app, "POST", "/v1/forms", {
      key: tenant.sandboxKey,
      body: { name: "Contact" },
    });
    const { id } = (await created.json()) as { id: string };
    // The live environment's key doesn't see the sandbox's form.
    const elsewhere = await apiRequest(app, "GET", `/v1/forms/${id}`, { key: tenant.liveKey });
    expect(elsewhere.status).toBe(404);

    const invalid = await apiRequest(app, "POST", "/v1/forms", {
      key: tenant.sandboxKey,
      body: { name: "Bad", allowed_origins: ["https://example.com/path"] },
    });
    expect(invalid.status).toBe(422);
    expect(await errorOf(invalid)).toMatchObject({
      code: "invalid_origin",
      param: "allowed_origins",
    });
  });

  test("live senders must be on a verified domain", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const unverified = await apiRequest(app, "POST", "/v1/forms", {
      key: tenant.liveKey,
      body: { name: "Contact", notifications: { from: "forms@unverified.test" } },
    });
    expect(await errorOf(unverified)).toMatchObject({ code: "invalid_sender" });
    const domain = await createVerifiedDomain(tenant.organization.id);
    const verified = await apiRequest(app, "POST", "/v1/forms", {
      key: tenant.liveKey,
      body: {
        name: "Contact",
        notifications: { from: `forms@${domain.name}`, recipients: [`support@${domain.name}`] },
      },
    });
    expect(verified.status).toBe(201);
  });

  test("a live hosted page whose text screens as phishing isn't published", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const refused = await apiRequest(app, "POST", "/v1/forms", {
      key: tenant.liveKey,
      body: {
        name: "Account check",
        fields: [{ name: "email", type: "email" }],
        hosted: { enabled: true, title: "Verify your bank account [coss-test:phishing]" },
      },
    });
    expect(await errorOf(refused)).toMatchObject({ code: "hosted_content_refused" });
    const published = await apiRequest(app, "POST", "/v1/forms", {
      key: tenant.liveKey,
      body: {
        name: "Waitlist",
        fields: [{ name: "email", type: "email" }],
        hosted: { enabled: true, title: "Join the waitlist" },
      },
    });
    expect(published.status).toBe(201);
  });

  test("without a forms host, Forms is unavailable", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ forms: { url: null } });
    const res = await apiRequest(app, "POST", "/v1/forms", {
      key: tenant.sandboxKey,
      body: { name: "Contact" },
    });
    expect(res.status).toBe(503);
    expect(await errorOf(res)).toMatchObject({ code: "forms_unavailable" });
  });

  test("submissions' answers never reach the request log", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const { app } = createTestApp({ forms: { url: "http://forms.test" }, logWriter: writer });
    const created = await apiRequest(app, "POST", "/v1/forms", {
      key: tenant.sandboxKey,
      body: { name: "Contact" },
    });
    const { id } = (await created.json()) as { id: string };
    const posted = await app.fetch(
      new Request(`http://forms.test/f/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: "email=ada%40example.com&message=secret-sentence",
      }),
    );
    expect(posted.status).toBe(200);
    const list = await apiRequest(app, "GET", `/v1/forms/${id}/submissions`, {
      key: tenant.sandboxKey,
    });
    const [submission] = ((await list.json()) as { data: { id: string }[] }).data;
    const one = await apiRequest(app, "GET", `/v1/forms/${id}/submissions/${submission?.id}`, {
      key: tenant.sandboxKey,
    });
    expect(one.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(writer.entries.length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(writer.entries)).not.toContain("secret-sentence");
  });
});
