import { describe, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { apiError, fakeFetch, SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY };

const endpoint = {
  object: "webhook_endpoint",
  id: "whep_1",
  url: "https://example.com/hooks",
  description: "Production receiver",
  event_types: ["email.delivered", "email.bounced"],
  api_version: "2026-10-10",
  enabled: true,
  disabled_reason: null,
  disabled_at: null,
  failing_since: null,
  previous_secret_expires_at: null,
  created_at: "2026-10-01T09:00:00.000Z",
  updated_at: "2026-10-01T09:00:00.000Z",
};

function delivery(status: string, overrides: Record<string, unknown> = {}) {
  return {
    object: "webhook_delivery",
    id: "whdel_1",
    endpoint_id: "whep_1",
    event_id: "evt_1",
    event_type: "email.bounced",
    status,
    attempt_count: 3,
    next_attempt_at: null,
    last_status_code: 500,
    last_error: "HTTP 500",
    payload: {},
    attempts: [],
    created_at: "2026-10-15T11:00:00.000Z",
    updated_at: "2026-10-15T11:05:00.000Z",
    ...overrides,
  };
}

describe("coss webhooks", () => {
  test("list shows each endpoint's URL, state and event types", async () => {
    const failing = {
      ...endpoint,
      id: "whep_2",
      event_types: [],
      failing_since: "2026-10-14T08:00:00.000Z",
    };
    const disabled = { ...endpoint, id: "whep_3", enabled: false, disabled_reason: "failing" };
    const api = fakeFetch({
      "GET /v1/webhook_endpoints": {
        object: "list",
        data: [endpoint, failing, disabled],
        has_more: false,
      },
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["webhooks", "list"], io)).toBe(0);
    expect(io.output()).toContain("whep_1  https://example.com/hooks  enabled");
    expect(io.output()).toContain("email.delivered, email.bounced  · Production receiver");
    expect(io.output()).toContain(
      "whep_2  https://example.com/hooks  failing since 2026-10-14 08:00",
    );
    expect(io.output()).toContain("every event");
    expect(io.output()).toContain("whep_3  https://example.com/hooks  disabled (failing)");

    const json = testIo({ fetch: api.fetch, env });
    expect(await run(["webhooks", "list", "--json"], json)).toBe(0);
    expect(
      json
        .output()
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line).id),
    ).toEqual(["whep_1", "whep_2", "whep_3"]);
  });

  test("deliveries lists an endpoint's deliveries, filtered", async () => {
    const api = fakeFetch({
      "GET /v1/webhook_endpoints/whep_1/deliveries": {
        object: "list",
        data: [delivery("failed")],
        has_more: true,
      },
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(
      await run(["webhooks", "deliveries", "whep_1", "--status", "failed", "--event", "evt_1"], io),
    ).toBe(0);
    expect([...(api.requests[0]?.url.searchParams ?? [])]).toEqual([
      ["limit", "20"],
      ["status", "failed"],
      ["event_id", "evt_1"],
    ]);
    expect(io.output()).toContain(
      "2026-10-15 11:00:00  whdel_1  email.bounced  failed [500]  3 attempts HTTP 500",
    );
    expect(io.errors()).toContain("--paginate");

    for (const [argv, message] of [
      [["webhooks", "deliveries"], "Pass one endpoint id"],
      [["webhooks", "deliveries", "whep_1", "--status", "lost"], "--status takes"],
      [["webhooks", "deliveries", "whep_1", "--limit", "500"], "--limit takes"],
    ] as const) {
      const bad = testIo({ env });
      expect(await run([...argv], bad)).toBe(2);
      expect(bad.errors()).toContain(message);
    }
  });

  test("retry queues one more attempt", async () => {
    const api = fakeFetch({
      "POST /v1/webhook_endpoints/whep_1/deliveries/whdel_1/retry": delivery("pending", {
        next_attempt_at: "2026-10-15T12:00:05.000Z",
      }),
      "POST /v1/webhook_endpoints/whep_1/deliveries/whdel_x/retry": () =>
        apiError(404, "not_found_error", "not_found", "No such delivery."),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["webhooks", "retry", "whep_1", "whdel_1"], io)).toBe(0);
    expect(io.output()).toContain("whdel_1 pending, next attempt 2026-10-15T12:00:05.000Z");

    const missing = testIo({ fetch: api.fetch, env });
    expect(await run(["webhooks", "retry", "whep_1", "whdel_x"], missing)).toBe(1);
    expect(missing.errors()).toContain("Couldn't retry the delivery: No such delivery.");
    expect(await run(["webhooks", "retry", "whep_1"], testIo({ env }))).toBe(2);
  });
});
