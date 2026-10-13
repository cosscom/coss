import { describe, expect, test } from "bun:test";
import { createLogWriter, listOrgAuditEvents, queryLogs } from "@coss/logs";
import { memoryLogWriter } from "@coss/logs/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  emailBody,
  errorOf,
  sendEmail,
  setKeyPermissions,
  waitForLogLines,
} from "./helpers.ts";

describe("request log", () => {
  test("logs a send with its redacted body, never the key", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const { app } = createTestApp({ logWriter: writer });
    const res = await sendEmail(
      app,
      tenant.sandboxKey,
      emailBody({
        attachments: [{ filename: "a.txt", content: Buffer.from("hello").toString("base64") }],
      }),
      { "Idempotency-Key": "k-1", "User-Agent": "test-agent" },
    );
    expect(res.status).toBe(202);
    const sent = (await res.json()) as { id: string };
    const [line] = await waitForLogLines(writer, 1);
    expect(line).toMatchObject({
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      environmentId: tenant.development.id,
      source: "api",
      level: "info",
      type: "api.request",
      message: "POST /v1/emails 202",
      method: "POST",
      path: "/v1/emails",
      route: "/v1/emails",
      statusCode: 202,
      requestId: res.headers.get("x-request-id"),
      userAgent: "test-agent",
      resourceType: "email",
      resourceId: sent.id,
      errorCode: null,
    });
    const attributes = line?.attributes as {
      request: { headers: Record<string, string>; body: { attachments: { content: string }[] } };
      response: { body: { id: string } };
    };
    expect(attributes.request.headers).toEqual({
      "content-type": "application/json",
      "idempotency-key": "k-1",
      "user-agent": "test-agent",
    });
    expect(attributes.request.body.attachments[0]?.content).toBe("[8 characters]");
    expect(attributes.response.body.id).toBe(sent.id);
    expect(JSON.stringify(line)).not.toContain(tenant.sandboxKey);
  });

  test("errors are warnings with their code; refused valid keys are logged", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const { app } = createTestApp({ logWriter: writer });
    const invalid = await sendEmail(app, tenant.sandboxKey, { to: "nobody" });
    expect(invalid.status).toBe(422);
    await waitForLogLines(writer, 1);
    expect(writer.entries[0]).toMatchObject({
      level: "warning",
      statusCode: 422,
      errorCode: "validation_error",
      attributes: expect.objectContaining({ error_type: "invalid_request_error" }),
    });

    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["read"],
    });
    const refused = await sendEmail(app, tenant.sandboxKey, emailBody());
    expect((await errorOf(refused)).code).toBe("insufficient_permissions");
    await waitForLogLines(writer, 2);
    expect(writer.entries[1]).toMatchObject({
      environmentId: tenant.development.id,
      statusCode: 403,
      errorCode: "insufficient_permissions",
    });
  });

  test("unattributable requests, other paths and reading logs are not logged", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const { app } = createTestApp({ logWriter: writer });
    expect((await sendEmail(app, null, emailBody())).status).toBe(401);
    expect((await sendEmail(app, "coss_test_nope", emailBody())).status).toBe(401);
    expect((await app.request("/health")).status).toBe(200);
    expect((await apiRequest(app, "GET", "/v1/logs", { key: tenant.sandboxKey })).status).toBe(200);
    expect((await apiRequest(app, "GET", "/v1/nothing", { key: tenant.sandboxKey })).status).toBe(
      404,
    );
    // Keys are checked per route, so an unknown path can't be attributed either.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(writer.entries).toEqual([]);
  });
});

