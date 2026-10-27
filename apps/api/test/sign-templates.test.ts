import { describe, expect, test } from "bun:test";
import { buildTestPdfBase64 } from "@coss/sign/testing";
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
});
