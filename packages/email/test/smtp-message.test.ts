import { describe, expect, test } from "bun:test";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { buildTestMessage } from "../src/inbound-mime.ts";
import { messageToSendRequest } from "../src/smtp-message.ts";

type ComposeOptions = ConstructorParameters<typeof MailComposer>[0];

/** A message exactly as nodemailer (Better Auth, Supabase-style setups, most Node apps) sends it. */
async function compose(options: ComposeOptions): Promise<Uint8Array> {
  const buffer = await new MailComposer(options).compile().build();
  return new Uint8Array(buffer);
}

function raw(lines: string[]): Uint8Array {
  return new TextEncoder().encode(`${lines.join("\r\n")}\r\n`);
}

const envelope = (...rcptTo: string[]) => ({ mailFrom: "bounce@acme.test", rcptTo });

describe("messageToSendRequest", () => {
  test("maps a nodemailer message onto a send request", async () => {
    const message = await compose({
      from: '"Acme, Inc." <hello@acme.test>',
      to: "Ada <ada@example.com>",
      cc: "grace@example.com",
      replyTo: "support@acme.test",
      subject: "Welcome — résumé",
      text: "Hi Ada",
      html: "<p>Hi Ada</p>",
      headers: { "List-Unsubscribe": "<https://acme.test/u>" },
    });
    const result = await messageToSendRequest({
      raw: message,
      envelope: envelope("ada@example.com", "grace@example.com", "hidden@example.com"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.params).toMatchObject({
      from: '"Acme, Inc." <hello@acme.test>',
      to: ["Ada <ada@example.com>"],
      cc: ["grace@example.com"],
      bcc: ["hidden@example.com"],
      reply_to: ["support@acme.test"],
      subject: "Welcome — résumé",
      text: "Hi Ada",
      html: "<p>Hi Ada</p>",
      headers: { "list-unsubscribe": "<https://acme.test/u>" },
    });
    // Transport headers (Message-ID, Date, MIME-Version, Content-Type…) never become custom ones.
    expect(Object.keys(result.params.headers)).toEqual(["list-unsubscribe"]);
    expect(result.idempotencyKey).toBeNull();
  });

  test("envelope recipients are matched case-insensitively", async () => {
    const message = await compose({
      from: "hello@acme.test",
      to: "Ada@Example.com",
      subject: "Hi",
      text: "x",
    });
    const result = await messageToSendRequest({
      raw: message,
      envelope: envelope("ada@example.com"),
    });
    expect(result.ok && result.params.bcc).toEqual([]);
  });

  test("refuses header recipients that aren't envelope recipients", async () => {
    const message = await compose({
      from: "hello@acme.test",
      to: ["ada@example.com", "grace@example.com"],
      subject: "Hi",
      text: "x",
    });
    const result = await messageToSendRequest({
      raw: message,
      envelope: envelope("ada@example.com"),
    });
    expect(result).toEqual({
      ok: false,
      reply: {
        code: 554,
        status: "5.5.1",
        message: expect.stringContaining("grace@example.com"),
      },
    });
  });

  test("refuses Bcc-only messages instead of disclosing the recipients", async () => {
    const message = raw([
      "From: hello@acme.test",
      "To: undisclosed-recipients:;",
      "Subject: Hi",
      "",
      "Body",
    ]);
    const result = await messageToSendRequest({
      raw: message,
      envelope: envelope("ada@example.com"),
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reply.message).toContain("To recipient");
  });

  test("needs exactly one From mailbox and a subject", async () => {
    const twoFroms = await messageToSendRequest({
      raw: raw(["From: a@acme.test, b@acme.test", "To: ada@example.com", "Subject: Hi", "", "x"]),
      envelope: envelope("ada@example.com"),
    });
    expect(!twoFroms.ok && twoFroms.reply.message).toContain("exactly one mailbox");
    const noFrom = await messageToSendRequest({
      raw: raw(["To: ada@example.com", "Subject: Hi", "", "x"]),
      envelope: envelope("ada@example.com"),
    });
    expect(!noFrom.ok && noFrom.reply.message).toContain("From header");
    const noSubject = await messageToSendRequest({
      raw: raw(["From: a@acme.test", "To: ada@example.com", "", "x"]),
      envelope: envelope("ada@example.com"),
    });
    expect(!noSubject.ok && noSubject.reply.message).toContain("Subject");
  });

  test("unfolds long subjects and decodes encoded words", async () => {
    const result = await messageToSendRequest({
      raw: raw([
        "From: =?UTF-8?B?w4lsaXNl?= <hello@acme.test>",
        "To: ada@example.com",
        "Subject: A very long subject line that a client",
        "\tfolded onto a second line",
        "",
        "x",
      ]),
      envelope: envelope("ada@example.com"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.params.subject).toBe(
      "A very long subject line that a client folded onto a second line",
    );
    expect(result.params.from).toBe("Élise <hello@acme.test>");
  });

  test("maps attachments, inline images and calendar invites", async () => {
    const message = await compose({
      from: "hello@acme.test",
      to: "ada@example.com",
      subject: "Files",
      html: '<img src="cid:logo@acme">',
      attachments: [
        {
          filename: "invoice.pdf",
          content: Buffer.from("%PDF-1.7"),
          contentType: "application/pdf",
        },
        { filename: "logo.png", content: Buffer.from("png"), cid: "logo@acme" },
        { content: Buffer.from("no name"), contentType: "text/plain" },
      ],
      icalEvent: { method: "REQUEST", content: "BEGIN:VCALENDAR\r\nEND:VCALENDAR" },
    });
    const result = await messageToSendRequest({
      raw: message,
      envelope: envelope("ada@example.com"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const attachments = result.params.attachments ?? [];
    expect(attachments.map((a) => [a.filename, a.content_type, a.content_id])).toEqual(
      expect.arrayContaining([
        ["invoice.pdf", "application/pdf", null],
        ["logo.png", "image/png", "logo@acme"],
        [expect.stringMatching(/^attachment-\d+\.txt$/), "text/plain", null],
        [expect.stringMatching(/\.ics$/), "text/calendar", null],
      ]),
    );
    const pdf = attachments.find((a) => a.filename === "invoice.pdf");
    expect(Buffer.from(pdf?.content ?? "", "base64").toString()).toBe("%PDF-1.7");
  });

  test("refuses attachments SES can't send", async () => {
    const message = await compose({
      from: "hello@acme.test",
      to: "ada@example.com",
      subject: "Files",
      text: "x",
      attachments: [{ filename: "setup.exe", content: Buffer.from("MZ") }],
    });
    const result = await messageToSendRequest({
      raw: message,
      envelope: envelope("ada@example.com"),
    });
    expect(result).toEqual({
      ok: false,
      reply: { code: 554, status: "5.6.0", message: expect.stringContaining(".exe") },
    });
  });

  test("reads COSS's own headers and never sends them on", async () => {
    const message = await compose({
      from: "hello@acme.test",
      to: "ada@example.com",
      subject: "Hi",
      text: "x",
      headers: {
        "X-Coss-Category": "onboarding",
        "X-Coss-Tags": "template=welcome, plan=pro",
        "X-Coss-Tracking": "clicks",
        "X-Coss-Scheduled-At": "2099-01-01T09:00:00Z",
        "X-Coss-Idempotency-Key": "welcome-123",
        "X-Entity-Ref-ID": "abc",
      },
    });
    const result = await messageToSendRequest({
      raw: message,
      envelope: envelope("ada@example.com"),
    });
    // 2099 is more than 30 days ahead: the schema's own message comes back.
    expect(!result.ok && result.reply.message).toContain("scheduled_at");

    const scheduled = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const ok = await messageToSendRequest({
      raw: await compose({
        from: "hello@acme.test",
        to: "ada@example.com",
        subject: "Hi",
        text: "x",
        headers: {
          "X-Coss-Category": "onboarding",
          "X-Coss-Tags": "template=welcome, plan=pro",
          "X-Coss-Tracking": "clicks",
          "X-Coss-Scheduled-At": scheduled,
          "X-Coss-Idempotency-Key": "welcome-123",
          "X-Entity-Ref-ID": "abc",
        },
      }),
      envelope: envelope("ada@example.com"),
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.params).toMatchObject({
      category: "onboarding",
      tags: [
        { name: "template", value: "welcome" },
        { name: "plan", value: "pro" },
      ],
      tracking: { opens: false, clicks: true },
      scheduled_at: scheduled,
      headers: { "x-entity-ref-id": "abc" },
    });
    expect(ok.idempotencyKey).toBe("welcome-123");
  });

  test("refuses malformed COSS headers", async () => {
    for (const [name, value] of [
      ["X-Coss-Tags", "no-equals-sign"],
      ["X-Coss-Tracking", "sometimes"],
    ] as const) {
      const result = await messageToSendRequest({
        raw: raw([
          "From: a@acme.test",
          "To: ada@example.com",
          "Subject: Hi",
          `${name}: ${value}`,
          "",
          "x",
        ]),
        envelope: envelope("ada@example.com"),
      });
      expect(!result.ok && result.reply.message).toContain(name);
    }
  });

  test("keeps encoded custom header values and trims long References", async () => {
    const ids = Array.from({ length: 60 }, (_, i) => `<message-${i}-${"x".repeat(10)}@acme.test>`);
    const result = await messageToSendRequest({
      raw: raw([
        "From: a@acme.test",
        "To: ada@example.com",
        "Subject: Re: Hi",
        "In-Reply-To: <message-59@acme.test>",
        `References: ${ids.join("\r\n ")}`,
        "X-Note: =?UTF-8?B?w6k=?=",
        "X-Mailer: PHPMailer 6.9",
        "",
        "x",
      ]),
      envelope: envelope("ada@example.com"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const references = result.params.headers.references ?? "";
    expect(references.length).toBeLessThanOrEqual(995 - "references".length);
    expect(references.startsWith(ids[0] as string)).toBe(true);
    expect(references.endsWith(ids[59] as string)).toBe(true);
    expect(result.params.headers["x-note"]).toBe("=?UTF-8?B?w6k=?=");
    expect(result.params.headers["x-mailer"]).toBeUndefined();
  });

  test("refuses more custom headers than a send allows", async () => {
    const headers = Array.from({ length: 16 }, (_, i) => `X-Custom-${i}: ${i}`);
    const result = await messageToSendRequest({
      raw: raw(["From: a@acme.test", "To: ada@example.com", "Subject: Hi", ...headers, "", "x"]),
      envelope: envelope("ada@example.com"),
    });
    expect(!result.ok && result.reply.message).toContain("At most 15 custom headers");
  });

  test("an unverifiable From address is a sender error", async () => {
    const result = await messageToSendRequest({
      raw: buildTestMessage({
        from: "not an address <nope>",
        to: ["ada@example.com"],
        subject: "Hi",
        text: "x",
      }),
      envelope: envelope("ada@example.com"),
    });
    expect(result.ok).toBe(false);
  });

  test("garbage input is refused, not thrown", async () => {
    const result = await messageToSendRequest({
      raw: new Uint8Array([0, 1, 2, 3]),
      envelope: envelope("ada@example.com"),
    });
    expect(result.ok).toBe(false);
  });
});
