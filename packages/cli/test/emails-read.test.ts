import { describe, expect, test } from "bun:test";
import { printable } from "../src/emails/format.ts";
import { run } from "../src/run.ts";
import { apiError, fakeFetch, LIVE_KEY, SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY };

function email(id: string, overrides: Record<string, unknown> = {}) {
  return {
    object: "email",
    id,
    from: "Acme <hello@acme.test>",
    to: ["ada@example.com"],
    cc: [],
    bcc: [],
    reply_to: [],
    subject: "Welcome",
    html: "<p>Hi</p>",
    text: "Hi",
    headers: {},
    tags: [{ name: "plan", value: "pro" }],
    category: null,
    stream: "transactional",
    status: "sent",
    failure: null,
    recipients: [
      { address: "ada@example.com", type: "to", status: "delivered", last_event_at: null },
    ],
    attachments: [],
    sandbox: true,
    tracking: {
      opens: true,
      clicks: false,
      unsubscribe: false,
      open_count: 2,
      first_opened_at: null,
      last_opened_at: null,
      click_count: 0,
      first_clicked_at: null,
      last_clicked_at: null,
    },
    created_at: "2026-10-15T11:59:00.000Z",
    sent_at: "2026-10-15T11:59:01.000Z",
    scheduled_at: null,
    batch_id: null,
    template: null,
    broadcast_id: null,
    subaccount_id: null,
    content_storage: { mode: "store", discarded_at: null },
    ...overrides,
  };
}

const list = (data: unknown[], has_more = false) => ({ object: "list", data, has_more });

describe("coss emails list", () => {
  test("filters, pages up to --limit, and prints a table", async () => {
    const api = fakeFetch({
      "GET /v1/emails": (request: { url: URL }) =>
        request.url.searchParams.get("after") === "email_2"
          ? list([email("email_3", { status: "failed", recipients: [] })], true)
          : list(
              [
                email("email_1"),
                email("email_2", {
                  recipients: [
                    {
                      address: "a@example.com",
                      type: "to",
                      status: "delivered",
                      last_event_at: null,
                    },
                    {
                      address: "b@example.com",
                      type: "to",
                      status: "bounced",
                      last_event_at: null,
                    },
                  ],
                }),
              ],
              true,
            ),
    });
    const io = testIo({ fetch: api.fetch, env });
    const code = await run(
      [
        "emails",
        "list",
        "--to",
        "ada@example.com",
        "--status",
        "sent,failed",
        "--recipient-status",
        "bounced",
        "-q",
        "welcome",
        "--since",
        "1h",
        "--limit",
        "3",
      ],
      io,
    );
    expect(code).toBe(0);
    const [first, second] = api.requests;
    expect(Object.fromEntries(first?.url.searchParams ?? [])).toEqual({
      to: "ada@example.com",
      status: "sent,failed",
      recipient_status: "bounced",
      q: "welcome",
      created_after: "2026-10-15T11:00:00.000Z",
      limit: "3",
    });
    expect(second?.url.searchParams.get("limit")).toBe("1");
    expect(api.requests).toHaveLength(2);
    const lines = io.output().trim().split("\n");
    expect(lines[0]).toMatch(/^ID\s+STATUS\s+CREATED\s+TO\s+SUBJECT$/);
    expect(lines[1]).toContain("email_1  delivered");
    expect(lines[2]).toContain("1 delivered, 1 bounced");
    expect(lines[3]).toContain("failed");
  });

  test("--json prints one email per line; bad values are usage errors", async () => {
    const api = fakeFetch({ "GET /v1/emails": list([email("email_1"), email("email_2")]) });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["emails", "list", "--json"], io)).toBe(0);
    expect(
      io
        .output()
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line).id),
    ).toEqual(["email_1", "email_2"]);
    for (const argv of [
      ["emails", "list", "--status", "lost"],
      ["emails", "list", "--limit", "0"],
      ["emails", "list", "--since", "yesterday-ish"],
    ]) {
      expect(await run(argv, testIo({ env }))).toBe(2);
    }
  });
});

describe("coss emails get and events", () => {
  test("get shows the email; --text prints its body alone", async () => {
    const api = fakeFetch({ "GET /v1/emails/email_1": email("email_1") });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["emails", "get", "email_1"], io)).toBe(0);
    expect(io.output()).toContain("email_1  delivered (sandbox)");
    expect(io.output()).toContain("Tags       plan=pro");
    expect(io.output()).toContain("to  ada@example.com  delivered");
    expect(io.output()).toContain("2 open(s)");

    const body = testIo({ fetch: api.fetch, env });
    expect(await run(["emails", "get", "email_1", "--text"], body)).toBe(0);
    expect(body.output()).toBe("Hi\n");
    expect(await run(["emails", "get"], testIo({ env }))).toBe(2);
  });

  test("events: one line each, with what the receiving server said", async () => {
    const api = fakeFetch({
      "GET /v1/emails/email_1/events": list([
        {
          object: "email_event",
          id: "evt_1",
          email_id: "email_1",
          type: "email.bounced",
          recipient: "gone@example.com",
          occurred_at: "2026-10-15T11:59:02.000Z",
          data: {
            bounce: {
              type: "permanent",
              sub_type: "General",
              diagnostic_code: "550 \u001b[31mno user",
            },
          },
        },
      ]),
    });
    const io = testIo({ fetch: api.fetch, env });
    expect(await run(["emails", "events", "email_1"], io)).toBe(0);
    expect(io.output()).toBe(
      "2026-10-15T11:59:02.000Z  email.bounced  gone@example.com  550  [31mno user\n",
    );
  });
});

