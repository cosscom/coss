import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import type { EmailObjectOutput } from "@coss/email/schemas";
import { memoryLogWriter } from "@coss/logs/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  emailBody,
  errorOf,
  getEmailById,
  sendEmail,
  setKeyPermissions,
  waitForLogLines,
} from "./helpers.ts";

async function auditEvents(tenant: TestTenant) {
  const { rows } = await pool.query<{ action: string; metadata: Record<string, unknown> }>(
    "select action, metadata from org_audit_event where organization_id = $1 and actor_type = 'api_key' order by id",
    [tenant.organization.id],
  );
  return rows;
}

describe("/v1/storage_settings", () => {
  test("stores content by default and switches per environment, audited", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;

    const initial = await apiRequest(app, "GET", "/v1/storage_settings", { key });
    expect(initial.status).toBe(200);
    expect(await initial.json()).toEqual({
      object: "storage_settings",
      content_storage: "store",
      updated_at: null,
    });

    const updated = await apiRequest(app, "PATCH", "/v1/storage_settings", {
      key,
      body: { content_storage: "discard" },
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({
      object: "storage_settings",
      content_storage: "discard",
      updated_at: expect.any(String),
    });
    expect(
      await (await apiRequest(app, "GET", "/v1/storage_settings", { key })).json(),
    ).toMatchObject({ content_storage: "discard" });
    // The live environment is untouched.
    expect(
      await (await apiRequest(app, "GET", "/v1/storage_settings", { key: tenant.liveKey })).json(),
    ).toMatchObject({ content_storage: "store" });

    expect(await auditEvents(tenant)).toMatchObject([
      { action: "storage_settings.updated", metadata: { content_storage: "discard" } },
    ]);
  });

  test("validates the body and needs email:send to change", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;

    const invalid = await apiRequest(app, "PATCH", "/v1/storage_settings", {
      key,
      body: { content_storage: "forget" },
    });
    expect(invalid.status).toBe(422);
    expect((await errorOf(invalid)).code).toBe("validation_error");

    const unknown = await apiRequest(app, "PATCH", "/v1/storage_settings", {
      key,
      body: { content_storage: "discard", subject: true },
    });
    expect(unknown.status).toBe(422);

    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["read"],
    });
    expect((await apiRequest(app, "GET", "/v1/storage_settings", { key })).status).toBe(200);
    const refused = await apiRequest(app, "PATCH", "/v1/storage_settings", {
      key,
      body: { content_storage: "discard" },
    });
    expect(refused.status).toBe(403);
  });

  test("sends discard their content once sent, and the request log never keeps it", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const { app, dispatch } = createTestApp({ logWriter: writer });
    const key = tenant.sandboxKey;
    await apiRequest(app, "PATCH", "/v1/storage_settings", {
      key,
      body: { content_storage: "discard" },
    });
    const secret = crypto.randomUUID();
    const res = await sendEmail(
      app,
      key,
      emailBody({
        subject: `Results ${secret}`,
        html: `<p>${secret}</p>`,
        text: secret,
        headers: { "X-Ref": secret },
        attachments: [
          { filename: `${secret}.txt`, content: Buffer.from("hello").toString("base64") },
        ],
      }),
    );
    expect(res.status).toBe(202);
    const sent = (await res.json()) as EmailObjectOutput;
    // The sender's own answer still has the content: it is discarded once the email is sent.
    expect(sent).toMatchObject({
      subject: `Results ${secret}`,
      content_storage: { mode: "discard", discarded_at: null },
    });
    await dispatch();

    const read = await getEmailById(app, key, sent.id);
    const email = (await read.json()) as EmailObjectOutput;
    expect(email).toMatchObject({
      status: "sent",
      subject: "",
      html: null,
      text: null,
      headers: {},
      attachments: [{ filename: "", size: 5 }],
      content_storage: { mode: "discard", discarded_at: expect.any(String) },
    });

    // The settings change, the send and the read.
    const lines = await waitForLogLines(writer, 3);
    const send = lines.find((line) => line.path === "/v1/emails");
    expect(send?.attributes).toMatchObject({
      request: {
        body: {
          subject: `[${`Results ${secret}`.length} characters]`,
          html: `[${`<p>${secret}</p>`.length} characters]`,
          text: `[${secret.length} characters]`,
          headers: { "X-Ref": `[${secret.length} characters]` },
          attachments: [{ filename: `[${secret.length + 4} characters]` }],
        },
      },
      response: { body: { id: sent.id, subject: `[${`Results ${secret}`.length} characters]` } },
    });
    expect(JSON.stringify(lines)).not.toContain(secret);
  });

  test("environments that store content keep logging it as before", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const { app } = createTestApp({ logWriter: writer });
    const res = await sendEmail(app, tenant.sandboxKey, emailBody({ subject: "Kept" }));
    expect(res.status).toBe(202);
    const [line] = await waitForLogLines(writer, 1);
    expect(line?.attributes).toMatchObject({
      request: { body: { subject: "Kept", text: "Hello!" } },
      response: { body: { subject: "Kept", content_storage: { mode: "store" } } },
    });
  });
});
