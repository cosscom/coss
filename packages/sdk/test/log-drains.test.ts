import { describe, expect, test } from "bun:test";
import {
  Coss,
  type LogDrain,
  type LogDrainBatch,
  verifyLogDrainBatch,
  WebhookVerificationError,
} from "../src/index.ts";
import { json, mockFetch } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

function client(...handlers: Parameters<typeof mockFetch>) {
  const { fetch, calls } = mockFetch(...handlers);
  return { coss: new Coss({ apiKey: API_KEY, baseUrl: "https://api.test", fetch }), calls };
}

const drain: LogDrain = {
  object: "log_drain",
  id: "drain_01k7c8m4q2f3e9v6t5r1n0p8yz",
  url: "https://logs.example.com/coss",
  description: null,
  sources: ["api"],
  enabled: true,
  disabled_reason: null,
  disabled_at: null,
  created_at: "2026-01-15T09:30:00.000Z",
  updated_at: "2026-01-15T09:30:00.000Z",
};

const batch: LogDrainBatch = {
  object: "log_drain_batch",
  id: "drainbat_01k7c8n2b5d7f9h1k3m5p7r9tv",
  drain_id: drain.id,
  status: "succeeded",
  line_count: 1,
  byte_size: 100,
  attempt_count: 1,
  next_attempt_at: null,
  last_status_code: 200,
  last_error: null,
  attempts: [],
  created_at: "2026-01-15T09:30:00.000Z",
  updated_at: "2026-01-15T09:30:01.000Z",
};

describe("coss.logDrains", () => {
  test("create posts once, never retried, and returns the secret", async () => {
    const { coss, calls } = client(json(503, {}), json(200, { ...drain, secret: "whsec_abc" }));

    const failed = await coss.logDrains.create({ url: drain.url, sources: ["api"] });
    expect(failed.error).toMatchObject({ status: 503 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "POST", url: "https://api.test/v1/log_drains" });
    expect(JSON.parse(calls[0]?.body ?? "null")).toEqual({ url: drain.url, sources: ["api"] });

    const result = await coss.logDrains.create({ url: drain.url });
    expect(result.data?.secret).toBe("whsec_abc");
  });

  test("list, get, update, delete and batches hit the documented routes", async () => {
    const { coss, calls } = client(json(200, { object: "list", data: [drain], has_more: false }));

    const list = await coss.logDrains.list();
    await coss.logDrains.get(drain.id);
    await coss.logDrains.update(drain.id, { enabled: false });
    await coss.logDrains.delete(drain.id);
    await coss.logDrains.batches.list(drain.id, { status: "failed", limit: 10 });
    await coss.logDrains.batches.get(drain.id, batch.id);

    expect(list.data?.data).toEqual([drain]);
    expect(calls.map((call) => `${call.method} ${new URL(call.url).pathname}`)).toEqual([
      "GET /v1/log_drains",
      `GET /v1/log_drains/${drain.id}`,
      `PATCH /v1/log_drains/${drain.id}`,
      `DELETE /v1/log_drains/${drain.id}`,
      `GET /v1/log_drains/${drain.id}/batches`,
      `GET /v1/log_drains/${drain.id}/batches/${batch.id}`,
    ]);
    expect(JSON.parse(calls[2]?.body ?? "null")).toEqual({ enabled: false });
    expect(new URL(calls[4]?.url ?? "").search).toBe("?status=failed&limit=10");
  });
});

/** Signs like the worker: Standard Webhooks over the raw NDJSON body. */
async function sign(secret: string, id: string, timestamp: number, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(secret.slice("whsec_".length)), (char) => char.charCodeAt(0)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  );
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(mac)))}`;
}

describe("verifyLogDrainBatch", () => {
  const secret = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
  const timestamp = 1_760_000_000;
  const now = new Date(timestamp * 1000);
  const body =
    '{"object":"log","id":"log_1","type":"api.request"}\n' +
    '{"object":"audit_event","id":"oaudit_1","action":"log_drain.created"}\n';

  test("returns every line of a valid batch", async () => {
    const headers = {
      "webhook-id": batch.id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": await sign(secret, batch.id, timestamp, body),
    };
    const lines = await verifyLogDrainBatch(body, headers, secret, { now });
    expect(lines.map((line) => line.id)).toEqual(["log_1", "oaudit_1"]);
    expect(lines[1]?.object).toBe("audit_event");
  });

  test("rejects a tampered body, a stale timestamp or invalid NDJSON", async () => {
    const headers = {
      "webhook-id": batch.id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": await sign(secret, batch.id, timestamp, body),
    };
    const reject = (promise: Promise<unknown>) =>
      promise.then(
        () => null,
        (error: unknown) => error,
      );
    const tampered = await reject(verifyLogDrainBatch(`${body} `, headers, secret, { now }));
    expect(tampered).toBeInstanceOf(WebhookVerificationError);
    const stale = await reject(
      verifyLogDrainBatch(body, headers, secret, { now: new Date(now.getTime() + 3600_000) }),
    );
    expect((stale as Error).message).toContain("too old");

    const broken = "not json\n";
    const brokenHeaders = {
      ...headers,
      "webhook-signature": await sign(secret, batch.id, timestamp, broken),
    };
    const invalid = await reject(verifyLogDrainBatch(broken, brokenHeaders, secret, { now }));
    expect((invalid as Error).message).toBe("The log drain body is not valid NDJSON.");
  });
});
