/** The webhook events resource (test events) and the event type lists. */
import { describe, expect, test } from "bun:test";
import {
  Coss,
  isLiveOnlyEventType,
  TEST_WEBHOOK_EVENT_TYPES,
  WEBHOOK_EVENT_TYPES,
  type WebhookTestEvent,
} from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

const answer: WebhookTestEvent = {
  object: "webhook_test_event",
  event: {
    id: "evt_01k7c8n1z4c6e8g0j2l4n6q8sa",
    object: "event",
    type: "contact.created",
    api_version: "2026-10-10",
    created_at: "2026-10-19T12:00:00.000Z",
    data: {
      contact: { id: "contact_1", email: "ada@example.com", status: "subscribed" },
      source: "api",
      topic: null,
      occurred_at: "2026-10-19T12:00:00.000Z",
    },
  },
  endpoints: 1,
  listeners: 0,
};

describe("coss.webhookEvents.test", () => {
  test("posts the type and data, and is never retried", async () => {
    const { fetch, calls } = mockFetch(json(200, answer));
    const coss = new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch, maxRetries: 2 });
    const { data, error } = await coss.webhookEvents.test({
      type: "contact.created",
      data: { contact: { email: "ada@example.com" } },
    });
    expect(error).toBeNull();
    expect(data).toEqual(answer);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.url).toBe("https://api.test/v1/webhook_events/test");
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      type: "contact.created",
      data: { contact: { email: "ada@example.com" } },
    });

    const failing = mockFetch(
      apiError(503, { type: "api_error", code: "service_unavailable" }, { "Retry-After": "0" }),
    );
    const retried = new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", ...failing });
    expect((await retried.webhookEvents.test({ type: "email.bounced" })).error?.status).toBe(503);
    expect(failing.calls).toHaveLength(1);
  });

  test("event type lists: every type once; test types leave out the live-only ones", () => {
    expect(new Set(WEBHOOK_EVENT_TYPES).size).toBe(WEBHOOK_EVENT_TYPES.length);
    expect(TEST_WEBHOOK_EVENT_TYPES).toContain("email.bounced");
    expect(TEST_WEBHOOK_EVENT_TYPES).toContain("hook_endpoint.disabled");
    for (const type of [
      "domain.dmarc_report_received",
      "account.suspended",
      "billing.invoice_paid",
    ]) {
      expect(isLiveOnlyEventType(type)).toBe(true);
      expect(TEST_WEBHOOK_EVENT_TYPES).not.toContain(type);
    }
  });
});
