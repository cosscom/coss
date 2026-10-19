import { describe, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { SIMULATED_SMS_OUTCOMES } from "../src/sms/simulate.ts";
import { fakeFetch, LIVE_KEY, SANDBOX_KEY, testIo } from "./helpers.ts";

function sms(status: string, overrides: Record<string, unknown> = {}) {
  return {
    object: "sms",
    id: "sms_1",
    from: "+14155550100",
    to: "+15005550004",
    body: "Test message from the coss.com CLI",
    status,
    failure: null,
    sandbox: true,
    created_at: "2026-10-15T12:00:00.000Z",
    ...overrides,
  };
}

const event = (type: string, data: object = {}) => ({
  object: "sms_event",
  id: `smsevt_${type}`,
  sms_id: "sms_1",
  type,
  occurred_at: "2026-10-15T12:00:01.000Z",
  data,
});

describe("coss sms send", () => {
  test("the simulator numbers match the SMS product's", () => {
    // packages/sms/src/schemas.ts `SMS_SIMULATOR` (the CLI can't import it).
    expect(SIMULATED_SMS_OUTCOMES).toEqual({
      delivered: "+15005550006",
      invalid: "+15005550001",
      filtered: "+15005550004",
      "opted-out": "+15005550009",
      reply: "+15005550008",
    });
  });

  test("sends a default test message, or what the flags say", async () => {
    const api = fakeFetch({ "POST /v1/sms": sms("queued", { to: "+15005550006" }) });
    const io = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["sms", "send", "--simulate", "delivered"], io)).toBe(0);
    expect(api.requests[0]?.body).toEqual({
      from: "+14155550100",
      to: "+15005550006",
      body: "Test message from the coss.com CLI",
    });
    expect(io.output()).toContain("sms_1 queued → +15005550006");

    const full = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(
      await run(
        [
          "sms",
          "send",
          "--to",
          "+14155550199",
          "--from",
          "+14155550123",
          "--body",
          "Hi",
          "--tag",
          "run=1",
          "--json",
        ],
        full,
      ),
    ).toBe(0);
    expect(api.requests[1]?.body).toEqual({
      from: "+14155550123",
      to: "+14155550199",
      body: "Hi",
      tags: [{ name: "run", value: "1" }],
    });
    expect(JSON.parse(full.output())).toMatchObject({ id: "sms_1", status: "queued" });
  });

  test("refuses what can't work", async () => {
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["sms", "send"], io)).toBe(2);
    expect(await run(["sms", "send", "--simulate", "exploded"], io)).toBe(2);
    expect(await run(["sms", "send", "--simulate", "reply", "--to", "+14155550199"], io)).toBe(2);
    expect(await run(["sms", "send", "--to", "+14155550199", "--tag", "x"], io)).toBe(2);
    expect(await run(["sms", "send", "--to", "+14155550199", "--nope"], io)).toBe(2);
    expect(await run(["sms", "nope"], io)).toBe(2);
    expect(io.errors()).toContain("`coss sms send`");
    const live = testIo({ env: { COSS_API_KEY: LIVE_KEY } });
    expect(await run(["sms", "send", "--to", "+14155550199"], live)).toBe(2);
    expect(live.errors()).toContain("pass --from");
    expect(await run(["sms", "send", "--simulate", "delivered", "--from", "+1415"], live)).toBe(2);
    expect(live.errors()).toContain("sandbox (coss_test_) key");
  });

  test("API errors exit 1 with the message", async () => {
    const api = fakeFetch({
      "POST /v1/sms": () =>
        Response.json(
          {
            error: {
              type: "invalid_request_error",
              code: "sender_not_ready",
              message: "+14155550123 can't send yet: its carrier registration isn't approved.",
              request_id: "req_1",
            },
          },
          { status: 422 },
        ),
    });
    const io = testIo({ fetch: api.fetch, env: { COSS_API_KEY: LIVE_KEY } });
    expect(await run(["sms", "send", "--to", "+14155550199", "--from", "+14155550123"], io)).toBe(
      1,
    );
    expect(io.errors()).toContain("carrier registration isn't approved. (request req_1)");
  });

  test("--wait follows the message until its outcome is known, then shows its events", async () => {
    const failure = {
      code: "carrier_filtered",
      message: "The carrier filtered the message as spam or unregistered traffic.",
    };
    const states = [sms("sent"), sms("undelivered", { failure })];
    const api = fakeFetch({
      "POST /v1/sms": sms("queued"),
      "GET /v1/sms/sms_1": () => states.shift() ?? sms("undelivered", { failure }),
      "GET /v1/sms/sms_1/events": {
        object: "list",
        has_more: false,
        data: [event("sms.sent"), event("sms.undelivered", { failure })],
      },
    });
    const io = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["sms", "send", "--simulate", "filtered", "--wait"], io)).toBe(0);
    expect(io.output()).toContain("sms_1 undelivered → +15005550004");
    expect(io.output()).toContain("carrier_filtered: The carrier filtered");
    expect(io.output()).toContain("sms.undelivered  carrier_filtered");
    expect(api.requests.some((r) => r.url.pathname === "/v1/sms/received")).toBe(false);
  });

  test("--wait with --simulate reply shows the simulated reply", async () => {
    const delivered = sms("delivered", { to: "+15005550008" });
    const api = fakeFetch({
      "POST /v1/sms": delivered,
      "GET /v1/sms/sms_1/events": { object: "list", has_more: false, data: [] },
      "GET /v1/sms/received": {
        object: "list",
        has_more: false,
        data: [
          {
            object: "received_sms",
            id: "smsin_1",
            from: "+15005550008",
            to: "+14155550100",
            body: "Thanks! This is a simulated reply.",
            segments: 1,
            keyword: null,
            sandbox: true,
            created_at: "2026-10-15T12:00:02.000Z",
          },
        ],
      },
    });
    const io = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["sms", "send", "--simulate", "reply", "--wait", "--json"], io)).toBe(0);
    const printed = JSON.parse(io.output());
    expect(printed.replies).toEqual([
      expect.objectContaining({ body: "Thanks! This is a simulated reply." }),
    ]);
    const query = api.requests.find((r) => r.url.pathname === "/v1/sms/received")?.url.searchParams;
    expect(query?.get("from")).toBe("+15005550008");
    expect(query?.get("to")).toBe("+14155550100");
  });

  test("--wait gives up after --timeout with exit code 1", async () => {
    const api = fakeFetch({
      "POST /v1/sms": sms("queued"),
      "GET /v1/sms/sms_1": sms("queued"),
      "GET /v1/sms/sms_1/events": { object: "list", has_more: false, data: [] },
    });
    let clock = Date.parse("2026-10-15T12:00:00.000Z");
    const io = testIo({
      fetch: api.fetch,
      env: { COSS_API_KEY: SANDBOX_KEY },
      now: () => {
        clock += 1000;
        return new Date(clock);
      },
    });
    expect(
      await run(["sms", "send", "--simulate", "delivered", "--wait", "--timeout", "2"], io),
    ).toBe(1);
    expect(io.errors()).toContain("Not every outcome arrived in time");
  });
});
