import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { fakeFetch, LIVE_KEY, SANDBOX_KEY, testIo } from "./helpers.ts";

function email(
  status: string,
  recipientStatus: string,
  address = "bounce@simulator.amazonses.com",
) {
  return {
    object: "email",
    id: "email_1",
    status,
    sandbox: true,
    recipients: [{ address, type: "to", status: recipientStatus, last_event_at: null }],
  };
}

describe("coss emails send", () => {
  test("sends a default test email, or what the flags say", async () => {
    const api = fakeFetch({ "POST /v1/emails": email("queued", "queued", "a@example.com") });
    const io = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["emails", "send", "--to", "a@example.com"], io)).toBe(0);
    expect(api.requests[0]?.body).toEqual({
      from: "COSS CLI <cli@example.com>",
      to: ["a@example.com"],
      subject: "Test email from the COSS CLI",
      text: "Sent with `coss emails send`. https://coss.com/docs/cli",
    });
    expect(io.output()).toContain("email_1 queued → a@example.com");

    const html = join(io.configDir, "body.html");
    await writeFile(html, "<p>Hi</p>");
    const full = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(
      await run(
        [
          "emails",
          "send",
          "--to",
          "a@example.com,b@example.com",
          "--from",
          "me@acme.test",
          "--subject",
          "Hello",
          "--html-file",
          html,
          "--category",
          "test",
          "--tag",
          "run=1",
          "--json",
        ],
        full,
      ),
    ).toBe(0);
    expect(api.requests[1]?.body).toEqual({
      from: "me@acme.test",
      to: ["a@example.com", "b@example.com"],
      subject: "Hello",
      html: "<p>Hi</p>",
      category: "test",
      tags: [{ name: "run", value: "1" }],
    });
    expect(JSON.parse(full.output())).toMatchObject({ id: "email_1" });
  });

  test("templates take variables, parsed as JSON when they are", async () => {
    const api = fakeFetch({ "POST /v1/emails": email("queued", "queued") });
    const io = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(
      await run(
        [
          "emails",
          "send",
          "--simulate",
          "delivered",
          "--template",
          "welcome",
          "--var",
          "name=Ada",
          "--var",
          "count=3",
        ],
        io,
      ),
    ).toBe(0);
    expect(api.requests[0]?.body).toMatchObject({
      to: ["success@simulator.amazonses.com"],
      template_id: "welcome",
      variables: { name: "Ada", count: 3 },
    });
    expect(api.requests[0]?.body).not.toHaveProperty("subject");
  });

  test("refuses what can't work", async () => {
    const io = testIo({ env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["emails", "send"], io)).toBe(2);
    expect(await run(["emails", "send", "--simulate", "exploded"], io)).toBe(2);
    expect(await run(["emails", "send", "--to", "a@b.c", "--var", "x=1"], io)).toBe(2);
    expect(await run(["emails", "send", "--to", "a@b.c", "--nope"], io)).toBe(2);
    const live = testIo({ env: { COSS_API_KEY: LIVE_KEY } });
    expect(await run(["emails", "send", "--to", "a@b.c"], live)).toBe(2);
    expect(live.errors()).toContain("pass --from");
  });

  test("--wait follows the email until its outcome is known, then shows its events", async () => {
    const states = [email("sent", "sent"), email("sent", "bounced")];
    const api = fakeFetch({
      "POST /v1/emails": email("queued", "queued"),
      "GET /v1/emails/email_1": () => states.shift() ?? email("sent", "bounced"),
      "GET /v1/emails/email_1/events": {
        object: "list",
        has_more: false,
        data: [
          {
            object: "email_event",
            id: "e1",
            email_id: "email_1",
            type: "email.sent",
            recipient: null,
            occurred_at: "2026-10-15T12:00:01.000Z",
            data: {},
          },
          {
            object: "email_event",
            id: "e2",
            email_id: "email_1",
            type: "email.bounced",
            recipient: "bounce@simulator.amazonses.com",
            occurred_at: "2026-10-15T12:00:02.000Z",
            data: {},
          },
        ],
      },
    });
    const io = testIo({ fetch: api.fetch, env: { COSS_API_KEY: SANDBOX_KEY } });
    expect(await run(["emails", "send", "--simulate", "bounced", "--wait"], io)).toBe(0);
    expect(io.output()).toContain("bounce@simulator.amazonses.com  bounced");
    expect(io.output()).toContain("email.bounced  bounce@simulator.amazonses.com");
  });
});
