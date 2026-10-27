import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import { memoryLogWriter } from "@coss/logs/testing";
import { buildTestPdfBase64 } from "@coss/sign/testing";
import { createEnvironmentApiKey } from "@coss/tenancy";
import { createTestTenant } from "@coss/tenancy/testing";
import { apiRequest, createTestApp, errorOf } from "./helpers.ts";

describe("Sign templates", () => {
  test("create, read, make requests from, edit with the builder, delete", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ signUrl: "https://sign.test" });
    const key = tenant.sandboxKey;
    const created = await apiRequest(app, "POST", "/v1/sign/templates", {
      key,
      body: {
        name: "Mutual NDA",
        documents: [
          {
            filename: "nda.pdf",
            content: await buildTestPdfBase64([{ lines: ["Client: {{signature:client}}"] }]),
          },
        ],
        roles: [{ key: "client", name: "Client" }],
        fields: [
          { role: "client", type: "signature", anchor: "{{signature:client}}" },
          {
            role: "client",
            type: "text",
            page: 1,
            x: 72,
            y: 200,
            width: 200,
            height: 18,
            merge_key: "company",
          },
        ],
      },
    });
    expect(created.status).toBe(201);
    const template = await created.json();
    expect(template).toMatchObject({ object: "sign_template", ready: true, sandbox: true });

    const list = await apiRequest(app, "GET", "/v1/sign/templates", { key });
    expect((await list.json()).data.map((item: { id: string }) => item.id)).toEqual([template.id]);

    const missingRole = await apiRequest(
      app,
      "POST",
      `/v1/sign/templates/${template.id}/requests`,
      {
        key,
        body: { signers: [{ role: "other", name: "Ada", email: "ada@example.com" }] },
      },
    );
    expect((await errorOf(missingRole)).code).toBe("invalid_signers");
    const fromTemplate = await apiRequest(
      app,
      "POST",
      `/v1/sign/templates/${template.id}/requests`,
      {
        key,
        headers: { "Idempotency-Key": "nda-ada" },
        body: {
          signers: [{ role: "client", name: "Ada", email: "ada@example.com" }],
          merge_fields: { company: "Engines Ltd" },
        },
      },
    );
    expect(fromTemplate.status).toBe(201);
    const request = await fromTemplate.json();
    expect(request).toMatchObject({ title: "Mutual NDA", status: "sent" });
    const replay = await apiRequest(app, "POST", `/v1/sign/templates/${template.id}/requests`, {
      key,
      headers: { "Idempotency-Key": "nda-ada" },
      body: {
        signers: [{ role: "client", name: "Ada", email: "ada@example.com" }],
        merge_fields: { company: "Engines Ltd" },
      },
    });
    expect(replay.headers.get("Idempotent-Replayed")).toBe("true");
    expect((await replay.json()).id).toBe(request.id);

    const session = await apiRequest(
      app,
      "POST",
      `/v1/sign/templates/${template.id}/builder_sessions`,
      { key },
    );
    expect(session.status).toBe(201);
    expect((await session.json()).url).toStartWith("https://sign.test/b/sbs_");

    const updated = await apiRequest(app, "PATCH", `/v1/sign/templates/${template.id}`, {
      key,
      body: { name: "Mutual NDA v2" },
    });
    expect((await updated.json()).name).toBe("Mutual NDA v2");
    const removed = await apiRequest(app, "DELETE", `/v1/sign/templates/${template.id}`, { key });
    expect(await removed.json()).toEqual({
      object: "sign_template",
      id: template.id,
      deleted: true,
    });
    // The request made from it stays.
    const read = await apiRequest(app, "GET", `/v1/sign/requests/${request.id}`, { key });
    expect(read.status).toBe(200);
  });

  test("a merge key named like an Object property isn't filled unless given; logs keep no builder links", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const { app } = createTestApp({ signUrl: "https://sign.test", logWriter: writer });
    const key = tenant.sandboxKey;
    const created = await apiRequest(app, "POST", "/v1/sign/templates", {
      key,
      body: {
        name: "Prototype",
        documents: [{ filename: "nda.pdf", content: await buildTestPdfBase64() }],
        roles: [{ key: "client", name: "Client" }],
        fields: [
          { role: "client", type: "signature", page: 1, x: 72, y: 600, width: 160, height: 30 },
          {
            role: "client",
            type: "text",
            page: 1,
            x: 72,
            y: 200,
            width: 200,
            height: 18,
            merge_key: "constructor",
          },
        ],
      },
    });
    const template = await created.json();
    const made = await apiRequest(app, "POST", `/v1/sign/templates/${template.id}/requests`, {
      key,
      body: {
        signers: [{ role: "client", name: "Ada", email: "ada@example.com" }],
        merge_fields: {},
      },
    });
    expect(made.status).toBe(201);
    const request = await made.json();
    const text = request.fields.find((field: { type: string }) => field.type === "text");
    const { rows } = await pool.query("select value, prefilled from sign_field where id = $1", [
      text.id,
    ]);
    expect(rows).toEqual([{ value: null, prefilled: false }]);

    const session = await (
      await apiRequest(app, "POST", `/v1/sign/templates/${template.id}/builder_sessions`, { key })
    ).json();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(JSON.stringify(writer.entries)).not.toContain(session.token);
  });

  test("a request from a template that is sent at once needs sign:send", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await apiRequest(app, "POST", "/v1/sign/templates", {
      key: tenant.sandboxKey,
      body: {
        name: "NDA",
        documents: [{ filename: "nda.pdf", content: await buildTestPdfBase64() }],
        roles: [{ key: "client", name: "Client" }],
        fields: [
          { role: "client", type: "signature", page: 1, x: 72, y: 600, width: 160, height: 30 },
        ],
      },
    });
    const template = await created.json();
    const creator = await createEnvironmentApiKey({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      name: "Sign creator",
      userId: tenant.owner.id,
      permissions: { sign: ["create", "read"] },
    });
    const signers = [{ role: "client", name: "Ada", email: "ada@example.com" }];
    const path = `/v1/sign/templates/${template.id}/requests`;
    const sent = await apiRequest(app, "POST", path, { key: creator.key, body: { signers } });
    expect(sent.status).toBe(403);
    expect((await errorOf(sent)).code).toBe("insufficient_permissions");
    const draft = await apiRequest(app, "POST", path, {
      key: creator.key,
      body: { signers, send: false },
    });
    expect(draft.status).toBe(201);
    expect((await draft.json()).status).toBe("draft");
  });
});
