import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { apiError, fakeFetch, SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY };
const APP = "/v1/hooks/applications/acme";

function list(data: unknown[], has_more = false) {
  return { object: "list", data, has_more };
}

function delivery(id: string, endpoint: string, created: string, status = "succeeded") {
  return {
    object: "hook_delivery",
    id,
    application_id: "happ_1",
    message_id: "hmsg_1",
    endpoint_id: endpoint,
    status,
    attempt_count: 1,
    next_attempt_at: null,
    last_status_code: status === "failed" ? 500 : 200,
    last_error: null,
    created_at: created,
    finished_at: created,
  };
}

describe("coss hooks", () => {
  test("apps list and create", async () => {
    const app = {
      object: "hook_application",
      id: "happ_1",
      uid: "acme",
      name: "Acme",
      metadata: {},
      created_at: "2026-10-15T12:00:00.000Z",
      updated_at: "2026-10-15T12:00:00.000Z",
    };
    const api = fakeFetch({
      "GET /v1/hooks/applications": list([app], true),
      "POST /v1/hooks/applications": app,
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "apps", "list", "--limit", "10"], io)).toBe(0);
    expect(io.output()).toContain("ID      UID   NAME  CREATED");
    expect(io.output()).toContain("happ_1  acme  Acme  2026-10-15 12:00");
    expect(io.errors()).toContain("--paginate");
    expect(api.requests[0]?.url.searchParams.get("limit")).toBe("10");

    const json = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "apps", "list", "--json"], json)).toBe(0);
    expect(JSON.parse(json.output())).toEqual(app);

    const created = testIo({ fetch: api.fetch, env });
    expect(
      await run(
        ["hooks", "apps", "create", "Acme", "--uid", "acme", "--metadata", "plan=pro"],
        created,
      ),
    ).toBe(0);
    expect(api.requests.at(-1)?.body).toEqual({
      name: "Acme",
      uid: "acme",
      metadata: { plan: "pro" },
    });
    expect(created.output()).toContain("Created Acme happ_1 (uid acme)");
    expect(await run(["hooks", "apps", "create"], testIo({ env }))).toBe(2);
  });

  test("event-types create takes examples and a schema inline or from files", async () => {
    const api = fakeFetch({
      "POST /v1/hooks/event_types": { object: "hook_event_type", name: "invoice.paid" },
    });
    const io = testIo({ fetch: api.fetch, env });
    const example = join(io.configDir, "example.json");
    await writeFile(example, JSON.stringify({ invoice_id: "in_2" }));
    const code = await run(
      [
        "hooks",
        "event-types",
        "create",
        "invoice.paid",
        "--description",
        "An invoice was paid.",
        "--schema",
        '{"type":"object"}',
        "--example",
        '{"invoice_id":"in_1"}',
        "--example",
        `@${example}`,
      ],
      io,
    );
    expect(code).toBe(0);
    expect(api.requests[0]?.body).toEqual({
      name: "invoice.paid",
      description: "An invoice was paid.",
      schema: { type: "object" },
      examples: [{ invoice_id: "in_1" }, { invoice_id: "in_2" }],
    });
    const bad = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "event-types", "create", "x", "--example", "[1]"], bad)).toBe(2);
    expect(bad.errors()).toContain("--example takes a JSON object");
  });

  test("endpoints add prints the signing secret; list shows each one's state", async () => {
    const endpoint = {
      object: "hook_endpoint",
      id: "hep_1",
      application_id: "happ_1",
      url: "https://example.com/hooks",
      filter_types: ["invoice.paid", "invoice.voided"],
      enabled: true,
      disabled_reason: null,
      failing_since: null,
    };
    const api = fakeFetch({
      [`POST ${APP}/endpoints`]: { ...endpoint, secret: "whsec_abc" },
      [`GET ${APP}/endpoints`]: list([
        endpoint,
        { ...endpoint, id: "hep_2", filter_types: [], enabled: false, disabled_reason: "failing" },
      ]),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(
      await run(
        [
          "hooks",
          "endpoints",
          "add",
          "acme",
          "--url",
          "https://example.com/hooks",
          "--types",
          "invoice.paid,invoice.voided",
          "--rate-limit",
          "5",
        ],
        io,
      ),
    ).toBe(0);
    expect(api.requests[0]?.body).toEqual({
      url: "https://example.com/hooks",
      filter_types: ["invoice.paid", "invoice.voided"],
      rate_limit_per_second: 5,
    });
    expect(io.output()).toContain("Signing secret: whsec_abc");

    const listed = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "endpoints", "list", "acme"], listed)).toBe(0);
    expect(listed.output()).toContain("invoice.paid,invoice.voided  enabled");
    expect(listed.output()).toContain("all                          disabled (failing)");
    expect(await run(["hooks", "endpoints", "add", "acme"], testIo({ env }))).toBe(2);
  });

  test("send: fields build the payload; without one, the type's first example", async () => {
    const message = (payload: unknown) => ({
      object: "hook_message",
      id: "hmsg_1",
      application_id: "happ_1",
      event_type: "invoice.paid",
      payload,
      created_at: "2026-10-15T12:00:00.000Z",
    });
    const api = fakeFetch({
      [`POST ${APP}/messages`]: (request: { body: unknown }) =>
        message((request.body as { payload: unknown }).payload),
      "GET /v1/hooks/event_types/invoice.paid": {
        object: "hook_event_type",
        name: "invoice.paid",
        examples: [{ invoice_id: "in_example" }],
      },
      "GET /v1/hooks/event_types/empty": { object: "hook_event_type", name: "empty", examples: [] },
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(
      await run(
        [
          "hooks",
          "send",
          "acme",
          "invoice.paid",
          "--data",
          '{"invoice_id":"in_1","amount":1}',
          "-F",
          "amount=4200",
          "-f",
          "currency=usd",
          "--idempotency-key",
          "pay-in_1",
        ],
        io,
      ),
    ).toBe(0);
    expect(api.requests[0]?.body).toEqual({
      event_type: "invoice.paid",
      payload: { invoice_id: "in_1", amount: 4200, currency: "usd" },
    });
    expect(api.requests[0]?.headers.get("idempotency-key")).toBe("pay-in_1");
    expect(io.output()).toContain("Sent hmsg_1 (invoice.paid) to acme");
    expect(io.errors()).toContain("coss hooks deliveries acme --message hmsg_1");

    const example = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "send", "acme", "invoice.paid"], example)).toBe(0);
    expect(api.requests.at(-1)?.body).toEqual({
      event_type: "invoice.paid",
      payload: { invoice_id: "in_example" },
    });

    const none = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "send", "acme", "empty"], none)).toBe(2);
    expect(none.errors()).toContain("has no example");
  });

  test("deliveries: every endpoint's newest first, or one endpoint's or message's", async () => {
    const api = fakeFetch({
      [`GET ${APP}/endpoints`]: list([{ id: "hep_1" }, { id: "hep_2" }]),
      [`GET ${APP}/endpoints/hep_1/deliveries`]: list([
        delivery("hdlv_1", "hep_1", "2026-10-15T10:00:00.000Z"),
      ]),
      [`GET ${APP}/endpoints/hep_2/deliveries`]: list([
        delivery("hdlv_2", "hep_2", "2026-10-15T11:00:00.000Z", "failed"),
      ]),
      [`GET ${APP}/messages/hmsg_1/deliveries`]: list([
        delivery("hdlv_1", "hep_1", "2026-10-15T10:00:00.000Z"),
        delivery("hdlv_2", "hep_2", "2026-10-15T11:00:00.000Z", "failed"),
      ]),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "deliveries", "acme", "--json"], io)).toBe(0);
    expect(
      io
        .output()
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line).id),
    ).toEqual(["hdlv_2", "hdlv_1"]);

    const failed = testIo({ fetch: api.fetch, env });
    expect(
      await run(
        ["hooks", "deliveries", "acme", "--message", "hmsg_1", "--status", "failed"],
        failed,
      ),
    ).toBe(0);
    expect(failed.output()).toContain("hdlv_2  failed");
    expect(failed.output()).not.toContain("hdlv_1");

    const endpoint = testIo({ fetch: api.fetch, env });
    expect(
      await run(
        ["hooks", "deliveries", "acme", "--endpoint", "hep_1", "--status", "succeeded"],
        endpoint,
      ),
    ).toBe(0);
    expect(api.requests.at(-1)?.url.searchParams.get("status")).toBe("succeeded");

    const both = testIo({ env });
    expect(
      await run(
        ["hooks", "deliveries", "acme", "--endpoint", "hep_1", "--message", "hmsg_1"],
        both,
      ),
    ).toBe(2);
    const status = testIo({ env });
    expect(await run(["hooks", "deliveries", "acme", "--status", "nope"], status)).toBe(2);
  });

  test("attempts, retry and portal", async () => {
    const api = fakeFetch({
      [`GET ${APP}/deliveries/hdlv_1`]: delivery(
        "hdlv_1",
        "hep_1",
        "2026-10-15T10:00:00.000Z",
        "failed",
      ),
      [`GET ${APP}/deliveries/hdlv_1/attempts`]: list([
        {
          object: "hook_attempt",
          id: "hatt_1",
          delivery_id: "hdlv_1",
          endpoint_id: "hep_1",
          attempted_at: "2026-10-15T10:00:01.000Z",
          status_code: 500,
          duration_ms: 31,
          error: null,
          // A receiver's escape sequence (OSC 52 writes the clipboard) never reaches the terminal.
          response_excerpt: "Internal\nerror\u001b]52;c;aGk=\u0007",
        },
      ]),
      [`POST ${APP}/deliveries/hdlv_1/retry`]: delivery(
        "hdlv_1",
        "hep_1",
        "2026-10-15T10:00:00.000Z",
        "pending",
      ),
      [`POST ${APP}/portal_sessions`]: {
        object: "hook_portal_session",
        id: "hps_1",
        application_id: "happ_1",
        url: "https://portal.test/s/hps_1#cossp_secret",
        token: "cossp_secret",
        read_only: true,
        expires_at: "2026-10-15T13:00:00.000Z",
      },
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "attempts", "acme", "hdlv_1"], io)).toBe(0);
    expect(io.output()).toContain("hdlv_1 failed → hep_1");
    expect(io.output()).toContain("500     31ms      Internal error");
    expect(io.output()).not.toContain("\u001b");
    expect(io.output()).not.toContain("\u0007");

    const retried = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "retry", "acme", "hdlv_1"], retried)).toBe(0);
    expect(retried.output()).toContain("Queued hdlv_1 for another attempt");

    const opened: string[] = [];
    const portal = testIo({
      fetch: api.fetch,
      env,
      openBrowser: async (url) => {
        opened.push(url);
        return true;
      },
    });
    expect(
      await run(
        ["hooks", "portal", "acme", "--read-only", "--expires-in", "600", "--open"],
        portal,
      ),
    ).toBe(0);
    expect(api.requests.at(-1)?.body).toEqual({ read_only: true, expires_in: 600 });
    expect(portal.output()).toBe("https://portal.test/s/hps_1#cossp_secret\n");
    expect(opened).toEqual(["https://portal.test/s/hps_1#cossp_secret"]);
    expect(await run(["hooks", "portal", "acme", "--expires-in", "5"], testIo({ env }))).toBe(2);
  });

  test("API errors name what failed", async () => {
    const api = fakeFetch({
      "GET /v1/hooks/applications/nope/endpoints": () =>
        apiError(404, "not_found_error", "not_found", "No such application."),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["hooks", "endpoints", "list", "nope"], io)).toBe(1);
    expect(io.errors()).toContain("Couldn't list the endpoints: No such application.");
  });
});
