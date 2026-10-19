import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { complete } from "../src/completion.ts";
import { COMMANDS, run } from "../src/run.ts";
import { apiError, fakeFetch, SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY };

function sent(type: string, counts = { endpoints: 1, listeners: 1 }) {
  return {
    object: "webhook_test_event",
    event: {
      id: "evt_1",
      object: "event",
      type,
      api_version: "2026-10-10",
      created_at: "2026-10-15T12:00:00.000Z",
      data: {},
    },
    ...counts,
  };
}

describe("coss trigger", () => {
  test("sends a test event, with --data and -F merged into its data", async () => {
    const api = fakeFetch({ "POST /v1/webhook_events/test": sent("email.bounced") });
    const io = testIo({ fetch: api.fetch, env });
    const reason = join(io.configDir, "reason.txt");
    await writeFile(reason, "smtp; 550 no such user");
    const code = await run(
      [
        "trigger",
        "email.bounced",
        "--data",
        '{"recipient":"ada@example.com","bounce":{"type":"transient"}}',
        "-F",
        "bounce.sub_type=NoEmail",
        "-F",
        `bounce.diagnostic_code=@${reason}`,
        "-F",
        'tags=[{"name":"plan","value":"pro"}]',
      ],
      io,
    );
    expect(code).toBe(0);
    expect(api.requests[0]?.body).toEqual({
      type: "email.bounced",
      data: {
        recipient: "ada@example.com",
        bounce: {
          type: "transient",
          sub_type: "NoEmail",
          diagnostic_code: "smtp; 550 no such user",
        },
        tags: [{ name: "plan", value: "pro" }],
      },
    });
    expect(io.output()).toContain("email.bounced evt_1 → 1 endpoint, 1 listener");
  });

  test("says so when nothing received it; --json prints the answer", async () => {
    const api = fakeFetch({
      "POST /v1/webhook_events/test": sent("contact.created", { endpoints: 0, listeners: 0 }),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["trigger", "contact.created"], io)).toBe(0);
    expect(api.requests[0]?.body).toEqual({ type: "contact.created" });
    expect(io.output()).toContain("0 endpoints, 0 listeners");
    expect(io.errors()).toContain("run `coss listen`");

    const json = testIo({ fetch: api.fetch, env });
    expect(await run(["trigger", "contact.created", "--json"], json)).toBe(0);
    expect(JSON.parse(json.output())).toMatchObject({ object: "webhook_test_event", endpoints: 0 });
  });

  test("usage errors, and the API's refusals", async () => {
    for (const [argv, message] of [
      [["trigger"], "Pass an event type"],
      [["trigger", "billing.invoice_paid"], "only reach live environments"],
      [["trigger", "email.exploded"], 'Unknown event type "email.exploded"'],
      [["trigger", "email.sent", "--data", "[1]"], "--data takes a JSON object"],
      [["trigger", "email.sent", "-F", "to[]=a"], "pass it as JSON"],
    ] as const) {
      const io = testIo({ env });
      expect(await run([...argv], io)).toBe(2);
      expect(io.errors()).toContain(message);
    }
    const api = fakeFetch({
      "POST /v1/webhook_events/test": () =>
        apiError(
          403,
          "permission_error",
          "sandbox_only",
          "Test events are sent only in sandbox environments.",
        ),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["trigger", "email.sent"], io)).toBe(1);
    expect(io.errors()).toContain(
      "Couldn't send a test email.sent event: Test events are sent only",
    );
  });

  test("completes the event types a sandbox environment can test", async () => {
    const io = testIo();
    const types = await complete(COMMANDS, ["trigger", "email.b"], io);
    expect(types).toEqual(["email.bounced"]);
    expect(await complete(COMMANDS, ["trigger", "billing."], io)).toEqual([]);
    expect(await complete(COMMANDS, ["trigger", "risk."], io)).toEqual([
      "risk.assessment.review",
      "risk.assessment.reviewed",
    ]);
  });
});
