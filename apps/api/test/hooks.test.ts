import { describe, expect, test } from "bun:test";
import { authenticateHookPortalSession, runDueHookDeliveries } from "@coss/hooks";
import type {
  HookApplicationObjectOutput,
  HookAttemptListOutput,
  HookDeliveryListOutput,
  HookEndpointWithSecretOutput,
  HookMessageObjectOutput,
  HookPortalSessionObjectOutput,
} from "@coss/hooks/schemas";
import { testHookDeliveryDeps } from "@coss/hooks/testing";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { suspendOrganization } from "@coss/reputation";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { TEST_PREVIOUS_VERSION, testVersioning } from "@coss/versioning/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  setKeyPermissions,
  type TestApp,
} from "./helpers.ts";

async function json<T = unknown>(response: Response, status = 200): Promise<T> {
  if (response.status !== status) {
    throw new Error(`expected ${status}, got ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function setup(app: TestApp, key: string, uid = "customer_1") {
  await json(
    await apiRequest(app, "POST", "/v1/hooks/event_types", {
      key,
      body: { name: "invoice.paid", examples: [{ invoice_id: "in_1" }] },
    }),
  );
  const application = await json<HookApplicationObjectOutput>(
    await apiRequest(app, "POST", "/v1/hooks/applications", {
      key,
      body: { name: "Acme", uid },
    }),
  );
  const endpoint = await json<HookEndpointWithSecretOutput>(
    await apiRequest(app, "POST", `/v1/hooks/applications/${uid}/endpoints`, {
      key,
      body: { url: "https://example.com/hook", filter_types: ["invoice.paid"] },
    }),
  );
  return { application, endpoint };
}

function deliver(tenant: TestTenant, status = 200) {
  return runDueHookDeliveries(
    { scope: { organizationIds: [tenant.organization.id] } },
    testHookDeliveryDeps({ send: async () => ({ status, body: "received" }) }),
  );
}

describe("Hooks API", () => {
  test("event type → application → endpoint → message → delivery, addressed by uid", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    const { application, endpoint } = await setup(app, key);
    expect(application).toMatchObject({ object: "hook_application", uid: "customer_1" });
    expect(endpoint.secret).toStartWith("whsec_");
    expect(endpoint).toMatchObject({
      application_id: application.id,
      filter_types: ["invoice.paid"],
    });

    const sent = await apiRequest(app, "POST", "/v1/hooks/applications/customer_1/messages", {
      key,
      body: { event_type: "invoice.paid", payload: { invoice_id: "in_1" } },
    });
    const message = await json<HookMessageObjectOutput>(sent, 202);
    expect(message).toMatchObject({
      object: "hook_message",
      application_id: application.id,
      payload: { invoice_id: "in_1" },
    });
    expect(await deliver(tenant)).toBe(1);

    const byMessage = await json<HookDeliveryListOutput>(
      await apiRequest(
        app,
        "GET",
        `/v1/hooks/applications/${application.id}/messages/${message.id}/deliveries`,
        { key },
      ),
    );
    const [delivery] = byMessage.data;
    expect(delivery).toMatchObject({
      endpoint_id: endpoint.id,
      status: "succeeded",
      attempt_count: 1,
    });
    if (!delivery) throw new Error("no delivery");
    const attempts = await json<HookAttemptListOutput>(
      await apiRequest(
        app,
        "GET",
        `/v1/hooks/applications/customer_1/deliveries/${delivery.id}/attempts`,
        { key },
      ),
    );
    expect(attempts.data).toEqual([
      expect.objectContaining({ status_code: 200, response_excerpt: "received" }),
    ]);
    const byEndpoint = await json<HookDeliveryListOutput>(
      await apiRequest(
        app,
        "GET",
        `/v1/hooks/applications/customer_1/endpoints/${endpoint.id}/deliveries`,
        { key },
      ),
    );
    expect(byEndpoint.data.map((row) => row.id)).toEqual([delivery.id]);
    const retried = await apiRequest(
      app,
      "POST",
      `/v1/hooks/applications/customer_1/deliveries/${delivery.id}/retry`,
      { key },
    );
    expect(await json(retried)).toMatchObject({ status: "pending" });

    const messages = await json<{ data: HookMessageObjectOutput[] }>(
      await apiRequest(app, "GET", "/v1/hooks/applications/customer_1/messages", { key }),
    );
    expect(messages.data.map((row) => row.id)).toEqual([message.id]);
  });

  test("resources of another environment are 404, and keys need hook permissions", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await setup(app, tenant.sandboxKey);

    const fromLive = await apiRequest(app, "GET", "/v1/hooks/applications/customer_1", {
      key: tenant.liveKey,
    });
    expect(fromLive.status).toBe(404);
    expect(await errorOf(fromLive)).toMatchObject({ code: "application_not_found" });

    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      hook: ["read"],
    });
    const read = await apiRequest(app, "GET", "/v1/hooks/applications", { key: tenant.sandboxKey });
    expect(read.status).toBe(200);
    const send = await apiRequest(app, "POST", "/v1/hooks/applications/customer_1/messages", {
      key: tenant.sandboxKey,
      body: { event_type: "invoice.paid", payload: {} },
    });
    expect(send.status).toBe(403);
  });

  test("an Idempotency-Key replays the message; reusing it for another body is 422", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    await setup(app, key);
    const send = (amount: number, idempotencyKey = "invoice-1") =>
      apiRequest(app, "POST", "/v1/hooks/applications/customer_1/messages", {
        key,
        headers: { "Idempotency-Key": idempotencyKey },
        body: { event_type: "invoice.paid", payload: { amount } },
      });
    const first = await json<HookMessageObjectOutput>(await send(1), 202);
    const again = await send(1);
    expect(again.headers.get("idempotent-replayed")).toBe("true");
    expect((await json<HookMessageObjectOutput>(again, 202)).id).toBe(first.id);
    const reused = await send(2);
    expect(reused.status).toBe(422);
    expect(await errorOf(reused)).toMatchObject({
      type: "idempotency_error",
      code: "idempotency_key_reused",
      param: "Idempotency-Key",
    });
    const blank = await send(1, "x".repeat(300));
    expect(blank.status).toBe(400);
    expect(await errorOf(blank)).toMatchObject({ code: "invalid_idempotency_key" });
  });

  test("sandbox sends are charged per delivery, refunded on replays and refused over quota", async () => {
    const tenant = await createTestTenant();
    const limiter = memoryLimiter({
      overrides: async () => ({
        "hooks.sandbox_deliveries.day": { limit: 2, periodMs: 86_400_000 },
      }),
    });
    const { app } = createTestApp({ rateLimiter: limiter });
    const key = tenant.sandboxKey;
    await setup(app, key);
    const send = (idempotencyKey?: string) =>
      apiRequest(app, "POST", "/v1/hooks/applications/customer_1/messages", {
        key,
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
        body: { event_type: "invoice.paid", payload: {} },
      });
    expect((await send("a")).status).toBe(202);
    expect((await send("a")).status).toBe(202);
    expect((await send()).status).toBe(202);
    const over = await send();
    expect(over.status).toBe(429);
    expect(await errorOf(over)).toMatchObject({ code: "quota_exceeded" });
    // A replay still answers over quota.
    expect((await send("a")).headers.get("idempotent-replayed")).toBe("true");
  });

  test("live sends are refused while the organization is suspended", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await setup(app, tenant.liveKey);
    await suspendOrganization({
      organizationId: tenant.organization.id,
      trigger: "manual",
      actor: { kind: "system" },
    });
    const res = await apiRequest(app, "POST", "/v1/hooks/applications/customer_1/messages", {
      key: tenant.liveKey,
      body: { event_type: "invoice.paid", payload: {} },
    });
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toMatchObject({
      type: "permission_error",
      code: "account_suspended",
    });
  });

  test("payloads are customer data: too large is 422, and versions never rewrite them", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ versioning: testVersioning() });
    const key = tenant.sandboxKey;
    await setup(app, key);
    const big = await apiRequest(app, "POST", "/v1/hooks/applications/customer_1/messages", {
      key,
      body: { event_type: "invoice.paid", payload: { blob: "x".repeat(300 * 1024) } },
    });
    expect(big.status).toBe(422);
    expect(await errorOf(big)).toMatchObject({ code: "payload_too_large", param: "payload" });

    // An `email` object inside a payload is not an email: an older version leaves it alone.
    const payload = { object: "email", tracking: { opens: true } };
    const sent = await apiRequest(app, "POST", "/v1/hooks/applications/customer_1/messages", {
      key,
      headers: { "Coss-Version": TEST_PREVIOUS_VERSION },
      body: { event_type: "invoice.paid", payload },
    });
    expect((await json<HookMessageObjectOutput>(sent, 202)).payload).toEqual(payload);
  });

  test("a portal session's URL carries the token in its fragment", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    const { application } = await setup(app, key);
    const session = await json<HookPortalSessionObjectOutput>(
      await apiRequest(app, "POST", "/v1/hooks/applications/customer_1/portal_sessions", {
        key,
        body: { expires_in: 600, read_only: true },
      }),
    );
    expect(session.url).toBe(`http://localhost:3003/s/${session.id}#${session.token}`);
    expect(
      await authenticateHookPortalSession({ id: session.id, token: session.token }),
    ).toMatchObject({
      readOnly: true,
      application: expect.objectContaining({ id: application.id }),
    });
  });

  test("endpoints: secrets, test sends, recovery", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    const { endpoint } = await setup(app, key);
    const base = `/v1/hooks/applications/customer_1/endpoints/${endpoint.id}`;
    const secret = await json<{ object: string; secret: string }>(
      await apiRequest(app, "GET", `${base}/secret`, { key }),
    );
    expect(secret).toEqual({
      object: "hook_endpoint_secret",
      secret: endpoint.secret,
    });
    const rolled = await json<HookEndpointWithSecretOutput>(
      await apiRequest(app, "POST", `${base}/roll_secret`, { key, body: {} }),
    );
    expect(rolled.secret).not.toBe(endpoint.secret);

    // A test send uses the type's first example and goes to this endpoint only.
    const test = await json<HookMessageObjectOutput>(
      await apiRequest(app, "POST", `${base}/test`, {
        key,
        body: { event_type: "customer.created" },
      }),
      202,
    );
    expect(test.payload).toEqual({});
    const example = await json<HookMessageObjectOutput>(
      await apiRequest(app, "POST", `${base}/test`, { key, body: { event_type: "invoice.paid" } }),
      202,
    );
    expect(example.payload).toEqual({ invoice_id: "in_1" });
    expect(await deliver(tenant, 500)).toBe(2);

    const recovery = await json<{ id: string; status: string }>(
      await apiRequest(app, "POST", `${base}/recover`, {
        key,
        body: { since: new Date(Date.now() - 3_600_000).toISOString() },
      }),
    );
    expect(recovery).toMatchObject({ status: "pending" });
    const fetched = await apiRequest(app, "GET", `${base}/recoveries/${recovery.id}`, { key });
    expect(await json(fetched)).toMatchObject({ id: recovery.id });

    const missing = await apiRequest(app, "GET", `${base}/recoveries/hrec_nope`, { key });
    expect(missing.status).toBe(404);
  });
});
