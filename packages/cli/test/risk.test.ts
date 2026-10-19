import { describe, expect, test } from "bun:test";
import { expiresAt } from "../src/commands/risk.ts";
import { run } from "../src/run.ts";
import { fakeFetch, NOW, SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY };

function assessment(overrides: Record<string, unknown> = {}) {
  return {
    object: "risk_assessment",
    id: "rass_1",
    event: "signup",
    event_name: null,
    decision: "block",
    score: 0.97,
    reasons: [
      { code: "ip.tor", message: "The IP address is a Tor exit node." },
      {
        code: "velocity.signups_per_ip_1h",
        message: "Many sign-ups from this IP address.",
        value: 12,
        threshold: 10,
        window: "1h",
      },
    ],
    signals: {},
    user: { id: null, email: "ada@example.com" },
    ip: "192.0.2.1",
    degraded: [],
    outcome: null,
    review_status: null,
    created_at: "2026-10-15T12:00:00.000Z",
    ...overrides,
  };
}

describe("coss risk", () => {
  test("assess sends the flags (over --data) and prints the decision and reasons", async () => {
    const api = fakeFetch({ "POST /v1/risk/assessments": assessment() });
    const io = testIo({ fetch: api.fetch, env });
    const code = await run(
      [
        "risk",
        "assess",
        "--event",
        "signup",
        "--email",
        "ada@example.com",
        "--ip",
        "192.0.2.1",
        "--user",
        "u_1",
        "--user-agent",
        "curl/8",
        "--content",
        "Hi [coss-test:spam]",
        "--captcha",
        "test-pass",
        "--device",
        "test-device:ada",
        "--data",
        '{"ip":"203.0.113.9","user":{"id":"u_0"},"checkout":{"amount":1999,"currency":"USD"}}',
      ],
      io,
    );
    expect(code).toBe(0);
    expect(api.requests[0]?.body).toEqual({
      event: "signup",
      user: { id: "u_1", email: "ada@example.com" },
      ip: "192.0.2.1",
      user_agent: "curl/8",
      content: { text: "Hi [coss-test:spam]" },
      captcha: { token: "test-pass" },
      device: { token: "test-device:ada" },
      checkout: { amount: 1999, currency: "USD" },
    });
    const output = io.output();
    expect(output).toStartWith("block  score 0.97  rass_1\n");
    expect(output).toContain("  ip.tor                      The IP address is a Tor exit node.");
    expect(output).toContain("Many sign-ups from this IP address. (12/10 in 1h)");

    const degraded = testIo({
      fetch: fakeFetch({
        "POST /v1/risk/assessments": assessment({
          decision: "allow",
          reasons: [],
          degraded: ["email_dns"],
        }),
      }).fetch,
      env,
    });
    expect(await run(["risk", "assess", "--event", "login", "--user", "u_1"], degraded)).toBe(0);
    expect(degraded.output()).toContain("No reasons");
    expect(degraded.errors()).toContain("Decided without: email_dns");
  });

  test("assess needs an event it knows", async () => {
    const missing = testIo({ env });
    expect(await run(["risk", "assess", "--email", "a@example.com"], missing)).toBe(2);
    expect(missing.errors()).toContain("Pass --event");
    const unknown = testIo({ env });
    expect(await run(["risk", "assess", "--event", "purchase"], unknown)).toBe(2);
    expect(unknown.errors()).toContain("--event takes signup, login, message, checkout, custom");
  });

  test("assessments lists the review queue", async () => {
    const api = fakeFetch({
      "GET /v1/risk/assessments": {
        object: "list",
        data: [assessment({ decision: "review", review_status: "open" })],
        has_more: false,
      },
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["risk", "assessments", "--review", "open", "--decision", "review"], io)).toBe(
      0,
    );
    expect([...(api.requests[0]?.url.searchParams ?? [])]).toEqual([
      ["decision", "review"],
      ["review_status", "open"],
    ]);
    expect(io.output()).toContain("rass_1  signup  review    0.97   ada@example.com  to review");
  });

  test("feedback reports the outcome", async () => {
    const api = fakeFetch({
      "POST /v1/risk/assessments/rass_1/feedback": assessment({ outcome: "fraud" }),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(
      await run(["risk", "feedback", "rass_1", "--outcome", "fraud", "--note", "chargeback"], io),
    ).toBe(0);
    expect(api.requests[0]?.body).toEqual({ outcome: "fraud", note: "chargeback" });
    expect(io.output()).toContain("Marked rass_1 fraud");
    expect(await run(["risk", "feedback", "rass_1"], testIo({ env }))).toBe(2);
  });

  test("lists add, list and remove", async () => {
    const entry = {
      object: "risk_list_entry",
      id: "rle_1",
      list: "block",
      type: "domain",
      value: "evil.example",
      note: "spam wave",
      expires_at: "2026-10-22T12:00:00.000Z",
      created_at: "2026-10-15T12:00:00.000Z",
    };
    const api = fakeFetch({
      "POST /v1/risk/list_entries": entry,
      "GET /v1/risk/list_entries": { object: "list", data: [entry], has_more: false },
      "DELETE /v1/risk/list_entries/rle_1": {
        object: "risk_list_entry",
        id: "rle_1",
        deleted: true,
      },
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(
      await run(
        [
          "risk",
          "lists",
          "add",
          "block",
          "domain",
          "evil.example",
          "--note",
          "spam wave",
          "--expires",
          "7d",
        ],
        io,
      ),
    ).toBe(0);
    expect(api.requests[0]?.body).toEqual({
      list: "block",
      type: "domain",
      value: "evil.example",
      note: "spam wave",
      expires_at: "2026-10-22T12:00:00.000Z",
    });
    expect(io.output()).toContain("Blocked domain evil.example rle_1");

    const listed = testIo({ fetch: api.fetch, env });
    expect(
      await run(["risk", "lists", "list", "--list", "block", "--type", "domain"], listed),
    ).toBe(0);
    expect(listed.output()).toContain(
      "rle_1  block  domain  evil.example  2026-10-22 12:00  spam wave",
    );

    const removed = testIo({ fetch: api.fetch, env });
    expect(await run(["risk", "lists", "remove", "rle_1"], removed)).toBe(0);
    expect(removed.output()).toContain("Removed rle_1");

    for (const argv of [
      ["risk", "lists", "add", "deny", "domain", "x.example"],
      ["risk", "lists", "add", "block", "phone", "123"],
      ["risk", "lists", "add", "block", "domain"],
      ["risk", "lists", "add", "block", "domain", "x.example", "--expires", "soon"],
    ]) {
      expect(await run(argv, testIo({ env }))).toBe(2);
    }
  });

  test("--expires: a duration from now or a time", () => {
    expect(expiresAt("30m", NOW)).toBe("2026-10-15T12:30:00.000Z");
    expect(expiresAt("12h", NOW)).toBe("2026-10-16T00:00:00.000Z");
    expect(expiresAt("2026-12-01T00:00:00+01:00", NOW)).toBe("2026-11-30T23:00:00.000Z");
  });
});
