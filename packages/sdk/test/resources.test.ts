/** The domain and webhook endpoint resources: request shape, and how results come back. */
import { describe, expect, test } from "bun:test";
import { Coss, type WebhookDelivery } from "../src/index.ts";
import { apiError, json, mockFetch, sampleDomain, sampleEndpoint } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch }), calls };
}

describe("coss.domains", () => {
  test("create posts the name with an idempotency key", async () => {
    const { coss, calls } = client(json(200, sampleDomain));

    const result = await coss.domains.create({ name: "acme.com" });

    expect(result).toEqual({ data: sampleDomain, error: null });
    expect(calls[0]).toMatchObject({ method: "POST", url: "https://api.test/v1/domains" });
    expect(calls[0]?.body).toBe('{"name":"acme.com"}');
    expect(calls[0]?.headers.get("idempotency-key")).toBeString();
  });

  test("list, get, verify and delete hit the documented routes", async () => {
    const { coss, calls } = client(
      json(200, { object: "list", data: [sampleDomain], has_more: false }),
    );

    const list = await coss.domains.list();
    await coss.domains.get(sampleDomain.id);
    await coss.domains.verify(sampleDomain.id);
    await coss.domains.delete(sampleDomain.id);

    expect(list.data?.data).toEqual([sampleDomain]);
    expect(calls.map((call) => `${call.method} ${new URL(call.url).pathname}`)).toEqual([
      "GET /v1/domains",
      `GET /v1/domains/${sampleDomain.id}`,
      `POST /v1/domains/${sampleDomain.id}/verify`,
      `DELETE /v1/domains/${sampleDomain.id}`,
    ]);
    // Only bodies are JSON-encoded; a verify has nothing to send.
    expect(calls[2]?.body).toBeNull();
    expect(calls[3]?.headers.get("content-type")).toBeNull();
  });

  test("ids are URL-encoded", async () => {
    const { coss, calls } = client(json(200, sampleDomain));
    await coss.domains.get("dom_1/../../etc");
    expect(new URL(calls[0]?.url ?? "").pathname).toBe("/v1/domains/dom_1%2F..%2F..%2Fetc");
  });

  test("a taken domain comes back as an error, never thrown", async () => {
    const { coss } = client(
      apiError(422, { type: "invalid_request_error", code: "domain_taken", param: "name" }),
    );

    const result = await coss.domains.create({ name: "acme.com" });

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({
      type: "invalid_request_error",
      code: "domain_taken",
      status: 422,
      param: "name",
    });
  });

  test("a 429 from verify is retried once Retry-After has passed", async () => {
    const { coss, calls } = client(
      apiError(
        429,
        { type: "rate_limit_error", code: "domain_recently_checked" },
        {
          "Retry-After": "0",
        },
      ),
      json(200, { ...sampleDomain, status: "verified" }),
    );

    const result = await coss.domains.verify(sampleDomain.id);

    expect(calls).toHaveLength(2);
    expect(result.data?.status).toBe("verified");
  });
});

