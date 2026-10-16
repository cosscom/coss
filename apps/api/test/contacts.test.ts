import { describe, expect, test } from "bun:test";
import { createPlanGate } from "@coss/billing";
import { db, pool, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  createTestApp,
  errorOf,
  setKeyPermissions,
  type TestApp,
} from "./helpers.ts";

function call(app: TestApp, key: string, method: string, path: string, body?: unknown) {
  return Promise.resolve(
    app.request(path, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

describe("/v1/contacts", () => {
  test("upsert creates (201), then updates the same address (200)", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    expect(
      (await call(app, key, "POST", "/v1/contact_properties", { key: "plan", type: "string" }))
        .status,
    ).toBe(201);
    const created = await call(app, key, "POST", "/v1/contacts", {
      email: "Ada@Example.com",
      properties: { plan: "pro" },
    });
    expect(created.status).toBe(201);
    const contact = (await created.json()) as { id: string };
    expect(contact).toMatchObject({ object: "contact", email: "ada@example.com" });

    const updated = await call(app, key, "POST", "/v1/contacts", {
      email: "ada@example.com",
      first_name: "Ada",
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      id: contact.id,
      first_name: "Ada",
      properties: { plan: "pro" },
    });
    // By address, URL-encoded, too.
    const byEmail = await call(
      app,
      key,
      "GET",
      `/v1/contacts/${encodeURIComponent("ada@example.com")}`,
    );
    expect(await byEmail.json()).toMatchObject({ id: contact.id });
    // Another environment's key doesn't see it.
    expect((await call(app, tenant.liveKey, "GET", `/v1/contacts/${contact.id}`)).status).toBe(404);
  });

  test("product errors are 422 naming the field; unknown contacts are 404", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    const unknown = await call(app, key, "POST", "/v1/contacts", {
      email: "a@example.com",
      properties: { plan: "pro" },
    });
    expect(unknown.status).toBe(422);
    expect(await errorOf(unknown)).toMatchObject({
      type: "invalid_request_error",
      code: "unknown_property",
      param: "properties.plan",
    });
    const missing = await call(
      app,
      key,
      "PATCH",
      "/v1/contacts/contact_01k7c8m4q2f3e9v6t5r1n0p8yz",
      {
        first_name: "x",
      },
    );
    expect(missing.status).toBe(404);
    const segment = await call(app, key, "POST", "/v1/segments", {
      name: "Bad",
      filter: {
        version: 1,
        match: "all",
        conditions: [{ field: "property", key: "nope", op: "exists" }],
      },
    });
    expect(segment.status).toBe(422);
    expect(await errorOf(segment)).toMatchObject({
      code: "invalid_filter",
      param: "filter.conditions.0.key",
    });
  });

  test("the plan's contact limit is a 402 billing_error", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ plans: createPlanGate() });
    await db.insert(schema.contactCounter).values({
      environmentId: tenant.development.id,
      organizationId: tenant.organization.id,
      count: 1_000,
    });
    const res = await call(app, tenant.sandboxKey, "POST", "/v1/contacts", {
      email: "one-too-many@example.com",
    });
    expect(res.status).toBe(402);
    expect(await errorOf(res)).toMatchObject({ type: "billing_error", code: "plan_limit_reached" });
  });

  test("import, list and export", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    const imported = await call(app, key, "POST", "/v1/contacts/import", {
      contacts: [{ email: "a@example.com" }, { email: "b@example.com" }, { email: "nope" }],
    });
    expect(imported.status).toBe(200);
    expect(await imported.json()).toMatchObject({ created: 2, updated: 0 });
    const page = (await (await call(app, key, "GET", "/v1/contacts?limit=1")).json()) as {
      data: { email: string }[];
      has_more: boolean;
    };
    expect(page).toMatchObject({ has_more: true });
    const csv = await call(app, key, "GET", "/v1/contacts/export");
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect((await csv.text()).split("\r\n")[0]).toBe(
      "email,first_name,last_name,status,created_at,id",
    );
  });

  test("topics, audiences and marketing settings", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    expect(
      (
        await call(app, key, "POST", "/v1/topics", {
          key: "news",
          name: "News",
          default_subscription: "opt_in",
        })
      ).status,
    ).toBe(201);
    const audience = (await (
      await call(app, key, "POST", "/v1/audiences", { name: "Beta" })
    ).json()) as {
      id: string;
    };
    await call(app, key, "POST", "/v1/contacts", { email: "a@example.com" });
    const added = await call(app, key, "POST", `/v1/audiences/${audience.id}/contacts`, {
      contacts: ["a@example.com", "ghost@example.com"],
    });
    expect(await added.json()).toEqual({
      object: "audience_contacts",
      added: 1,
      existing: 0,
      missing: ["ghost@example.com"],
    });
    const topics = await call(app, key, "PATCH", "/v1/contacts/a%40example.com/topics", {
      topics: [{ topic: "news", status: "opted_out" }],
    });
    expect(await topics.json()).toMatchObject({
      topics: [{ topic: "news", subscribed: false, choice: "opted_out" }],
    });
    const settings = await call(app, key, "PATCH", "/v1/marketing_settings", {
      mailing_address: "1 Main St, Springfield",
    });
    expect(await settings.json()).toMatchObject({
      object: "marketing_settings",
      display_name: null,
      mailing_address: "1 Main St, Springfield",
    });
    const removed = await call(
      app,
      key,
      "DELETE",
      `/v1/audiences/${audience.id}/contacts/a%40example.com`,
    );
    expect(removed.status).toBe(200);
  });

  test("keys need the contact permission", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["send", "read"],
    });
    const res = await call(app, tenant.sandboxKey, "GET", "/v1/contacts");
    expect(res.status).toBe(403);
    expect((await errorOf(res)).type).toBe("permission_error");

    // Preference links change consent: reading contacts isn't enough to make them.
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      contact: ["read"],
    });
    const links = await call(
      app,
      tenant.sandboxKey,
      "POST",
      "/v1/contacts/a%40example.com/preference_links",
    );
    expect(links.status).toBe(403);
  });

  test("a contact change is a webhook", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await pool.query(
      `insert into webhook_endpoint
         (id, organization_id, project_id, environment_id, url, api_version, event_types, secret_ciphertext)
       values ($1, $2, $3, $4, 'https://example.com/hook', '2026-01-01', '{contact.created}', 'v1:unused')`,
      [newId("whep"), tenant.organization.id, tenant.project.id, tenant.development.id],
    );
    await call(app, tenant.sandboxKey, "POST", "/v1/contacts", { email: "a@example.com" });
    const { rows } = await pool.query(
      "select type from webhook_message where environment_id = $1",
      [tenant.development.id],
    );
    expect(rows).toEqual([{ type: "contact.created" }]);
  });
});
