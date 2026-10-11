import { describe, expect, test } from "bun:test";
import { db } from "@coss/db";
import { newId } from "@coss/db/id";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import {
  enqueueWebhookMessage,
  runDueWebhookDeliveries,
  type WebhookResponse,
} from "@coss/webhooks";
import type {
  WebhookDeliveryListOutput,
  WebhookDeliveryObjectOutput,
  WebhookEndpointWithSecretOutput,
} from "@coss/webhooks/schemas";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  setKeyPermissions,
  type TestApp,
} from "./helpers.ts";

async function createEndpoint(app: TestApp, key: string): Promise<WebhookEndpointWithSecretOutput> {
  const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
    key,
    body: { url: "https://hooks.example.com/coss" },
  });
  if (res.status !== 200) throw new Error(`create failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as WebhookEndpointWithSecretOutput;
}

/** Queues one event for the sandbox environment's endpoints; returns its id. */
async function enqueue(tenant: TestTenant, type = "email.delivered"): Promise<string> {
  const id = newId("evt");
  await enqueueWebhookMessage(db, {
    id,
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    type,
    payload: { id, object: "event", type, data: { email_id: "email_x" } },
  });
  return id;
}

/** Attempts the tenant's due deliveries, answering each with `response` (no network). */
function deliver(tenant: TestTenant, response: WebhookResponse, now = new Date()) {
  return runDueWebhookDeliveries(
    { now, scope: { organizationIds: [tenant.organization.id] } },
    { secretsKeys: TEST_SECRETS_KEYS, send: async () => response },
  );
}

async function listDeliveries(
  app: TestApp,
  key: string,
  endpointId: string,
  query = "",
): Promise<WebhookDeliveryListOutput> {
  const res = await apiRequest(
    app,
    "GET",
    `/v1/webhook_endpoints/${endpointId}/deliveries${query}`,
    {
      key,
    },
  );
  if (res.status !== 200) throw new Error(`list failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as WebhookDeliveryListOutput;
}

describe("GET /v1/webhook_endpoints/{id}/deliveries", () => {
  test("lists deliveries newest first with their attempts and payload", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);
    const first = await enqueue(tenant, "email.sent");
    await deliver(tenant, { status: 500, body: "boom" });
    const second = await enqueue(tenant, "email.delivered");

    const list = await listDeliveries(app, tenant.sandboxKey, endpoint.id);

    expect(list.object).toBe("list");
    expect(list.has_more).toBe(false);
    expect(list.data.map((delivery) => delivery.event_id)).toEqual([second, first]);
    const [pending, failed] = list.data;
    expect(pending).toMatchObject({
      object: "webhook_delivery",
      endpoint_id: endpoint.id,
      event_type: "email.delivered",
      status: "pending",
      attempt_count: 0,
      attempts: [],
      payload: { id: second, object: "event", type: "email.delivered" },
    });
    expect(failed).toMatchObject({
      event_type: "email.sent",
      // One failed attempt so far: retried later.
      status: "pending",
      attempt_count: 1,
      last_status_code: 500,
      last_error: "HTTP 500",
      attempts: [
        {
          object: "webhook_attempt",
          status_code: 500,
          error: "HTTP 500",
          response_excerpt: "boom",
        },
      ],
    });
    expect(failed?.id).toStartWith("whdel_");
    expect(failed?.attempts[0]?.id).toStartWith("whatt_");
    expect(failed?.next_attempt_at).not.toBeNull();
  });

  test("pages with limit and after", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);
    const events = [];
    for (let i = 0; i < 5; i++) events.push(await enqueue(tenant));
    const newestFirst = events.toReversed();

    const seen: string[] = [];
    let after: string | undefined;
    for (let page = 0; page < 5; page++) {
      const list = await listDeliveries(
        app,
        tenant.sandboxKey,
        endpoint.id,
        `?limit=2${after ? `&after=${after}` : ""}`,
      );
      seen.push(...list.data.map((delivery) => delivery.event_id));
      if (!list.has_more) break;
      after = list.data.at(-1)?.id;
    }

    expect(seen).toEqual(newestFirst);
  });

  test("filters by status and event_id", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);
    const delivered = await enqueue(tenant);
    await deliver(tenant, { status: 204, body: "" });
    const pending = await enqueue(tenant);

    const succeeded = await listDeliveries(
      app,
      tenant.sandboxKey,
      endpoint.id,
      "?status=succeeded",
    );
    const byEvent = await listDeliveries(
      app,
      tenant.sandboxKey,
      endpoint.id,
      `?event_id=${pending}`,
    );

    expect(succeeded.data.map((delivery) => delivery.event_id)).toEqual([delivered]);
    expect(succeeded.data[0]).toMatchObject({ status: "succeeded", next_attempt_at: null });
    expect(byEvent.data.map((delivery) => delivery.event_id)).toEqual([pending]);
  });

  test("an unknown cursor or status is handled", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);
    await enqueue(tenant);

    const unknown = await listDeliveries(
      app,
      tenant.sandboxKey,
      endpoint.id,
      `?after=${newId("whdel")}`,
    );
    const malformed = await listDeliveries(app, tenant.sandboxKey, endpoint.id, "?after=nope");
    const badStatus = await apiRequest(
      app,
      "GET",
      `/v1/webhook_endpoints/${endpoint.id}/deliveries?status=delivered`,
      { key: tenant.sandboxKey },
    );

    expect(unknown).toEqual({ object: "list", data: [], has_more: false });
    expect(malformed).toEqual({ object: "list", data: [], has_more: false });
    expect(badStatus.status).toBe(422);
    expect(await errorOf(badStatus)).toMatchObject({ code: "validation_error", param: "status" });
  });

  test("an endpoint of another environment is 404", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);

    const res = await apiRequest(app, "GET", `/v1/webhook_endpoints/${endpoint.id}/deliveries`, {
      key: tenant.liveKey,
    });

    expect(res.status).toBe(404);
    expect(await errorOf(res)).toMatchObject({ type: "not_found_error", code: "not_found" });
  });
});

