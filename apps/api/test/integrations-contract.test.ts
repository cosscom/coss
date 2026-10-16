/**
 * Contract test: the SDK's integrations (`coss/nodemailer`, `coss/better-auth`, `coss/authjs`,
 * built dist) against the real app, in process. What they build from a framework's message must be
 * a request the API accepts and stores as intended.
 */
import { describe, expect, test } from "bun:test";
import { RESERVED_HEADERS } from "@coss/email/schemas";
import { createTestTenant } from "@coss/tenancy/testing";
import { Coss, type Email, type FetchLike } from "coss";
import Auth from "coss/authjs";
import { cossEmail } from "coss/better-auth";
import { cossTransport, withCoss } from "coss/nodemailer";
import nodemailer from "nodemailer";
import { createTestApp, type TestApp } from "./helpers.ts";

function fetchInto(app: TestApp): FetchLike {
  return (input, init) =>
    Promise.resolve(
      app.fetch(
        input instanceof Request ? new Request(input, init) : new Request(String(input), init),
      ),
    );
}

/** Records what POST /v1/emails answered: the email, and whether it was an idempotent replay. */
function recordingFetch(app: TestApp): {
  fetch: FetchLike;
  sends: { email: Email; replayed: boolean }[];
} {
  const sends: { email: Email; replayed: boolean }[] = [];
  const inner = fetchInto(app);
  const fetch: FetchLike = async (input, init) => {
    const res = await inner(input, init);
    if (init?.method === "POST" && String(input).endsWith("/v1/emails") && res.ok) {
      sends.push({
        email: (await res.clone().json()) as Email,
        replayed: res.headers.get("idempotent-replayed") === "true",
      });
    }
    return res;
  };
  return { fetch, sends };
}

const BASE_URL = "http://api.test";

describe("coss/nodemailer against the API", () => {
  test("a Nodemailer message with an inline image and a file is stored and dispatched", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const fetch = fetchInto(app);
    const transporter = nodemailer.createTransport(
      cossTransport({ apiKey: tenant.sandboxKey, baseUrl: BASE_URL, fetch }),
    );

    const info = await transporter.sendMail(
      withCoss(
        {
          from: '"Acme, Inc." <hello@acme.com>',
          to: "Ada Lovelace <ada@example.com>",
          subject: "Grüße from Acme",
          text: "Hello!",
          html: '<p>Hello!</p><img src="cid:logo@acme">',
          messageId: "<ignored@acme.com>",
          inReplyTo: "<parent@acme.com>",
          headers: { "X-Campaign": "Frühling" },
          list: { unsubscribe: "https://acme.com/unsubscribe" },
          attachments: [
            { filename: "logo.png", content: Buffer.from([137, 80, 78, 71]), cid: "logo@acme" },
            { filename: "notes.txt", content: "plain text, UTF-8: é" },
          ],
        },
        { category: "receipts", tags: [{ name: "plan", value: "pro" }] },
      ),
    );

    const coss = new Coss({ apiKey: tenant.sandboxKey, baseUrl: BASE_URL, fetch });
    const stored = await coss.email.get(info.messageId);
    expect(stored.error).toBeNull();
    expect(stored.data).toMatchObject({
      from: '"Acme, Inc." <hello@acme.com>',
      to: ["Ada Lovelace <ada@example.com>"],
      subject: "Grüße from Acme",
      category: "receipts",
      tags: [{ name: "plan", value: "pro" }],
      headers: {
        "x-campaign": "=?UTF-8?B?RnLDvGhsaW5n?=",
        "in-reply-to": "<parent@acme.com>",
        "list-unsubscribe": "<https://acme.com/unsubscribe>",
      },
      attachments: [
        { filename: "logo.png", content_type: "image/png", content_id: "logo@acme", size: 4 },
        { filename: "notes.txt", content_type: "text/plain", content_id: null, size: 21 },
      ],
      status: "queued",
    });

    await dispatch();
    expect(sandboxProvider.sent).toHaveLength(1);
    expect((await coss.email.get(info.messageId)).data?.status).toBe("sent");
  });

  test("API refusals reject sendMail with the API's error", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const transporter = nodemailer.createTransport(
      cossTransport({ apiKey: tenant.liveKey, baseUrl: BASE_URL, fetch: fetchInto(app) }),
    );
    const error = await transporter
      .sendMail({
        from: "hello@unverified.example",
        to: "ada@example.com",
        subject: "Hi",
        text: "x",
      })
      .catch((err: unknown) => err);
    expect(error).toMatchObject({
      name: "CossSendError",
      status: 422,
      code: "domain_not_verified",
    });
  });
});

describe("coss/better-auth against the API", () => {
  test("auth emails are account mail with tracking off, and a repeated callback sends once", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const { fetch, sends } = recordingFetch(app);
    const email = cossEmail({
      from: "Acme <auth@acme.com>",
      appName: "Acme",
      apiKey: tenant.sandboxKey,
      baseUrl: BASE_URL,
      fetch,
    });
    const data = {
      user: { email: "ada@example.com", name: "Ada" },
      url: "https://acme.com/api/auth/verify-email?token=abc",
      token: "abc",
    };
    await email.sendVerificationEmail(data);
    await email.sendVerificationEmail(data);

    expect(sends.map((send) => send.replayed)).toEqual([false, true]);
    expect(sends[1]?.email.id).toBe(sends[0]?.email.id ?? "");
    expect(sends[0]?.email).toMatchObject({
      to: ["ada@example.com"],
      subject: "Verify your email address",
      category: "account",
      tracking: { opens: false, clicks: false },
    });
  });
});

describe("header mapping against the API", () => {
  test("every header the API reserves is dropped rather than refused", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const transporter = nodemailer.createTransport(
      cossTransport({ apiKey: tenant.sandboxKey, baseUrl: BASE_URL, fetch: fetchInto(app) }),
    );
    // The integrations mirror RESERVED_HEADERS by hand: a header the API adds to its list but the
    // mirror lacks makes this send fail with 422.
    const reserved = [...RESERVED_HEADERS, "x-ses-configuration-set"];
    const info = await transporter.sendMail({
      from: "auth@acme.com",
      to: "ada@example.com",
      subject: "Reserved",
      text: "x",
      headers: Object.fromEntries(reserved.map((name) => [name, "value"])),
    });
    expect(info.email.headers).toEqual({});
  });
});

describe("coss/authjs against the API", () => {
  test("the sign-in link is sent as account mail with tracking off", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const { fetch, sends } = recordingFetch(app);
    const provider = Auth({ from: "Acme <auth@acme.com>", baseUrl: BASE_URL, fetch });
    await provider.sendVerificationRequest({
      identifier: "ada@example.com",
      url: "https://acme.com/api/auth/callback/coss?token=xyz",
      token: "xyz",
      expires: new Date(Date.now() + 86_400_000),
      // Auth.js sets the key from AUTH_COSS_KEY onto the provider it passes back.
      provider: { ...provider, apiKey: tenant.sandboxKey },
      theme: {},
    });

    expect(sends[0]?.email).toMatchObject({
      to: ["ada@example.com"],
      subject: "Sign in to acme.com",
      category: "account",
      tracking: { opens: false, clicks: false },
    });
  });
});
