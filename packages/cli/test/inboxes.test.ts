import { describe, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { fakeFetch, SANDBOX_KEY, testIo } from "./helpers.ts";

const env = { COSS_API_KEY: SANDBOX_KEY };
const INBOX = "/v1/inboxes/inbox_1";

const inbox = {
  object: "inbox",
  id: "inbox_1",
  address: "agent@abc.inbound.coss.com",
  username: "agent",
  domain: "abc.inbound.coss.com",
  kind: "managed",
  display_name: "Agent",
  client_id: null,
  can_send: false,
  sandbox: false,
  created_at: "2026-10-29T12:00:00.000Z",
  updated_at: "2026-10-29T12:00:00.000Z",
};

function message(overrides: Record<string, unknown>) {
  return {
    object: "inbox_message",
    id: "imsg_1",
    inbox_id: "inbox_1",
    thread_id: "thread_1",
    direction: "inbound",
    status: "received",
    from: "Jane <jane@example.com>",
    to: ["agent@abc.inbound.coss.com"],
    cc: [],
    subject: "Help",
    preview: "Can you help?",
    attachments: [],
    spam: false,
    received_email_id: "rcvd_1",
    email_id: null,
    created_at: "2026-10-29T12:00:00.000Z",
    reply_to: [],
    message_id: "<m@example.com>",
    in_reply_to: null,
    references: [],
    text: "Can you help?\n\nOn Mon, Acme wrote:\n> old",
    extracted_text: "Can you help?",
    html: null,
    truncated: false,
    ...overrides,
  };
}

describe("coss inboxes", () => {
  test("create and list", async () => {
    const api = fakeFetch({
      "POST /v1/inboxes": inbox,
      "GET /v1/inboxes": { object: "list", data: [inbox], has_more: false },
    });
    const created = testIo({ fetch: api.fetch, env });
    expect(
      await run(["inboxes", "create", "--username", "agent", "--name", "Agent"], created),
    ).toBe(0);
    expect(api.requests[0]?.body).toEqual({ username: "agent", display_name: "Agent" });
    expect(created.output()).toContain("agent@abc.inbound.coss.com inbox_1");
    expect(created.errors()).toContain("It receives only");

    const listed = testIo({ fetch: api.fetch, env });
    expect(await run(["inboxes", "list"], listed)).toBe(0);
    expect(listed.output()).toContain("inbox_1  agent@abc.inbound.coss.com  Agent  no");
  });

  test("threads, a thread and a reply", async () => {
    const thread = {
      object: "inbox_thread",
      id: "thread_1",
      inbox_id: "inbox_1",
      subject: "Help",
      participants: ["jane@example.com"],
      message_count: 1,
      preview: "Can you help?",
      last_message_at: "2026-10-29T12:00:00.000Z",
      last_inbound_at: "2026-10-29T12:00:00.000Z",
      created_at: "2026-10-29T12:00:00.000Z",
    };
    const api = fakeFetch({
      [`GET ${INBOX}/threads`]: { object: "list", data: [thread], has_more: false },
      [`GET ${INBOX}/threads/thread_1`]: { ...thread, messages: [message({})] },
      [`POST ${INBOX}/messages/imsg_1/reply`]: message({
        id: "imsg_2",
        direction: "outbound",
        status: "queued",
        to: ["Jane <jane@example.com>"],
      }),
    });
    const listed = testIo({ fetch: api.fetch, env });
    expect(await run(["inboxes", "threads", "inbox_1"], listed)).toBe(0);
    expect(listed.output()).toContain("●  thread_1  Help     jane@example.com  1");

    const read = testIo({ fetch: api.fetch, env });
    expect(await run(["inboxes", "thread", "inbox_1", "thread_1"], read)).toBe(0);
    expect(read.output()).toContain("Can you help?");
    expect(read.output()).not.toContain("> old");
    const full = testIo({ fetch: api.fetch, env });
    expect(await run(["inboxes", "thread", "inbox_1", "thread_1", "--full"], full)).toBe(0);
    expect(full.output()).toContain("> old");

    const replied = testIo({ fetch: api.fetch, env });
    expect(
      await run(["inboxes", "reply", "inbox_1", "imsg_1", "--text", "Sure.", "--all"], replied),
    ).toBe(0);
    expect(api.requests.at(-1)?.body).toEqual({ text: "Sure.", reply_all: true });
    expect(replied.output()).toContain("Replied to Jane <jane@example.com> imsg_2");
    expect(await run(["inboxes", "reply", "inbox_1", "imsg_1"], testIo({ env }))).toBe(2);
  });
});
