import { describe, expect, test } from "bun:test";
import { db, pool } from "@coss/db";
import { appendLogEntries } from "@coss/logs";
import { memoryLogWriter } from "@coss/logs/testing";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import {
  getLogDrain,
  MAX_LOG_DRAINS_PER_ENVIRONMENT,
  revealLogDrainSecret,
  runDueLogDrainDeliveries,
} from "@coss/webhooks";
import type {
  LogDrainBatchListOutput,
  LogDrainBatchObjectOutput,
  LogDrainListOutput,
  LogDrainObjectOutput,
  LogDrainWithSecretOutput,
} from "@coss/webhooks/schemas";
import { TEST_SECRETS_KEYS, testSender, webhookReceiver } from "@coss/webhooks/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  REQUEST_ID,
  setKeyPermissions,
  type TestApp,
  waitForLogLines,
} from "./helpers.ts";

const URL_ONE = "https://logs.example.com/coss";

async function createDrain(
  app: TestApp,
  key: string,
  body: Record<string, unknown> = { url: URL_ONE },
): Promise<LogDrainWithSecretOutput> {
  const res = await apiRequest(app, "POST", "/v1/log_drains", { key, body });
  if (res.status !== 200) throw new Error(`create failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as LogDrainWithSecretOutput;
}

async function auditActions(tenant: TestTenant): Promise<string[]> {
  const { rows } = await pool.query<{ action: string }>(
    "select action from org_audit_event where organization_id = $1 and actor_type = 'api_key' order by id",
    [tenant.organization.id],
  );
  return rows.map((row) => row.action);
}

describe("/v1/log_drains", () => {
  test("creates a drain and returns its signing secret once", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await apiRequest(app, "POST", "/v1/log_drains", {
      key: tenant.liveKey,
      body: { url: URL_ONE, description: "  Production logs ", sources: ["email", "api"] },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toMatch(REQUEST_ID);
    const drain = (await res.json()) as LogDrainWithSecretOutput;
    expect(drain).toMatchObject({
      object: "log_drain",
      url: URL_ONE,
      description: "Production logs",
      sources: ["api", "email"],
      enabled: true,
      disabled_reason: null,
    });
    expect(drain.id).toStartWith("drain_");
    expect(drain.secret).toStartWith("whsec_");
    const row = await getLogDrain({ organizationId: tenant.organization.id, id: drain.id });
    expect(row?.environmentId).toBe(tenant.production.id);
    if (!row) throw new Error("missing drain");
    expect(revealLogDrainSecret(row, TEST_SECRETS_KEYS)).toBe(drain.secret);

    const fetched = await apiRequest(app, "GET", `/v1/log_drains/${drain.id}`, {
      key: tenant.liveKey,
    });
    expect(fetched.status).toBe(200);
    expect(await fetched.json()).not.toHaveProperty("secret");

    // Omitted sources mean every source.
    expect((await createDrain(app, tenant.liveKey)).sources).toEqual([]);
  });

  test("validates the body", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const unknownSource = await apiRequest(app, "POST", "/v1/log_drains", {
      key: tenant.sandboxKey,
      body: { url: URL_ONE, sources: ["video"] },
    });
    expect(unknownSource.status).toBe(422);
    expect((await errorOf(unknownSource)).code).toBe("validation_error");

    const extra = await apiRequest(app, "POST", "/v1/log_drains", {
      key: tenant.sandboxKey,
      body: { url: URL_ONE, api_version: "2026-01-01" },
    });
    expect(extra.status).toBe(422);

    const empty = await apiRequest(app, "PATCH", "/v1/log_drains/drain_x", {
      key: tenant.sandboxKey,
      body: {},
    });
    expect(empty.status).toBe(422);
  });

  test("is limited per environment", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    for (let i = 0; i < MAX_LOG_DRAINS_PER_ENVIRONMENT; i++) {
      await createDrain(app, tenant.sandboxKey, { url: `${URL_ONE}/${i}` });
    }
    const res = await apiRequest(app, "POST", "/v1/log_drains", {
      key: tenant.sandboxKey,
      body: { url: URL_ONE },
    });
    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({
      type: "invalid_request_error",
      code: "too_many_log_drains",
    });
  });

  test("keys only see their own environment's drains", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { app } = createTestApp();
    const live = await createDrain(app, tenant.liveKey);
    const sandbox = await createDrain(app, tenant.sandboxKey);

    const list = await apiRequest(app, "GET", "/v1/log_drains", { key: tenant.sandboxKey });
    expect(((await list.json()) as LogDrainListOutput).data.map((drain) => drain.id)).toEqual([
      sandbox.id,
    ]);
    for (const [key, id] of [
      [tenant.sandboxKey, live.id],
      [other.liveKey, live.id],
    ] as const) {
      for (const [method, body] of [
        ["GET", undefined],
        ["PATCH", { enabled: false }],
        ["DELETE", undefined],
      ] as const) {
        const res = await apiRequest(app, method, `/v1/log_drains/${id}`, { key, body });
        expect(res.status).toBe(404);
        expect((await errorOf(res)).code).toBe("not_found");
      }
    }
    expect(
      (await getLogDrain({ organizationId: tenant.organization.id, id: live.id }))?.enabled,
    ).toBe(true);
  });

  test("updates, disables and deletes a drain, recording audit events", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const drain = await createDrain(app, tenant.liveKey);

    const updated = await apiRequest(app, "PATCH", `/v1/log_drains/${drain.id}`, {
      key: tenant.liveKey,
      body: { sources: ["audit"], description: null, enabled: false },
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      sources: ["audit"],
      description: null,
      enabled: false,
      disabled_reason: "manual",
    } satisfies Partial<LogDrainObjectOutput>);

    const badUrl = await apiRequest(app, "PATCH", `/v1/log_drains/${drain.id}`, {
      key: tenant.liveKey,
      body: { url: "ftp://logs.example.com" },
    });
    expect(badUrl.status).toBe(422);
    expect(await errorOf(badUrl)).toMatchObject({ code: "invalid_url", param: "url" });

    const deleted = await apiRequest(app, "DELETE", `/v1/log_drains/${drain.id}`, {
      key: tenant.liveKey,
    });
    expect(await deleted.json()).toEqual({ object: "log_drain", id: drain.id, deleted: true });
    const gone = await apiRequest(app, "GET", `/v1/log_drains/${drain.id}`, {
      key: tenant.liveKey,
    });
    expect(gone.status).toBe(404);

    expect(await auditActions(tenant)).toEqual([
      "log_drain.created",
      "log_drain.updated",
      "log_drain.deleted",
    ]);
  });

  test("needs the logDrain permission", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const drain = await createDrain(app, tenant.sandboxKey);
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      logDrain: ["read"],
    });
    const read = await apiRequest(app, "GET", `/v1/log_drains/${drain.id}`, {
      key: tenant.sandboxKey,
    });
    expect(read.status).toBe(200);
    const write = await apiRequest(app, "POST", "/v1/log_drains", {
      key: tenant.sandboxKey,
      body: { url: URL_ONE },
    });
    expect(write.status).toBe(403);
    expect((await errorOf(write)).type).toBe("permission_error");
  });

  test("lists a drain's batches with their attempts", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const receiver = webhookReceiver();
    try {
      const drain = await createDrain(app, tenant.sandboxKey, { url: receiver.url });
      await appendLogEntries(db, [
        {
          organizationId: tenant.organization.id,
          projectId: tenant.project.id,
          environmentId: tenant.development.id,
          occurredAt: new Date(),
          source: "email",
          level: "info",
          type: "email.sent",
          message: "Sent",
        },
      ]);
      await runDueLogDrainDeliveries(
        { scope: { organizationIds: [tenant.organization.id] } },
        { secretsKeys: TEST_SECRETS_KEYS, send: testSender() },
      );

      const list = await apiRequest(app, "GET", `/v1/log_drains/${drain.id}/batches`, {
        key: tenant.sandboxKey,
      });
      expect(list.status).toBe(200);
      const page = (await list.json()) as LogDrainBatchListOutput;
      expect(page.has_more).toBe(false);
      expect(page.data).toHaveLength(1);
      const [batch] = page.data;
      expect(batch).toMatchObject({
        object: "log_drain_batch",
        drain_id: drain.id,
        status: "succeeded",
        // The drain's own `log_drain.created` audit event, then the email line.
        line_count: 2,
        attempt_count: 1,
        attempts: [{ object: "log_drain_attempt", status_code: 200, response_excerpt: "ok" }],
      });
      expect(batch?.id).toBe(receiver.received[0]?.headers.get("webhook-id") ?? "");
      const lines = (receiver.received[0]?.body ?? "")
        .trim()
        .split("\n")
        .map((text) => JSON.parse(text) as Record<string, unknown>);
      expect(lines.map((entry) => [entry.object, entry.action ?? entry.type])).toEqual([
        ["audit_event", "log_drain.created"],
        ["log", "email.sent"],
      ]);

      const one = await apiRequest(app, "GET", `/v1/log_drains/${drain.id}/batches/${batch?.id}`, {
        key: tenant.sandboxKey,
      });
      expect(((await one.json()) as LogDrainBatchObjectOutput).id).toBe(batch?.id ?? "");

      const filtered = await apiRequest(
        app,
        "GET",
        `/v1/log_drains/${drain.id}/batches?status=failed`,
        { key: tenant.sandboxKey },
      );
      expect(((await filtered.json()) as LogDrainBatchListOutput).data).toEqual([]);

      const missing = await apiRequest(
        app,
        "GET",
        `/v1/log_drains/${drain.id}/batches/drainbat_missing`,
        { key: tenant.sandboxKey },
      );
      expect(missing.status).toBe(404);
    } finally {
      receiver.stop();
    }
  });
});

describe("log drain auth headers", () => {
  test("are never returned, nor kept in the request log, even when refused", async () => {
    const tenant = await createTestTenant();
    const logWriter = memoryLogWriter();
    const { app } = createTestApp({ logWriter });
    const key = tenant.sandboxKey;
    const created = await createDrain(app, key, {
      url: URL_ONE,
      format: "datadog",
      auth_header: { name: "DD-API-KEY", value: "dd-created-value" },
    });
    expect(created).toMatchObject({ format: "datadog", auth_header_name: "DD-API-KEY" });
    const refused = await apiRequest(app, "PATCH", `/v1/log_drains/${created.id}`, {
      key,
      body: { auth_header: { name: "Content-Type", value: "dd-refused-value" } },
    });
    expect(refused.status).toBe(422);
    const updated = await apiRequest(app, "PATCH", `/v1/log_drains/${created.id}`, {
      key,
      body: { auth_header: { name: "Authorization", value: "Bearer dd-updated-value" } },
    });
    expect(updated.status).toBe(200);
    const body = await updated.text();
    expect(body).toContain('"auth_header_name":"Authorization"');
    expect(body).not.toContain("dd-updated-value");

    const lines = await waitForLogLines(logWriter, 3);
    expect(lines.map((line) => line.statusCode)).toEqual([200, 422, 200]);
    for (const line of lines) {
      const logged = JSON.stringify(line);
      for (const value of ["dd-created-value", "dd-refused-value", "dd-updated-value"]) {
        expect(logged).not.toContain(value);
      }
      expect(line.attributes).toMatchObject({ request: { body: { auth_header: "[redacted]" } } });
    }
  });
});
