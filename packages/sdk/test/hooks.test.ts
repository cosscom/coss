/** `coss.hooks`: request shapes and retry behavior. */
import { describe, expect, test } from "bun:test";
import { Coss, type HookMessage } from "../src/index.ts";
import { json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch }), calls };
}

const message: HookMessage = {
  object: "hook_message",
  id: "hmsg_01k7c8m4q2f3e9v6t5r1n0p8yz",
  application_id: "happ_01k7c8m4q2f3e9v6t5r1n0p8yz",
  event_type: "invoice.paid",
  payload: { amount: 1 },
  created_at: "2026-10-14T12:00:00.000Z",
};

describe("coss.hooks", () => {
  test("messages.send posts to the application's path (uid encoded) and retries with one key", async () => {
    const { coss, calls } = client(json(503, {}), json(202, message));

    const result = await coss.hooks.messages.send({
      application: "customer/1",
      event_type: "invoice.paid",
      payload: { amount: 1 },
    });

    expect(result).toEqual({ data: message, error: null });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "https://api.test/v1/hooks/applications/customer%2F1/messages",
    });
    expect(JSON.parse(calls[0]?.body ?? "null")).toEqual({
      event_type: "invoice.paid",
      payload: { amount: 1 },
    });
    expect(calls[1]?.headers.get("idempotency-key")).toBe(
      calls[0]?.headers.get("idempotency-key") ?? "missing",
    );
  });

  test("portal.createSession sends everything but the application in the body", async () => {
    const { coss, calls } = client(json(200, {}));
    await coss.hooks.portal.createSession({ application: "customer_1", read_only: true });
    expect(calls[0]?.url).toBe("https://api.test/v1/hooks/applications/customer_1/portal_sessions");
    expect(JSON.parse(calls[0]?.body ?? "null")).toEqual({ read_only: true });
  });

  test("creates that the API does not deduplicate are never retried", async () => {
    const { coss, calls } = client(json(503, {}));
    await coss.hooks.applications.create({ name: "Acme" });
    await coss.hooks.eventTypes.create({ name: "invoice.paid" });
    await coss.hooks.endpoints.create("customer_1", { url: "https://example.com/hook" });
    await coss.hooks.endpoints.sendTest("customer_1", "hep_1", { event_type: "invoice.paid" });
    await coss.hooks.deliveries.retry("customer_1", "hdel_1");
    expect(calls).toHaveLength(5);
  });

  test("list filters become query parameters; reads hit the documented routes", async () => {
    const { coss, calls } = client(json(200, { object: "list", data: [], has_more: false }));
    await coss.hooks.eventTypes.list({ include_archived: true, limit: 10 });
    await coss.hooks.messages.list("customer_1", { event_type: "invoice.paid", after: "hmsg_1" });
    await coss.hooks.endpoints.listDeliveries("customer_1", "hep_1", { status: "failed" });
    await coss.hooks.endpoints.recover("customer_1", "hep_1", {
      since: new Date("2026-10-14T00:00:00.000Z"),
    });
    await coss.hooks.deliveries.listAttempts("customer_1", "hdel_1");
    expect(
      calls.map((call) => `${call.method} ${call.url.replace("https://api.test", "")}`),
    ).toEqual([
      "GET /v1/hooks/event_types?include_archived=true&limit=10",
      "GET /v1/hooks/applications/customer_1/messages?event_type=invoice.paid&after=hmsg_1",
      "GET /v1/hooks/applications/customer_1/endpoints/hep_1/deliveries?status=failed",
      "POST /v1/hooks/applications/customer_1/endpoints/hep_1/recover",
      "GET /v1/hooks/applications/customer_1/deliveries/hdel_1/attempts",
    ]);
    expect(JSON.parse(calls[3]?.body ?? "null")).toEqual({ since: "2026-10-14T00:00:00.000Z" });
  });
});
