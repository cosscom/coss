import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Email, EmailEvent } from "coss";
import { agentNotes } from "../src/commands/init.ts";
import { sendAndDiagnose as sendNext } from "./fixtures/next-send.ts";
import { sendAndDiagnose as sendNodemailer } from "./fixtures/nodemailer-send.ts";

const ROOT = join(import.meta.dir, "../../..");
const FIXTURES = join(import.meta.dir, "fixtures");

function source(path: string): string {
  return readFileSync(path, "utf8");
}

function email(): Email {
  return {
    object: "email",
    id: "email_fixture",
    from: "Acme <hello@example.com>",
    to: ["bounce@simulator.amazonses.com"],
    cc: [],
    bcc: [],
    reply_to: [],
    subject: "Hello from coss.com",
    html: null,
    text: "It works.",
    headers: {},
    tags: [],
    category: null,
    stream: "transactional",
    status: "sent",
    failure: null,
    recipients: [
      {
        address: "bounce@simulator.amazonses.com",
        type: "to",
        status: "bounced",
        last_event_at: "2026-10-15T12:00:02.000Z",
      },
    ],
    attachments: [],
    sandbox: true,
    tracking: {
      opens: false,
      clicks: false,
      unsubscribe: false,
      open_count: 0,
      first_opened_at: null,
      last_opened_at: null,
      click_count: 0,
      first_clicked_at: null,
      last_clicked_at: null,
    },
    created_at: "2026-10-15T12:00:00.000Z",
    sent_at: "2026-10-15T12:00:01.000Z",
    scheduled_at: null,
    batch_id: null,
    template: null,
    broadcast_id: null,
    subaccount_id: null,
    content_storage: { mode: "store", discarded_at: null },
  };
}

function bounce(): EmailEvent {
  return {
    object: "email_event",
    id: "evt_bounce",
    email_id: "email_fixture",
    type: "email.bounced",
    recipient: "bounce@simulator.amazonses.com",
    occurred_at: "2026-10-15T12:00:02.000Z",
    data: {},
  };
}

function fakeSend() {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? "GET";
    if (method === "POST" && url.pathname === "/v1/emails") {
      return Response.json(email());
    }
    return Response.json(
      {
        error: {
          type: "not_found_error",
          code: "not_found",
          message: "Not found.",
          request_id: "req_test",
        },
      },
      { status: 404 },
    );
  };
}

describe("agent outcome fixtures", () => {
  test("the Next.js and Nodemailer fixtures check errors, stay on a development key, and diagnose a sandbox send", async () => {
    for (const file of ["next-send.ts", "nodemailer-send.ts"]) {
      const text = source(join(FIXTURES, file));
      expect(text).toContain("Server-only");
      expect(text).toContain("if (error");
      expect(text).toContain("bounce@simulator.amazonses.com");
      expect(text).toContain("diagnoseEmail");
      expect(text).toContain("process.env.COSS_API_KEY");
      expect(text).not.toContain("coss_live_");
    }
    expect(source(join(FIXTURES, "next/.env.local"))).toBe("COSS_API_KEY=coss_test_fixture_next\n");
    expect(source(join(FIXTURES, "nodemailer/.env"))).toBe(
      "COSS_API_KEY=coss_test_fixture_nodemailer\n",
    );
    expect(source(join(FIXTURES, "nodemailer-send.ts"))).toContain('from "coss/nodemailer"');

    const previous = process.env.COSS_API_KEY;
    process.env.COSS_API_KEY = "coss_test_fixture_next";
    try {
      const events = [bounce()];
      const fetchImpl = fakeSend() as typeof fetch;
      expect(await sendNext(fetchImpl, events)).toEqual({
        id: "email_fixture",
        verdict: "not_delivered",
      });
      expect(await sendNodemailer(fetchImpl, events)).toEqual({
        id: "email_fixture",
        verdict: "not_delivered",
      });
    } finally {
      if (previous === undefined) delete process.env.COSS_API_KEY;
      else process.env.COSS_API_KEY = previous;
    }
  });

  test("the prompt, the brief, the skill and the init notes share the agent rules", () => {
    const prompt = source(join(ROOT, "apps/site/src/lib/site.ts"));
    const brief = source(join(ROOT, "apps/site/src/lib/llms.ts"));
    const skill = source(join(ROOT, "plugins/coss/skills/coss/SKILL.md"));
    const notes = agentNotes(".env.local");
    expect(prompt).toContain("llms.txt");
    expect(prompt).toContain("npx coss-cli init --agents");
    for (const text of [brief, skill, notes]) {
      expect(text).toContain("coss_test_");
      expect(text).toContain("llms.txt");
      expect(text).toContain("error");
      expect(text).toContain("hint");
      expect(text).toContain("diagnose");
      expect(text).toContain("COSS_WEBHOOK_SECRET");
    }
  });
});
