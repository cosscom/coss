/** `coss.inboxes`: request shape, idempotency and retries. */
import { describe, expect, test } from "bun:test";
import { Coss, type Inbox } from "../src/index.ts";
import { apiError, json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

function client(maxRetries: number, ...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return {
    coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch, maxRetries }),
    calls,
  };
}

const inbox: Inbox = {
  object: "inbox",
  id: "inbox_01k5f9yq8re8vb6q2wmz0tb2xd",
  address: "agent@abc.inbound.coss.com",
  username: "agent",
  domain: "abc.inbound.coss.com",
  kind: "managed",
  display_name: null,
  client_id: null,
  can_send: true,
  sandbox: true,
  created_at: "2026-10-09T12:00:00.000Z",
  updated_at: "2026-10-09T12:00:00.000Z",
};

function route(call: { method: string; url: string }) {
  const url = new URL(call.url);
  return `${call.method} ${url.pathname}${url.search}`;
}

describe("coss.inboxes", () => {
  test("every method hits its documented route", async () => {
    const { coss, calls } = client(0, json(200, inbox));
    const id = inbox.id;
    await coss.inboxes.create({ username: "agent" });
    await coss.inboxes.list({ limit: 5, after: "inbox_x" });
    await coss.inboxes.get(id);
    await coss.inboxes.update(id, { display_name: null });
    await coss.inboxes.delete(id);
    await coss.inboxes.threads.list(id, { limit: 2 });
    await coss.inboxes.threads.get(id, "thread_1");
    await coss.inboxes.threads.delete(id, "thread_1");
    await coss.inboxes.messages.list(id, { direction: "inbound" });
    await coss.inboxes.messages.get(id, "imsg_1");
    await coss.inboxes.messages.send(id, { to: "jane@example.com", subject: "Hi", text: "Hi" });
    await coss.inboxes.messages.reply(id, "imsg_1", { text: "Thanks", reply_all: true });
    await coss.inboxes.messages.getAttachment(id, "imsg_1", "rcvdatt_1");
    expect(calls.map(route)).toEqual([
      "POST /v1/inboxes",
      "GET /v1/inboxes?limit=5&after=inbox_x",
      `GET /v1/inboxes/${id}`,
      `PATCH /v1/inboxes/${id}`,
      `DELETE /v1/inboxes/${id}`,
      `GET /v1/inboxes/${id}/threads?limit=2`,
      `GET /v1/inboxes/${id}/threads/thread_1`,
      `DELETE /v1/inboxes/${id}/threads/thread_1`,
      `GET /v1/inboxes/${id}/messages?direction=inbound`,
      `GET /v1/inboxes/${id}/messages/imsg_1`,
      `POST /v1/inboxes/${id}/messages`,
      `POST /v1/inboxes/${id}/messages/imsg_1/reply`,
      `GET /v1/inboxes/${id}/messages/imsg_1/attachments/rcvdatt_1`,
    ]);
    expect(JSON.parse(calls[11]?.body ?? "")).toEqual({ text: "Thanks", reply_all: true });
  });

  test("sends and replies reuse one Idempotency-Key across retries", async () => {
    const { coss, calls } = client(
      1,
      apiError(503, { type: "api_error", code: "unavailable" }),
      json(202, { object: "inbox_message" }),
    );
    await coss.inboxes.messages.reply(inbox.id, "imsg_1", { text: "Hi" });
    expect(calls).toHaveLength(2);
    const keys = calls.map((call) => call.headers.get("idempotency-key"));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  test("create retries only with a client_id", async () => {
    const failing = () => apiError(503, { type: "api_error", code: "unavailable" });
    const once = client(2, failing(), json(201, inbox));
    const result = await once.coss.inboxes.create({ username: "agent" });
    expect(result.error?.status).toBe(503);
    expect(once.calls).toHaveLength(1);
    const retried = client(2, failing(), json(200, inbox));
    expect((await retried.coss.inboxes.create({ client_id: "agent-1" })).data).toEqual(inbox);
    expect(retried.calls).toHaveLength(2);
  });
});
