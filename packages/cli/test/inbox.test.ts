import { describe, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { environmentObject, fakeFetch, SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY };

function received(id: string, at: string, overrides: Record<string, unknown> = {}) {
  return {
    object: "received_email",
    id,
    status: "received",
    blocked_reason: null,
    mail_from: "ada@example.com",
    recipients: ["support@dev-acme.inbound.coss.test"],
    from: "Ada <ada@example.com>",
    to: ["support@dev-acme.inbound.coss.test"],
    cc: [],
    subject: `Hello ${id}`,
    message_id: null,
    attachments: [],
    size: 120,
    spam: false,
    verdicts: {
      spam: "pass",
      virus: "pass",
      spf: "pass",
      dkim: "pass",
      dmarc: "pass",
      dmarc_policy: null,
    },
    sandbox: true,
    received_at: at,
    ...overrides,
  };
}

const address = {
  object: "inbound_address",
  environment_id: "env_dev",
  domain: "dev-acme.inbound.coss.test",
};
const list = (data: unknown[], has_more = false) => ({ object: "list", data, has_more });

describe("coss inbox", () => {
  test("prints the address, then only emails that arrive while it runs, oldest first", async () => {
    let poll = 0;
    const old = received("rcv_old", "2026-10-15T11:00:00.000Z");
    const pages = [
      [old],
      [
        received("rcv_2", "2026-10-15T12:00:02.000Z"),
        received("rcv_1", "2026-10-15T12:00:01.000Z"),
        old,
      ],
      [received("rcv_2", "2026-10-15T12:00:02.000Z")],
    ];
    const io = testIo({ env });
    const api = fakeFetch({
      "GET /v1/environment": environmentObject(),
      "GET /v1/received_emails/address": address,
      "GET /v1/received_emails": () => {
        const page = pages[Math.min(poll, pages.length - 1)] ?? [];
        poll++;
        if (poll === pages.length) io.controller.abort();
        return list(page);
      },
    });
    io.fetch = api.fetch;
    expect(await run(["inbox"], io)).toBe(130);
    const lines = io.output().trim().split("\n");
    expect(lines[0]).toBe("Inbound domain: dev-acme.inbound.coss.test");
    expect(lines.slice(1).map((line) => line.split("  ").at(-1))).toEqual(["rcv_1", "rcv_2"]);
    expect(io.output()).not.toContain("rcv_old");
    expect(io.errors()).toContain(
      "Mail to any address at it (e.g. test@dev-acme.inbound.coss.test)",
    );
  });

  test("--since shows earlier emails too; --json prints objects", async () => {
    const io = testIo({ env });
    let polls = 0;
    io.fetch = fakeFetch({
      "GET /v1/environment": environmentObject(),
      "GET /v1/received_emails/address": address,
      "GET /v1/received_emails": () => {
        if (++polls === 2) io.controller.abort();
        return list([
          received("rcv_recent", "2026-10-15T11:50:00.000Z"),
          received("rcv_old", "2026-10-15T10:00:00.000Z"),
        ]);
      },
    }).fetch;
    expect(await run(["inbox", "--since", "15m", "--json"], io)).toBe(130);
    const objects = io
      .output()
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(objects.map((object) => object.object)).toEqual(["inbound_address", "received_email"]);
    expect(objects[1].id).toBe("rcv_recent");
  });
});

describe("coss inbox get", () => {
  const full = {
    ...received("rcv_1", "2026-10-15T12:00:01.000Z", { subject: "Hi \u001b[2Jthere" }),
    reply_to: [],
    in_reply_to: null,
    references: [],
    sent_at: "2026-10-15T12:00:00.000Z",
    headers: [{ name: "X-Test", value: "1" }],
    text: "Line 1\r\nLine 2\u001b]0;title\u0007",
    html: "<p>Hi</p>",
    truncated: false,
  };

  test("shows headers, verdicts and the text body, without control characters", async () => {
    const io = testIo({ env, fetch: fakeFetch({ "GET /v1/received_emails/rcv_1": full }).fetch });
    expect(await run(["inbox", "get", "rcv_1", "--headers"], io)).toBe(0);
    const output = io.output();
    expect(output).toContain("Subject    Hi  [2Jthere");
    expect(output).toContain("Verdicts   spam pass, virus pass, spf pass, dkim pass, dmarc pass");
    expect(output).toContain("X-Test: 1");
    expect(output).toContain("Line 1\nLine 2]0;title\n");
    expect(output).not.toContain("\u001b");
  });

  test("--raw writes the message as received, but not to a terminal", async () => {
    const raw = "From: ada@example.com\r\nSubject: Hi\r\n\r\nHi\r\n";
    const api = fakeFetch({
      "GET /v1/received_emails/rcv_1/raw": () =>
        new Response(raw, { headers: { "content-type": "message/rfc822" } }),
    });
    const piped = testIo({ env, fetch: api.fetch });
    expect(await run(["inbox", "get", "rcv_1", "--raw"], piped)).toBe(0);
    expect(piped.output()).toBe(raw);

    const terminal = testIo({ env, fetch: api.fetch });
    terminal.stdout.isTTY = true;
    expect(await run(["inbox", "get", "rcv_1", "--raw"], terminal)).toBe(2);
    expect(terminal.errors()).toContain("redirect it");
  });
});
