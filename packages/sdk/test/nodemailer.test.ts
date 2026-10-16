import { describe, expect, test } from "bun:test";
import nodemailer, { type SendMailOptions } from "nodemailer";
import { VERSION } from "../src/index.ts";
import { CossSendError, cossTransport, withCoss } from "../src/nodemailer.ts";
import { apiError, json, mockFetch, sampleEmail } from "./helpers.ts";

const API_KEY = "coss_test_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";

function transporter(...handlers: Parameters<typeof mockFetch>) {
  const mock = mockFetch(...handlers);
  const transport = nodemailer.createTransport(
    cossTransport({ apiKey: API_KEY, baseUrl: "http://api.test", fetch: mock.fetch }),
  );
  return { transport, calls: mock.calls };
}

function body(call: { body: string | null } | undefined): Record<string, unknown> {
  return JSON.parse(call?.body ?? "null");
}

describe("cossTransport", () => {
  test("maps a message to POST /v1/emails", async () => {
    const { transport, calls } = transporter(json(202, { ...sampleEmail, status: "queued" }));
    const info = await transport.sendMail({
      from: '"Acme, Inc." <hello@acme.com>',
      to: ["Ada <ada@example.com>", "bob@example.com"],
      cc: "carol@example.com",
      bcc: { name: "Dan", address: "dan@example.com" },
      replyTo: "support@acme.com",
      subject: "Your receipt",
      text: "Thanks!",
      html: "<p>Thanks!</p>",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://api.test/v1/emails");
    expect(calls[0]?.headers.get("user-agent")).toBe(`coss-typescript/${VERSION} (nodemailer)`);
    expect(calls[0]?.headers.get("idempotency-key")).toBeTruthy();
    expect(body(calls[0])).toEqual({
      from: '"Acme, Inc." <hello@acme.com>',
      to: ["Ada <ada@example.com>", "bob@example.com"],
      cc: ["carol@example.com"],
      bcc: ["Dan <dan@example.com>"],
      reply_to: ["support@acme.com"],
      subject: "Your receipt",
      html: "<p>Thanks!</p>",
      text: "Thanks!",
    });
    expect(info.messageId).toBe(sampleEmail.id);
    expect(info.response).toBe("202 queued");
    expect(info.accepted).toEqual([
      "ada@example.com",
      "bob@example.com",
      "carol@example.com",
      "dan@example.com",
    ]);
    expect(info.email.id).toBe(sampleEmail.id);
  });

  test("sends attachments as base64, inline ones with a content id", async () => {
    const { transport, calls } = transporter(json(202, sampleEmail));
    await transport.sendMail({
      from: "hello@acme.com",
      to: "ada@example.com",
      subject: "Files",
      html: '<img src="cid:logo@acme">',
      attachments: [
        { filename: "notes.txt", content: "héllo" },
        { filename: "logo.png", content: Buffer.from([1, 2, 3]), cid: "logo@acme" },
        { filename: "data.csv", content: "YSxiCjEsMg==", encoding: "base64" },
        { filename: "page.html", content: "<p>", contentType: "text/html; charset=utf-8" },
      ],
      icalEvent: { method: "REQUEST", content: "BEGIN:VCALENDAR\r\nEND:VCALENDAR" },
    });
    expect(body(calls[0]).attachments).toEqual([
      {
        filename: "notes.txt",
        content: Buffer.from("héllo").toString("base64"),
        content_type: "text/plain",
      },
      { filename: "logo.png", content: "AQID", content_type: "image/png", content_id: "logo@acme" },
      { filename: "data.csv", content: "YSxiCjEsMg==", content_type: "text/csv" },
      { filename: "page.html", content: "PHA+", content_type: "text/html" },
      {
        filename: "invite.ics",
        content: Buffer.from("BEGIN:VCALENDAR\r\nEND:VCALENDAR").toString("base64"),
        content_type: "text/calendar",
      },
    ]);
  });

  test("drops headers coss.com sets itself and encodes non-ASCII values", async () => {
    const { transport, calls } = transporter(json(202, sampleEmail));
    await transport.sendMail({
      from: "hello@acme.com",
      to: "ada@example.com",
      subject: "Headers",
      text: "x",
      messageId: "<custom@acme.com>",
      date: new Date(),
      inReplyTo: "<parent@acme.com>",
      priority: "high",
      list: { unsubscribe: "https://acme.com/unsubscribe" },
      headers: {
        "X-Campaign": "spring",
        "X-Greeting": "Grüße",
        "Message-ID": "<other@acme.com>",
        "MIME-Version": "1.0",
        "X-SES-Configuration-Set": "nope",
      },
    });
    expect(body(calls[0]).headers).toEqual({
      "X-Campaign": "spring",
      "X-Greeting": "=?UTF-8?B?R3LDvMOfZQ==?=",
      "list-unsubscribe": "<https://acme.com/unsubscribe>",
      "in-reply-to": "<parent@acme.com>",
      "X-Priority": "1 (Highest)",
      "X-MSMail-Priority": "High",
      Importance: "High",
    });
  });

  test("takes headers in Nodemailer's array form too", async () => {
    const { transport, calls } = transporter(json(202, sampleEmail));
    await transport.sendMail({
      from: "hello@acme.com",
      to: "ada@example.com",
      subject: "Headers",
      text: "x",
      list: { unsubscribe: "https://acme.com/unsubscribe" },
      headers: [
        { key: "X-Test", value: "hello" },
        { key: "X-Prepared", value: { prepared: true, value: "as is" } } as never,
        { key: "Date", value: "Mon, 1 Jan 2024 00:00:00 +0000" },
      ],
    });
    expect(body(calls[0]).headers).toEqual({
      "X-Test": "hello",
      "X-Prepared": "as is",
      "list-unsubscribe": "<https://acme.com/unsubscribe>",
    });
  });

  test("refuses a header given more than once instead of sending one value", async () => {
    const { transport, calls } = transporter(json(202, sampleEmail));
    const base = { from: "hello@acme.com", to: "ada@example.com", subject: "Hi", text: "x" };
    for (const headers of [
      { "X-Tag": ["a", "b"] },
      [
        { key: "X-Tag", value: "a" },
        { key: "x-tag", value: "b" },
      ],
    ]) {
      const error = await transport.sendMail({ ...base, headers }).catch((err: unknown) => err);
      expect((error as Error).message).toMatch(/X-Tag. header is given more than once/i);
    }
    expect(calls).toHaveLength(0);
  });

  test("coss.com settings from the transport and the message", async () => {
    const mock = mockFetch(json(202, sampleEmail));
    const transport = nodemailer.createTransport(
      cossTransport({
        apiKey: API_KEY,
        fetch: mock.fetch,
        category: "transactional",
        tags: [
          { name: "app", value: "web" },
          { name: "plan", value: "free" },
        ],
        tracking: { opens: true },
      }),
    );
    await transport.sendMail(
      withCoss(
        { from: "hello@acme.com", to: "ada@example.com", subject: "Hi", text: "x" },
        {
          category: "receipts",
          tags: [{ name: "plan", value: "pro" }],
          scheduledAt: new Date("2026-10-20T09:00:00Z"),
          idempotencyKey: "order-42",
        },
      ),
    );
    expect(mock.calls[0]?.headers.get("idempotency-key")).toBe("order-42");
    const sent = body(mock.calls[0]);
    expect(sent.category).toBe("receipts");
    expect(sent.tags).toEqual([
      { name: "app", value: "web" },
      { name: "plan", value: "pro" },
    ]);
    expect(sent.tracking).toEqual({ opens: true });
    expect(sent.scheduled_at).toBe("2026-10-20T09:00:00.000Z");
    expect(sent.coss).toBeUndefined();
  });

  test("API errors reject sendMail with a CossSendError", async () => {
    const { transport } = transporter(
      apiError(422, {
        type: "invalid_request_error",
        code: "domain_not_verified",
        message: "acme.com is not verified.",
        param: "from",
      }),
    );
    const error = await transport
      .sendMail({ from: "hello@acme.com", to: "ada@example.com", subject: "Hi", text: "x" })
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(CossSendError);
    expect(error).toMatchObject({
      code: "domain_not_verified",
      status: 422,
      requestId: "req_envelope",
    });
    expect((error as Error).message).toContain("acme.com is not verified.");
  });

  test("refuses what coss.com can't send instead of dropping it", async () => {
    const { transport, calls } = transporter(json(202, sampleEmail));
    const base = { from: "hello@acme.com", to: "ada@example.com", subject: "Hi", text: "x" };
    const refused: [SendMailOptions, RegExp][] = [
      [{ raw: "From: a\r\n\r\nbody" }, /raw/],
      [{ envelope: { from: "bounce@acme.com", to: "x@example.com" } }, /envelope/],
      [{ sender: "other@acme.com" }, /sender/],
      [{ amp: "<!doctype html><html ⚡4email></html>" }, /AMP/],
      [
        {
          attachments: [
            {
              filename: "x.txt",
              content: "fallback",
              raw: "Content-Type: text/plain\r\n\r\nactual",
            },
          ],
        },
        /attachments with `raw` MIME/,
      ],
    ];
    for (const [extra, pattern] of refused) {
      const error = await transport.sendMail({ ...base, ...extra }).catch((err: unknown) => err);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(pattern);
    }
    expect(calls).toHaveLength(0);
  });

  test("verify checks for an API key without sending", async () => {
    const saved = process.env.COSS_API_KEY;
    delete process.env.COSS_API_KEY;
    try {
      const { fetch, calls } = mockFetch(json(200, {}));
      await expect(
        nodemailer.createTransport(cossTransport({ apiKey: API_KEY, fetch })).verify(),
      ).resolves.toBe(true);
      await expect(nodemailer.createTransport(cossTransport({ fetch })).verify()).rejects.toThrow(
        /Missing coss.com API key/,
      );
      expect(calls).toHaveLength(0);
    } finally {
      if (saved !== undefined) process.env.COSS_API_KEY = saved;
    }
  });
});
