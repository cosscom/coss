import { describe, expect, test } from "bun:test";
import { listOrgAuditEvents } from "@coss/logs";
import { memoryLogWriter } from "@coss/logs/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { API_VERSIONS, LATEST_API_VERSION } from "@coss/versioning";
import {
  DeletedWebhookListener,
  WebhookListenerObject,
  WebhookListenerPoll,
} from "@coss/webhooks/schemas";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  emailBody,
  errorOf,
  sendEmail,
  type TestApp,
  waitForLogLines,
} from "./helpers.ts";

async function openListener(app: TestApp, key: string, body: Record<string, unknown> = {}) {
  const res = await apiRequest(app, "POST", "/v1/webhook_listeners", { key, body });
  expect(res.status).toBe(200);
  return WebhookListenerObject.parse(await res.json());
}

async function poll(app: TestApp, key: string, id: string, body: Record<string, unknown> = {}) {
  return apiRequest(app, "POST", `/v1/webhook_listeners/${id}/poll`, {
    key,
    body: { wait_ms: 0, ...body },
  });
}

describe("webhook listeners", () => {
  test("receive the environment's events, signed by nobody, and acknowledge them", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = createTestApp();
    const listener = await openListener(app, tenant.sandboxKey, {
      event_types: ["email.sent", "email.delivered"],
      description: "laptop → localhost:3000/hooks",
    });
    expect(listener).toMatchObject({
      object: "webhook_listener",
      api_version: LATEST_API_VERSION,
      event_types: ["email.delivered", "email.sent"],
      description: "laptop → localhost:3000/hooks",
    });

    const sent = await sendEmail(app, tenant.sandboxKey, emailBody());
    expect(sent.status).toBe(202);
    const { id: emailId } = (await sent.json()) as { id: string };
    await dispatch();

    const res = await poll(app, tenant.sandboxKey, listener.id);
    expect(res.status).toBe(200);
    const body = WebhookListenerPoll.parse(await res.json());
    expect(body.deliveries.map((d) => d.event_type)).toEqual(["email.sent", "email.delivered"]);
    const [first] = body.deliveries;
    const event = JSON.parse(first?.body ?? "{}");
    expect(event).toMatchObject({
      id: first?.event_id,
      object: "event",
      type: "email.sent",
      api_version: LATEST_API_VERSION,
      data: expect.objectContaining({ email_id: emailId }),
    });

    const acked = await poll(app, tenant.sandboxKey, listener.id, {
      acks: body.deliveries.map((d) => ({
        delivery_id: d.id,
        ack_token: d.ack_token,
        status_code: 200,
        duration_ms: 4,
        error: null,
      })),
    });
    expect(WebhookListenerPoll.parse(await acked.json())).toMatchObject({
      acknowledged: 2,
      deliveries: [],
    });

    const { events } = await listOrgAuditEvents({ organizationId: tenant.organization.id });
    expect(events.map((e) => e.action)).toContain("webhook_listener.created");
    expect(events.find((e) => e.action === "webhook_listener.created")).toMatchObject({
      actor_type: "api_key",
      actor_id: await apiKeyIdForEnvironment(tenant.development.id),
      target_id: listener.id,
      environment_id: tenant.development.id,
    });
  });

  test("render events in the version they were opened with", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const older = API_VERSIONS[0];
    const listener = await openListener(app, tenant.sandboxKey, { api_version: older });
    expect(listener.api_version).toBe(older);
    // Defaults to the request's version.
    const res = await apiRequest(app, "POST", "/v1/webhook_listeners", {
      key: tenant.sandboxKey,
      body: {},
      headers: { "Coss-Version": older },
    });
    expect(((await res.json()) as { api_version: string }).api_version).toBe(older);
  });

  test("belong to the key's environment, and are gone once closed", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { app } = createTestApp();
    const listener = await openListener(app, tenant.sandboxKey);

    for (const key of [tenant.liveKey, other.sandboxKey]) {
      const res = await poll(app, key, listener.id);
      expect(res.status).toBe(404);
      expect(await errorOf(res)).toMatchObject({ type: "not_found_error", code: "not_found" });
      expect(
        (await apiRequest(app, "DELETE", `/v1/webhook_listeners/${listener.id}`, { key })).status,
      ).toBe(404);
    }

    const deleted = await apiRequest(app, "DELETE", `/v1/webhook_listeners/${listener.id}`, {
      key: tenant.sandboxKey,
    });
    expect(DeletedWebhookListener.parse(await deleted.json())).toEqual({
      object: "webhook_listener",
      id: listener.id,
      deleted: true,
    });
    expect((await poll(app, tenant.sandboxKey, listener.id)).status).toBe(404);
    expect((await poll(app, tenant.sandboxKey, "whlis_nope")).status).toBe(404);
  });

  test("validate their bodies, and an environment has a cap", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const bad = await apiRequest(app, "POST", "/v1/webhook_listeners", {
      key: tenant.sandboxKey,
      body: { event_types: ["email.nope"] },
    });
    expect(bad.status).toBe(422);
    expect(await errorOf(bad)).toMatchObject({ code: "validation_error" });

    const listener = await openListener(app, tenant.sandboxKey);
    const tooLong = await poll(app, tenant.sandboxKey, listener.id, { wait_ms: 60_000 });
    expect(tooLong.status).toBe(422);

    for (let i = 1; i < 5; i++) await openListener(app, tenant.sandboxKey);
    const full = await apiRequest(app, "POST", "/v1/webhook_listeners", {
      key: tenant.sandboxKey,
      body: {},
    });
    expect(full.status).toBe(422);
    expect(await errorOf(full)).toMatchObject({ code: "too_many_listeners" });
  });

  test("a waiting poll answers at once when the server shuts down", async () => {
    const tenant = await createTestTenant();
    const shutdown = new AbortController();
    const { app } = createTestApp({ shutdownSignal: shutdown.signal });
    const listener = await openListener(app, tenant.sandboxKey);
    const started = Date.now();
    const waiting = poll(app, tenant.sandboxKey, listener.id, { wait_ms: 20_000 });
    setTimeout(() => shutdown.abort(), 100);
    const res = await waiting;
    expect(res.status).toBe(200);
    expect(((await res.json()) as { deliveries: unknown[] }).deliveries).toEqual([]);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  test("polls aren't request-logged; opening and closing are", async () => {
    const tenant = await createTestTenant();
    const logWriter = memoryLogWriter();
    const { app } = createTestApp({ logWriter });
    const listener = await openListener(app, tenant.sandboxKey);
    await poll(app, tenant.sandboxKey, listener.id);
    await apiRequest(app, "DELETE", `/v1/webhook_listeners/${listener.id}`, {
      key: tenant.sandboxKey,
    });
    const lines = await waitForLogLines(logWriter, 2);
    await Bun.sleep(20);
    expect(lines.map((line) => `${line.method} ${line.route}`)).toEqual([
      "POST /v1/webhook_listeners",
      "DELETE /v1/webhook_listeners/:id",
    ]);
  });
});