describe("GET /v1/logs", () => {
  test("lists the environment's lines with filters, cursors and lookups", async () => {
    const tenant = await createTestTenant();
    const writer = createLogWriter({ flushMs: 60_000 });
    const { app } = createTestApp({ logWriter: writer });
    const memory = memoryLogWriter();
    const { app: other } = createTestApp({ logWriter: memory });
    // Lines are ordered by their millisecond (ids are UUIDv7 of `occurred_at`); requests within
    // one millisecond have no defined order, so keep them apart.
    const apart = () => new Promise((resolve) => setTimeout(resolve, 3));
    await sendEmail(app, tenant.sandboxKey, emailBody());
    await apart();
    await sendEmail(app, tenant.sandboxKey, { to: "nobody" });
    await apart();
    await apiRequest(app, "GET", "/v1/suppressions", { key: tenant.sandboxKey });
    await apart();
    // Another environment's key.
    await sendEmail(app, tenant.liveKey, emailBody());
    await new Promise((resolve) => setTimeout(resolve, 30));
    await writer.flush();

    const list = async (query: string) => {
      const res = await apiRequest(app, "GET", `/v1/logs${query}`, { key: tenant.sandboxKey });
      expect(res.status).toBe(200);
      return (await res.json()) as {
        data: { id: string; message: string; status_code: number }[];
        has_more: boolean;
      };
    };
    const all = await list("");
    expect(all.data.map((line) => line.message)).toEqual([
      "GET /v1/suppressions 200",
      "POST /v1/emails 422",
      "POST /v1/emails 202",
    ]);
    expect((await list("?status=4xx")).data.map((line) => line.status_code)).toEqual([422]);
    expect((await list("?method=get")).data).toHaveLength(1);
    expect((await list("?level=warning,error")).data).toHaveLength(1);
    expect((await list("?q=suppressions")).data).toHaveLength(1);
    const first = await list("?limit=2");
    expect(first.has_more).toBe(true);
    const second = await list(`?limit=2&after=${first.data[1]?.id}`);
    expect(second.data.map((line) => line.message)).toEqual(["POST /v1/emails 202"]);

    const id = all.data[0]?.id ?? "";
    const one = await apiRequest(app, "GET", `/v1/logs/${id}`, { key: tenant.sandboxKey });
    expect(one.status).toBe(200);
    expect(await one.json()).toMatchObject({ object: "log", id, route: "/v1/suppressions" });
    const foreign = await apiRequest(other, "GET", `/v1/logs/${id}`, { key: tenant.liveKey });
    expect((await errorOf(foreign)).code).toBe("not_found");

    const stored = await queryLogs({
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 1000),
    });
    expect(stored.data).toHaveLength(1);
  });

  test("validates the range and needs log:read", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const backwards = await apiRequest(
      app,
      "GET",
      "/v1/logs?from=2026-02-02T00:00:00Z&to=2026-02-01T00:00:00Z",
      { key: tenant.sandboxKey },
    );
    expect(await errorOf(backwards)).toMatchObject({ code: "invalid_range", param: "from" });
    const tooLong = await apiRequest(
      app,
      "GET",
      "/v1/logs?from=2026-01-01T00:00:00Z&to=2026-03-01T00:00:00Z",
      {
        key: tenant.sandboxKey,
      },
    );
    expect(tooLong.status).toBe(422);
    const badLevel = await apiRequest(app, "GET", "/v1/logs?level=loud", {
      key: tenant.sandboxKey,
    });
    expect((await errorOf(badLevel)).code).toBe("validation_error");

    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["send", "read"],
    });
    const refused = await apiRequest(app, "GET", "/v1/logs", { key: tenant.sandboxKey });
    expect(refused.status).toBe(403);
  });
});

describe("org audit log", () => {
  test("changes made with an API key are recorded with the key as the actor", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await apiRequest(app, "POST", "/v1/suppressions", {
      key: tenant.sandboxKey,
      body: { address: "gone@example.com" },
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    // Adding it again changes nothing, so nothing more is recorded.
    await apiRequest(app, "POST", "/v1/suppressions", {
      key: tenant.sandboxKey,
      body: { address: "gone@example.com" },
    });
    await apiRequest(app, "DELETE", `/v1/suppressions/${id}`, { key: tenant.sandboxKey });

    const { events } = await listOrgAuditEvents({ organizationId: tenant.organization.id });
    expect(events.map((event) => event.action)).toEqual([
      "suppression.deleted",
      "suppression.created",
    ]);
    expect(events[1]).toMatchObject({
      actor_type: "api_key",
      actor_id: await apiKeyIdForEnvironment(tenant.development.id),
      target_type: "suppression",
      target_id: id,
      target_label: "gone@example.com",
      environment_id: tenant.development.id,
      metadata: expect.objectContaining({ scope: "*", request_id: expect.stringMatching(/^req_/) }),
    });
  });
});
