/** The webhook listeners resource: request shape, retries, and how results come back. */
import { describe, expect, test } from "bun:test";
import { Coss, type WebhookListener, type WebhookListenerPoll } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

const listener: WebhookListener = {
  object: "webhook_listener",
  id: "whlis_01k7c8m4q2f3e9v6t5r1n0p8yz",
  api_version: "2026-10-01",
  event_types: [],
  description: "laptop → localhost:3000",
  expires_at: "2026-01-15T09:40:00.000Z",
  created_at: "2026-01-15T09:30:00.000Z",
};

const answer: WebhookListenerPoll = {
  object: "webhook_listener_poll",
  listener,
  deliveries: [
    {
      object: "webhook_listener_delivery",
      id: "whlisdel_01k7c8n2b5d7f9h1k3m5p7r9tv",
      ack_token: "mfz3k2a8",
      event_id: "evt_01k7c8n1z4c6e8g0j2l4n6q8sa",
      event_type: "email.delivered",
      attempt: 1,
      body: '{"id":"evt_01k7c8n1z4c6e8g0j2l4n6q8sa"}',
      created_at: "2026-01-15T09:30:00.000Z",
    },
  ],
  acknowledged: 0,
};

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return {
    coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch, maxRetries: 2 }),
    calls,
  };
}

describe("coss.webhookListeners", () => {
  test("create, poll and delete", async () => {
    const { coss, calls } = client(
      json(200, listener),
      json(200, answer),
      json(200, { object: "webhook_listener", id: listener.id, deleted: true }),
    );
    expect(await coss.webhookListeners.create({ event_types: ["email.delivered"] })).toEqual({
      data: listener,
      error: null,
    });
    const controller = new AbortController();
    const acks = [
      {
        delivery_id: "whlisdel_x",
        ack_token: "abc",
        status_code: 200,
        duration_ms: 5,
        error: null,
      },
    ];
    expect(
      await coss.webhookListeners.poll(
        listener.id,
        { acks, wait_ms: 20_000 },
        {
          signal: controller.signal,
        },
      ),
    ).toEqual({ data: answer, error: null });
    expect((await coss.webhookListeners.delete(listener.id)).data?.deleted).toBe(true);

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      "POST https://api.test/v1/webhook_listeners",
      `POST https://api.test/v1/webhook_listeners/${listener.id}/poll`,
      `DELETE https://api.test/v1/webhook_listeners/${listener.id}`,
    ]);
    expect(JSON.parse(calls[0]?.body ?? "")).toEqual({ event_types: ["email.delivered"] });
    expect(JSON.parse(calls[1]?.body ?? "")).toEqual({ acks, wait_ms: 20_000 });
    expect(calls[1]?.signal).not.toBeNull();
  });

  test("create and poll are never retried automatically", async () => {
    const { coss, calls } = client(apiError(503, { type: "api_error", code: "unavailable" }));
    expect((await coss.webhookListeners.create()).error).toMatchObject({ status: 503 });
    expect((await coss.webhookListeners.poll(listener.id)).error).toMatchObject({ status: 503 });
    expect(calls).toHaveLength(2);
  });
});