describe("coss.webhookEndpoints", () => {
  test("create posts the endpoint and returns the secret", async () => {
    const created = { ...sampleEndpoint, secret: "whsec_abc" };
    const { coss, calls } = client(json(200, created));

    const result = await coss.webhookEndpoints.create({
      url: sampleEndpoint.url,
      event_types: ["email.bounced"],
    });

    expect(result.data?.secret).toBe("whsec_abc");
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "https://api.test/v1/webhook_endpoints",
    });
    expect(JSON.parse(calls[0]?.body ?? "null")).toEqual({
      url: sampleEndpoint.url,
      event_types: ["email.bounced"],
    });
  });

  test("update sends only the given fields as PATCH", async () => {
    const { coss, calls } = client(json(200, { ...sampleEndpoint, enabled: false }));

    const result = await coss.webhookEndpoints.update(sampleEndpoint.id, {
      enabled: false,
      description: null,
    });

    expect(result.data?.enabled).toBe(false);
    expect(calls[0]?.method).toBe("PATCH");
    expect(new URL(calls[0]?.url ?? "").pathname).toBe(
      `/v1/webhook_endpoints/${sampleEndpoint.id}`,
    );
    expect(JSON.parse(calls[0]?.body ?? "null")).toEqual({ enabled: false, description: null });
    // Idempotency keys are a POST concern: a PATCH is already idempotent.
    expect(calls[0]?.headers.get("idempotency-key")).toBeNull();
  });

  test("list, get and delete hit the documented routes", async () => {
    const { coss, calls } = client(
      json(200, { object: "list", data: [sampleEndpoint], has_more: false }),
    );

    const list = await coss.webhookEndpoints.list();
    await coss.webhookEndpoints.get(sampleEndpoint.id);
    await coss.webhookEndpoints.delete(sampleEndpoint.id);

    expect(list.data?.data).toEqual([sampleEndpoint]);
    expect(calls.map((call) => `${call.method} ${new URL(call.url).pathname}`)).toEqual([
      "GET /v1/webhook_endpoints",
      `GET /v1/webhook_endpoints/${sampleEndpoint.id}`,
      `DELETE /v1/webhook_endpoints/${sampleEndpoint.id}`,
    ]);
  });

  test("an aborted signal cancels before any request is made", async () => {
    const { coss, calls } = client(json(200, sampleEndpoint));
    const controller = new AbortController();
    controller.abort();

    const result = await coss.webhookEndpoints.list({ signal: controller.signal });

    expect(calls).toHaveLength(0);
    expect(result.error).toMatchObject({ type: "connection_error", code: "aborted" });
  });
});

describe("coss.webhookEndpoints.deliveries", () => {
  const delivery: WebhookDelivery = {
    object: "webhook_delivery",
    id: "whdel_123",
    endpoint_id: sampleEndpoint.id,
    event_id: "evt_123",
    event_type: "email.delivered",
    status: "failed",
    attempt_count: 8,
    next_attempt_at: null,
    last_status_code: 500,
    last_error: "HTTP 500",
    payload: { id: "evt_123", object: "event", type: "email.delivered" },
    attempts: [],
    created_at: "2026-01-15T09:30:00.000Z",
    updated_at: "2026-01-15T09:30:00.000Z",
  };

  test("list sends the filters as query parameters", async () => {
    const { coss, calls } = client(json(200, { object: "list", data: [delivery], has_more: true }));

    const result = await coss.webhookEndpoints.deliveries.list(sampleEndpoint.id, {
      status: "failed",
      limit: 10,
      after: "whdel_100",
    });

    expect(result.data?.data).toEqual([delivery]);
    const url = new URL(calls[0]?.url ?? "");
    expect(url.pathname).toBe(`/v1/webhook_endpoints/${sampleEndpoint.id}/deliveries`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: "failed",
      limit: "10",
      after: "whdel_100",
    });
  });

  test("get and retry hit the documented routes", async () => {
    const { coss, calls } = client(json(200, delivery));

    await coss.webhookEndpoints.deliveries.get(sampleEndpoint.id, delivery.id);
    const retried = await coss.webhookEndpoints.deliveries.retry(sampleEndpoint.id, delivery.id);

    expect(retried.data?.id).toBe(delivery.id);
    expect(calls.map((call) => `${call.method} ${new URL(call.url).pathname}`)).toEqual([
      `GET /v1/webhook_endpoints/${sampleEndpoint.id}/deliveries/${delivery.id}`,
      `POST /v1/webhook_endpoints/${sampleEndpoint.id}/deliveries/${delivery.id}/retry`,
    ]);
  });

  test("a lost replay response is not automatically retried, even with an idempotency key", async () => {
    const { coss, calls } = client(
      () => {
        throw new TypeError("Response lost after replay was queued");
      },
      json(200, delivery),
    );

    const result = await coss.webhookEndpoints.deliveries.retry(sampleEndpoint.id, delivery.id, {
      idempotencyKey: "replay-once",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.get("idempotency-key")).toBe("replay-once");
    expect(result.data).toBeNull();
    expect(result.error?.type).toBe("connection_error");
  });

  test("a replay server error is returned without automatically retrying", async () => {
    const { coss, calls } = client(
      apiError(503, { type: "internal_error", code: "unavailable" }, { "Retry-After": "0" }),
      json(200, delivery),
    );

    const result = await coss.webhookEndpoints.deliveries.retry(sampleEndpoint.id, delivery.id);

    expect(calls).toHaveLength(1);
    expect(result.data).toBeNull();
    expect(result.error?.status).toBe(503);
  });
});