describe("GET /v1/webhook_endpoints/{id}/deliveries/{delivery_id}", () => {
  test("returns one delivery of the endpoint", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);
    await enqueue(tenant);
    await deliver(tenant, { status: 200, body: "ok" });
    const [listed] = (await listDeliveries(app, tenant.sandboxKey, endpoint.id)).data;
    if (!listed) throw new Error("no delivery");

    const res = await apiRequest(
      app,
      "GET",
      `/v1/webhook_endpoints/${endpoint.id}/deliveries/${listed.id}`,
      { key: tenant.sandboxKey },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(listed);
  });

  test("a delivery of another endpoint, or an unknown id, is 404", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const one = await createEndpoint(app, tenant.sandboxKey);
    const two = await createEndpoint(app, tenant.sandboxKey);
    await enqueue(tenant);
    const [ofOne] = (await listDeliveries(app, tenant.sandboxKey, one.id)).data;
    if (!ofOne) throw new Error("no delivery");

    for (const path of [
      `/v1/webhook_endpoints/${two.id}/deliveries/${ofOne.id}`,
      `/v1/webhook_endpoints/${one.id}/deliveries/${newId("whdel")}`,
      `/v1/webhook_endpoints/${one.id}/deliveries/nope`,
    ]) {
      const res = await apiRequest(app, "GET", path, { key: tenant.sandboxKey });
      expect({ path, status: res.status }).toEqual({ path, status: 404 });
    }
  });
});

describe("POST /v1/webhook_endpoints/{id}/deliveries/{delivery_id}/retry", () => {
  async function failedDelivery(app: TestApp, tenant: TestTenant, endpointId: string) {
    await enqueue(tenant);
    await deliver(tenant, { status: 503, body: "" });
    const [delivery] = (await listDeliveries(app, tenant.sandboxKey, endpointId)).data;
    if (!delivery) throw new Error("no delivery");
    return delivery;
  }

  function retry(app: TestApp, key: string, endpointId: string, deliveryId: string) {
    return apiRequest(
      app,
      "POST",
      `/v1/webhook_endpoints/${endpointId}/deliveries/${deliveryId}/retry`,
      { key },
    );
  }

  test("queues a finished delivery for one more attempt", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);
    await enqueue(tenant);
    await deliver(tenant, { status: 200, body: "ok" });
    const [succeeded] = (await listDeliveries(app, tenant.sandboxKey, endpoint.id)).data;
    if (!succeeded) throw new Error("no delivery");

    const res = await retry(app, tenant.sandboxKey, endpoint.id, succeeded.id);

    expect(res.status).toBe(200);
    const retried = (await res.json()) as WebhookDeliveryObjectOutput;
    expect(retried).toMatchObject({ id: succeeded.id, status: "pending", attempt_count: 1 });
    expect(retried.next_attempt_at).not.toBeNull();

    // The worker picks it up and attempts it again.
    expect(await deliver(tenant, { status: 200, body: "again" })).toBe(1);
    const [after] = (await listDeliveries(app, tenant.sandboxKey, endpoint.id)).data;
    expect(after).toMatchObject({ status: "succeeded", attempt_count: 2 });
    expect(after?.attempts.map((attempt) => attempt.response_excerpt)).toEqual(["ok", "again"]);
  });

  test("a pending delivery is returned unchanged", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);
    const pending = await failedDelivery(app, tenant, endpoint.id);
    expect(pending.status).toBe("pending");

    const res = await retry(app, tenant.sandboxKey, endpoint.id, pending.id);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(pending);
  });

  test("needs webhook:update", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);
    const delivery = await failedDelivery(app, tenant, endpoint.id);
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      webhook: ["read"],
    });

    const res = await retry(app, tenant.sandboxKey, endpoint.id, delivery.id);

    expect(res.status).toBe(403);
    expect(await errorOf(res)).toMatchObject({ type: "permission_error" });
  });

  test("an unknown delivery or another environment's endpoint is 404", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const endpoint = await createEndpoint(app, tenant.sandboxKey);
    const delivery = await failedDelivery(app, tenant, endpoint.id);

    const unknown = await retry(app, tenant.sandboxKey, endpoint.id, newId("whdel"));
    const otherEnvironment = await retry(app, tenant.liveKey, endpoint.id, delivery.id);

    expect(unknown.status).toBe(404);
    expect(otherEnvironment.status).toBe(404);
  });
});