describe("coss emails diagnose", () => {
  const bounced = email("email_1", {
    sandbox: false,
    recipients: [
      { address: "gone@example.com", type: "to", status: "bounced", last_event_at: null },
    ],
  });
  const routes = {
    "GET /v1/emails/email_1": bounced,
    "GET /v1/emails/email_1/events": list([
      {
        object: "email_event",
        id: "evt_1",
        email_id: "email_1",
        type: "email.bounced",
        recipient: "gone@example.com",
        occurred_at: "2026-10-15T11:59:02.000Z",
        data: {
          bounce: { type: "permanent", sub_type: "General", diagnostic_code: "550 no user" },
        },
      },
    ]),
    "GET /v1/suppressions": list([
      { id: "sup_1", scope: "*", reason: "bounce", created_at: "2026-10-15T11:59:03.000Z" },
    ]),
    "GET /v1/domains": list([{ name: "acme.test", status: "verified", can_send: true }]),
    "GET /v1/reputation": { status: "good", reason: null },
    "GET /v1/billing": () => apiError(403, "permission_error", "forbidden"),
  };

  test("explains each recipient, with next steps as CLI commands", async () => {
    const io = testIo({ fetch: fakeFetch(routes).fetch, env: { COSS_API_KEY: LIVE_KEY } });
    expect(await run(["emails", "diagnose", "email_1"], io)).toBe(0);
    const output = io.output();
    expect(output).toStartWith("not delivered  Not delivered (1 bounced).");
    expect(output).toContain("gone@example.com  bounced");
    expect(output).toContain("Hard bounce");
    expect(output).toContain("diagnostic_code: 550 no user");
    expect(output).toContain('suppressions: [{"id":"sup_1"');
    expect(output).toContain("email.bounced  gone@example.com");

    const json = testIo({ fetch: fakeFetch(routes).fetch, env: { COSS_API_KEY: LIVE_KEY } });
    expect(await run(["emails", "diagnose", "email_1", "--json"], json)).toBe(0);
    expect(JSON.parse(json.output())).toMatchObject({
      verdict: "not_delivered",
      email_id: "email_1",
    });
  });

  test("--to diagnoses the newest email to an address", async () => {
    const api = fakeFetch({ ...routes, "GET /v1/emails": list([bounced]) });
    const io = testIo({ fetch: api.fetch, env: { COSS_API_KEY: LIVE_KEY } });
    expect(await run(["emails", "diagnose", "--to", "gone@example.com"], io)).toBe(0);
    expect(api.requests[0]?.url.search).toBe("?to=gone%40example.com&limit=1");
    expect(io.output()).toContain("Hard bounce");

    const none = testIo({
      fetch: fakeFetch({ "GET /v1/emails": list([]) }).fetch,
      env: { COSS_API_KEY: LIVE_KEY },
    });
    expect(await run(["emails", "diagnose", "--to", "nobody@example.com"], none)).toBe(1);
    expect(none.errors()).toContain("No email to nobody@example.com");
  });

  test("a failed email: the failure, its explanation and the commands to run", async () => {
    const failed = email("email_2", {
      sandbox: false,
      status: "failed",
      failure: { code: "domain_not_verified", message: "acme.test isn't verified." },
      recipients: [
        { address: "ada@example.com", type: "to", status: "failed", last_event_at: null },
      ],
    });
    const io = testIo({
      fetch: fakeFetch({
        "GET /v1/emails/email_2": failed,
        "GET /v1/emails/email_2/events": list([]),
        "GET /v1/domains": list([]),
      }).fetch,
      env: { COSS_API_KEY: LIVE_KEY },
    });
    expect(await run(["emails", "diagnose", "email_2"], io)).toBe(0);
    expect(io.output()).toContain("domain_not_verified: acme.test isn't verified.");
    expect(io.output()).toContain(
      "→ Add the missing records, then verify it (`coss api -X POST domains/<id>/verify`)",
    );
    expect(io.output()).toContain("! The From domain is not a domain of this organization");
  });
});

test("printable drops control characters from text written by others", () => {
  expect(printable("Hi\u001b]0;pwned\u0007 there\r\nnext")).toBe("Hi ]0;pwned  there next");
  expect(printable("line 1\r\nline 2\u001b[2J\tend", true)).toBe("line 1\nline 2[2J\tend");
});
