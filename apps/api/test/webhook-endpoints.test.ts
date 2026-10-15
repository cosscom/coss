import { describe, expect, test } from "bun:test";
import { EMAIL_EVENT_TYPES } from "@coss/email/schemas";
import { createTestTenant } from "@coss/tenancy/testing";
import { MAX_ENDPOINTS_PER_ENVIRONMENT } from "@coss/webhooks";
import type {
  WebhookEndpointListOutput,
  WebhookEndpointObjectOutput,
  WebhookEndpointWithSecretOutput,
} from "@coss/webhooks/schemas";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  endpointRow,
  errorOf,
  REQUEST_ID,
  setKeyPermissions,
  type TestApp,
} from "./helpers.ts";

const URL_ONE = "https://hooks.example.com/coss";
const URL_TWO = "https://hooks.example.com/coss-2";

async function createEndpoint(
  app: TestApp,
  key: string,
  body: Record<string, unknown> = { url: URL_ONE },
): Promise<WebhookEndpointWithSecretOutput> {
  const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", { key, body });
  if (res.status !== 200) throw new Error(`create failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as WebhookEndpointWithSecretOutput;
}

describe("POST /v1/webhook_endpoints", () => {
  test("creates an endpoint and returns the signing secret once", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.liveKey,
      body: {
        url: URL_ONE,
        description: "  Production receiver  ",
        event_types: ["email.bounced"],
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toMatch(REQUEST_ID);
    const endpoint = (await res.json()) as WebhookEndpointWithSecretOutput;
    expect(endpoint).toMatchObject({
      object: "webhook_endpoint",
      url: URL_ONE,
      description: "Production receiver",
      event_types: ["email.bounced"],
      enabled: true,
    });
    expect(endpoint.id).toStartWith("whep_");
    expect(endpoint.secret).toStartWith("whsec_");
    // The same secret the worker signs deliveries with, stored encrypted.
    expect((await endpointRow(endpoint.id)).secret).toBe(endpoint.secret);

    // Reading it back never exposes the secret again.
    const fetched = await apiRequest(app, "GET", `/v1/webhook_endpoints/${endpoint.id}`, {
      key: tenant.liveKey,
    });
    expect(await fetched.json()).not.toHaveProperty("secret");
  });

  test("omitting event_types subscribes to every event type", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const endpoint = await createEndpoint(app, tenant.sandboxKey);

    expect(endpoint.event_types).toEqual([]);
  });

  test("event types are deduplicated and sorted", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const endpoint = await createEndpoint(app, tenant.sandboxKey, {
      url: URL_ONE,
      event_types: ["email.sent", "email.bounced", "email.sent"],
    });

    expect(endpoint.event_types).toEqual(["email.bounced", "email.sent"]);
  });

  test("account.* reputation events are subscribable", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.liveKey,
      body: { url: URL_ONE, event_types: ["account.suspended", "account.reinstated"] },
    });

    expect(res.status).toBe(200);
    const endpoint = (await res.json()) as WebhookEndpointWithSecretOutput;
    expect(endpoint.event_types.toSorted()).toEqual(["account.reinstated", "account.suspended"]);
  });

  test("an unknown event type is 422 validation_error listing the allowed values", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body: { url: URL_ONE, event_types: ["email.forwarded"] },
    });

    expect(res.status).toBe(422);
    const error = await errorOf(res);
    expect(error).toMatchObject({ code: "validation_error", param: "event_types.0" });
    expect(error.issues?.[0]?.message).toContain(EMAIL_EVENT_TYPES[0]);
  });

  test("a URL that is not https is 422 invalid_url naming the field", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body: { url: "ftp://example.com/hook" },
    });

    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({
      type: "invalid_request_error",
      code: "invalid_url",
      param: "url",
    });
  });

  test(`more than ${MAX_ENDPOINTS_PER_ENVIRONMENT} endpoints is 422 too_many_endpoints`, async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    for (let i = 0; i < MAX_ENDPOINTS_PER_ENVIRONMENT; i++) {
      await createEndpoint(app, tenant.sandboxKey, { url: `${URL_ONE}/${i}` });
    }
    const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body: { url: `${URL_ONE}/overflow` },
    });

    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({ code: "too_many_endpoints" });
    // The limit is per environment, so the other environment is unaffected.
    const other = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.liveKey,
      body: { url: URL_ONE },
    });
    expect(other.status).toBe(200);
  });

  test("a key without webhook:create is 403", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      webhook: ["read"],
    });

    const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body: { url: URL_ONE },
    });

    expect(res.status).toBe(403);
  });
});

describe("GET /v1/webhook_endpoints", () => {
  test("lists only the key's own environment, oldest first", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const first = await createEndpoint(app, tenant.sandboxKey, { url: URL_ONE });
    const second = await createEndpoint(app, tenant.sandboxKey, { url: URL_TWO });
    await createEndpoint(app, tenant.liveKey, { url: URL_ONE });

    const res = await apiRequest(app, "GET", "/v1/webhook_endpoints", { key: tenant.sandboxKey });

    expect(res.status).toBe(200);
    const list = (await res.json()) as WebhookEndpointListOutput;
    expect(list.object).toBe("list");
    expect(list.has_more).toBe(false);
    expect(list.data.map((endpoint) => endpoint.id)).toEqual([first.id, second.id]);
    expect(list.data.some((endpoint) => "secret" in endpoint)).toBe(false);
  });
});

describe("GET /v1/webhook_endpoints/{id}", () => {
  test("an endpoint of another environment is 404, like an unknown id", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const live = await createEndpoint(app, tenant.liveKey);

    const responses = await Promise.all([
      apiRequest(app, "GET", `/v1/webhook_endpoints/${live.id}`, { key: tenant.sandboxKey }),
      apiRequest(app, "GET", "/v1/webhook_endpoints/whep_01k7c8m4q2f3e9v6t5r1n0p8yz", {
        key: tenant.sandboxKey,
      }),
      apiRequest(app, "GET", "/v1/webhook_endpoints/not-an-id", { key: tenant.sandboxKey }),
    ]);

    expect(responses.map((res) => res.status)).toEqual([404, 404, 404]);
    for (const res of responses) {
      expect(await errorOf(res)).toMatchObject({ type: "not_found_error", code: "not_found" });
    }
  });
});

describe("PATCH /v1/webhook_endpoints/{id}", () => {
  test("changes only the fields it is given and keeps the secret", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEndpoint(app, tenant.sandboxKey, {
      url: URL_ONE,
      description: "First",
      event_types: ["email.sent"],
    });

    const res = await apiRequest(app, "PATCH", `/v1/webhook_endpoints/${created.id}`, {
      key: tenant.sandboxKey,
      body: { url: URL_TWO, enabled: false },
    });

    expect(res.status).toBe(200);
    expect((await res.json()) as WebhookEndpointObjectOutput).toMatchObject({
      id: created.id,
      url: URL_TWO,
      description: "First",
      event_types: ["email.sent"],
      enabled: false,
    });
    expect((await endpointRow(created.id)).secret).toBe(created.secret);
  });

  test("a null description clears it", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEndpoint(app, tenant.sandboxKey, {
      url: URL_ONE,
      description: "Temporary",
    });

    const res = await apiRequest(app, "PATCH", `/v1/webhook_endpoints/${created.id}`, {
      key: tenant.sandboxKey,
      body: { description: null },
    });

    expect((await res.json()) as WebhookEndpointObjectOutput).toMatchObject({ description: null });
  });

  test("an empty body is 422 validation_error", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEndpoint(app, tenant.sandboxKey);

    const res = await apiRequest(app, "PATCH", `/v1/webhook_endpoints/${created.id}`, {
      key: tenant.sandboxKey,
      body: {},
    });

    expect(res.status).toBe(422);
    const error = await errorOf(res);
    expect(error.code).toBe("validation_error");
    expect(error.message).toContain("at least one field");
  });

  test("an endpoint of another environment is 404 and is left alone", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const live = await createEndpoint(app, tenant.liveKey, { url: URL_ONE });

    const res = await apiRequest(app, "PATCH", `/v1/webhook_endpoints/${live.id}`, {
      key: tenant.sandboxKey,
      body: { url: URL_TWO },
    });

    expect(res.status).toBe(404);
    expect((await endpointRow(live.id)).url).toBe(URL_ONE);
  });

  test("a key with webhook:read but not webhook:update is 403", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEndpoint(app, tenant.sandboxKey);
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      webhook: ["read"],
    });

    const res = await apiRequest(app, "PATCH", `/v1/webhook_endpoints/${created.id}`, {
      key: tenant.sandboxKey,
      body: { enabled: false },
    });

    expect(res.status).toBe(403);
  });
});

describe("POST /v1/webhook_endpoints/{id}/roll_secret", () => {
  test("returns a new secret; the previous one keeps signing for a day by default", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEndpoint(app, tenant.sandboxKey);
    expect(created.previous_secret_expires_at).toBeNull();
    const before = Date.now();

    const res = await apiRequest(app, "POST", `/v1/webhook_endpoints/${created.id}/roll_secret`, {
      key: tenant.sandboxKey,
      body: {},
    });

    expect(res.status).toBe(200);
    const rolled = (await res.json()) as WebhookEndpointWithSecretOutput;
    expect(rolled).toMatchObject({ object: "webhook_endpoint", id: created.id, url: URL_ONE });
    expect(rolled.secret).toStartWith("whsec_");
    expect(rolled.secret).not.toBe(created.secret);
    expect((await endpointRow(created.id)).secret).toBe(rolled.secret);
    const expiresAt = Date.parse(rolled.previous_secret_expires_at ?? "");
    expect(expiresAt - before).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    expect(expiresAt - Date.now()).toBeLessThanOrEqual(24 * 60 * 60 * 1000);

    // Reads show the rotation, never a secret.
    const read = await apiRequest(app, "GET", `/v1/webhook_endpoints/${created.id}`, {
      key: tenant.sandboxKey,
    });
    const shown = (await read.json()) as WebhookEndpointObjectOutput;
    expect(shown.previous_secret_expires_at).toBe(rolled.previous_secret_expires_at);
    expect(shown).not.toHaveProperty("secret");
  });

  test("previous_secret_expires_in 0 stops the previous secret at once", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEndpoint(app, tenant.sandboxKey);

    const res = await apiRequest(app, "POST", `/v1/webhook_endpoints/${created.id}/roll_secret`, {
      key: tenant.sandboxKey,
      body: { previous_secret_expires_in: 0 },
    });

    expect(res.status).toBe(200);
    expect(
      ((await res.json()) as WebhookEndpointWithSecretOutput).previous_secret_expires_at,
    ).toBeNull();
  });

  test("more than a week is 422 validation_error naming the field", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEndpoint(app, tenant.sandboxKey);

    const res = await apiRequest(app, "POST", `/v1/webhook_endpoints/${created.id}/roll_secret`, {
      key: tenant.sandboxKey,
      body: { previous_secret_expires_in: 7 * 24 * 60 * 60 + 1 },
    });

    expect(res.status).toBe(422);
    const error = await errorOf(res);
    expect(error.code).toBe("validation_error");
    expect(error.issues?.[0]?.path).toBe("previous_secret_expires_in");
    expect((await endpointRow(created.id)).secret).toBe(created.secret);
  });

  test("an endpoint of another environment is 404 and keeps its secret", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const live = await createEndpoint(app, tenant.liveKey);

    const res = await apiRequest(app, "POST", `/v1/webhook_endpoints/${live.id}/roll_secret`, {
      key: tenant.sandboxKey,
      body: {},
    });

    expect(res.status).toBe(404);
    expect((await endpointRow(live.id)).secret).toBe(live.secret);
  });

  test("a key with webhook:read but not webhook:update is 403", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEndpoint(app, tenant.sandboxKey);
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      webhook: ["read"],
    });

    const res = await apiRequest(app, "POST", `/v1/webhook_endpoints/${created.id}/roll_secret`, {
      key: tenant.sandboxKey,
      body: {},
    });

    expect(res.status).toBe(403);
  });
});

describe("DELETE /v1/webhook_endpoints/{id}", () => {
  test("deletes the endpoint", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEndpoint(app, tenant.sandboxKey);

    const res = await apiRequest(app, "DELETE", `/v1/webhook_endpoints/${created.id}`, {
      key: tenant.sandboxKey,
    });
    const afterwards = await apiRequest(app, "GET", `/v1/webhook_endpoints/${created.id}`, {
      key: tenant.sandboxKey,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      object: "webhook_endpoint",
      id: created.id,
      deleted: true,
    });
    expect(afterwards.status).toBe(404);
  });

  test("an endpoint of another environment is 404 and survives", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const live = await createEndpoint(app, tenant.liveKey);

    const res = await apiRequest(app, "DELETE", `/v1/webhook_endpoints/${live.id}`, {
      key: tenant.sandboxKey,
    });
    const stillThere = await apiRequest(app, "GET", `/v1/webhook_endpoints/${live.id}`, {
      key: tenant.liveKey,
    });

    expect(res.status).toBe(404);
    expect(stillThere.status).toBe(200);
  });
});
