import { describe, expect, spyOn, test } from "bun:test";
import { db, schema } from "@coss/db";
import { EmailError } from "@coss/email";
import type { EmailObjectOutput } from "@coss/email/schemas";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  createTestApp,
  domainFrom,
  emailBody,
  errorOf,
  getEmailById,
  REQUEST_ID,
  sendEmail,
} from "./helpers.ts";

describe("POST /v1/emails", () => {
  test("a sandbox send is accepted queued and dispatched through the sandbox provider", async () => {
    const tenant = await createTestTenant();
    const { app, liveProvider, sandboxProvider, dispatch } = createTestApp();

    const res = await sendEmail(
      app,
      tenant.sandboxKey,
      emailBody({ to: ["a@example.com", "b@example.com"], headers: { "X-Campaign": "fall" } }),
    );

    expect(res.status).toBe(202);
    expect(res.headers.get("x-request-id")).toMatch(REQUEST_ID);
    expect(res.headers.get("idempotent-replayed")).toBeNull();
    const email = (await res.json()) as EmailObjectOutput;
    expect(email).toMatchObject({
      object: "email",
      from: "Acme <hello@acme.com>",
      to: ["a@example.com", "b@example.com"],
      cc: [],
      subject: "Welcome",
      text: "Hello!",
      html: null,
      headers: { "x-campaign": "fall" },
      status: "queued",
      sandbox: true,
      sent_at: null,
    });
    expect(email.id).toStartWith("email_");
    // The response never waits for the provider.
    expect(sandboxProvider.sent).toHaveLength(0);

    await dispatch();
    expect(await (await getEmailById(app, tenant.sandboxKey, email.id)).json()).toMatchObject({
      status: "sent",
      sent_at: expect.any(String),
    });
    expect(sandboxProvider.sent.map((m) => m.emailId)).toEqual([email.id]);
    expect(liveProvider.sent).toHaveLength(0);
  });

  test("a live send is dispatched through the live provider", async () => {
    const tenant = await createTestTenant();
    const { app, liveProvider, sandboxProvider, dispatch } = createTestApp();

    const from = await domainFrom(tenant.organization.id);

    const res = await sendEmail(app, tenant.liveKey, emailBody({ from }));

    expect(res.status).toBe(202);
    const email = (await res.json()) as EmailObjectOutput;
    expect(email).toMatchObject({ status: "queued", sandbox: false });
    await dispatch();
    expect(liveProvider.sent.map((m) => m.emailId)).toEqual([email.id]);
    expect(sandboxProvider.sent).toHaveLength(0);
  });

  test("a live key can only send from a verified domain of the organization", async () => {
    const tenant = await createTestTenant();
    const { app, liveProvider } = createTestApp();

    const res = await sendEmail(
      app,
      tenant.liveKey,
      emailBody({ from: "hello@unknown.coss.test" }),
    );

    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({
      type: "invalid_request_error",
      code: "domain_not_verified",
      param: "from",
    });
    expect(liveProvider.sent).toHaveLength(0);
  });

  test("a paused organization can't send with a live key", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const from = await domainFrom(tenant.organization.id);
    await db.insert(schema.emailTenant).values({
      organizationId: tenant.organization.id,
      provider: "fake",
      tenantName: `fake-${tenant.organization.id}`,
      sendingStatus: "disabled",
    });

    const res = await sendEmail(app, tenant.liveKey, emailBody({ from }));

    expect(res.status).toBe(403);
    expect(await errorOf(res)).toMatchObject({ type: "permission_error", code: "sending_paused" });
  });

  test("an invalid body is a 422 validation_error listing every issue", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider } = createTestApp();

    const res = await sendEmail(app, tenant.sandboxKey, {
      from: "Acme <hello@acme.com>",
      to: ["ok@example.com", "not-an-email"],
      subject: "",
      text: "Hi",
      attachments: [{ filename: "a.pdf", content: "not base64" }],
    });

    expect(res.status).toBe(422);
    const error = await errorOf(res);
    expect(error).toMatchObject({ type: "invalid_request_error", code: "validation_error" });
    const paths = error.issues?.map((issue) => issue.path);
    expect(paths).toContain("to.1");
    expect(paths).toContain("subject");
    expect(paths).toContain("attachments.0.content");
    expect(error.param).toBe(error.issues?.[0]?.path);
    expect(error.message).toStartWith("Invalid request body: ");
    expect(sandboxProvider.sent).toHaveLength(0);
  });

  test("attachments are sent and returned as metadata only", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const content = Buffer.from("%PDF-1.7").toString("base64");

    const res = await sendEmail(
      app,
      tenant.sandboxKey,
      emailBody({
        html: '<img src="cid:logo">',
        attachments: [
          { filename: "invoice.pdf", content },
          { filename: "logo.svg", content, content_id: "logo" },
        ],
      }),
    );

    expect(res.status).toBe(202);
    const email = (await res.json()) as EmailObjectOutput;
    expect(email.attachments).toEqual([
      {
        id: expect.stringMatching(/^att_/),
        filename: "invoice.pdf",
        content_type: "application/pdf",
        content_id: null,
        size: 8,
      },
      {
        id: expect.stringMatching(/^att_/),
        filename: "logo.svg",
        content_type: "image/svg+xml",
        content_id: "logo",
        size: 8,
      },
    ]);
    expect(JSON.stringify(email)).not.toContain(content);
    await dispatch();
    expect(sandboxProvider.sent[0]?.attachments.map((a) => a.filename)).toEqual([
      "invoice.pdf",
      "logo.svg",
    ]);
    const fetched = await getEmailById(app, tenant.sandboxKey, email.id);
    expect(((await fetched.json()) as EmailObjectOutput).attachments).toEqual(email.attachments);
  });

  test("a missing body field is reported at its path", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await sendEmail(app, tenant.sandboxKey, emailBody({ text: undefined }));

    expect(res.status).toBe(422);
    const error = await errorOf(res);
    expect(error.param).toBe("html");
    expect(error.issues).toEqual([{ path: "html", message: "Provide `html`, `text`, or both." }]);
  });

  test("malformed JSON is a 400 invalid_json", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await sendEmail(app, tenant.sandboxKey, '{"from": ');

    expect(res.status).toBe(400);
    expect(await errorOf(res)).toMatchObject({
      type: "invalid_request_error",
      code: "invalid_json",
    });
  });

  test("a non-JSON content type is a 415 unsupported_media_type", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await sendEmail(app, tenant.sandboxKey, "from=a@b.com", {
      "Content-Type": "application/x-www-form-urlencoded",
    });

    expect(res.status).toBe(415);
    expect(await errorOf(res)).toMatchObject({
      type: "invalid_request_error",
      code: "unsupported_media_type",
    });
  });

  test("an Idempotency-Key longer than 256 characters is a 400 invalid_idempotency_key", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider } = createTestApp();

    const res = await sendEmail(app, tenant.sandboxKey, emailBody(), {
      "Idempotency-Key": "k".repeat(257),
    });

    expect(res.status).toBe(400);
    expect(await errorOf(res)).toMatchObject({
      type: "invalid_request_error",
      code: "invalid_idempotency_key",
      param: "Idempotency-Key",
    });
    expect(sandboxProvider.sent).toHaveLength(0);
  });

  test("an empty Idempotency-Key is a 400 invalid_idempotency_key", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const res = await sendEmail(app, tenant.sandboxKey, emailBody(), { "Idempotency-Key": "" });

    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("invalid_idempotency_key");
  });

  test("a repeated Idempotency-Key replays the original email", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const headers = { "Idempotency-Key": `welcome-${crypto.randomUUID()}` };

    const first = await sendEmail(app, tenant.sandboxKey, emailBody(), headers);
    // Same request spelled differently: recipients normalize to the same canonical body.
    const second = await sendEmail(
      app,
      tenant.sandboxKey,
      emailBody({ to: ["user@example.com"] }),
      headers,
    );

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
    expect(first.headers.get("idempotent-replayed")).toBeNull();
    expect(second.headers.get("idempotent-replayed")).toBe("true");
    const original = (await first.json()) as EmailObjectOutput;
    // Still queued: a retry before dispatch gets the queued email, not a 409.
    expect(await second.json()).toEqual(original);

    await dispatch();
    const third = await sendEmail(app, tenant.sandboxKey, emailBody(), headers);
    expect(third.status).toBe(202);
    expect(third.headers.get("idempotent-replayed")).toBe("true");
    expect(await third.json()).toMatchObject({ id: original.id, status: "sent" });
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("an Idempotency-Key reused with a different body is a 422 idempotency_key_reused", async () => {
    const tenant = await createTestTenant();
    const { app, queue } = createTestApp();
    const headers = { "Idempotency-Key": crypto.randomUUID() };

    expect((await sendEmail(app, tenant.sandboxKey, emailBody(), headers)).status).toBe(202);
    const res = await sendEmail(
      app,
      tenant.sandboxKey,
      emailBody({ subject: "Something else" }),
      headers,
    );

    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({
      type: "idempotency_error",
      code: "idempotency_key_reused",
      param: "Idempotency-Key",
    });
    expect(queue.jobs).toHaveLength(1);
  });

  test("request_in_progress is a 409 with Retry-After", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({
      emailService: {
        replay: async () => null,
        send: async () => {
          throw new EmailError("request_in_progress", "This idempotency key is busy.");
        },
        dispatch: async () => {
          throw new Error("unused");
        },
      },
    });

    const res = await sendEmail(app, tenant.sandboxKey, emailBody(), {
      "Idempotency-Key": crypto.randomUUID(),
    });

    expect(res.status).toBe(409);
    expect(res.headers.get("retry-after")).toBe("1");
    expect(await errorOf(res)).toMatchObject({
      type: "idempotency_error",
      code: "request_in_progress",
    });
  });

  test("idempotency keys are scoped to the environment", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const headers = { "Idempotency-Key": crypto.randomUUID() };

    const sandbox = await sendEmail(app, tenant.sandboxKey, emailBody(), headers);
    const from = await domainFrom(tenant.organization.id);
    const live = await sendEmail(
      app,
      tenant.liveKey,
      emailBody({ subject: "Other", from }),
      headers,
    );

    expect(sandbox.status).toBe(202);
    expect(live.status).toBe(202);
    expect(live.headers.get("idempotent-replayed")).toBeNull();
  });

  test("an unexpected failure is a generic 500 that does not leak details", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({
      emailService: {
        replay: async () => null,
        send: async () => {
          throw new Error("secret internal detail");
        },
        dispatch: async () => {
          throw new Error("unused");
        },
      },
    });
    const consoleError = spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await sendEmail(app, tenant.sandboxKey, emailBody());

      expect(res.status).toBe(500);
      const error = await errorOf(res);
      expect(error).toMatchObject({ type: "api_error", code: "internal_error" });
      expect(JSON.stringify(error)).not.toContain("secret internal detail");
      expect(String(consoleError.mock.calls[0]?.[0])).toContain(error.request_id);
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("GET /v1/emails/{id}", () => {
  test("returns an email sent from the same environment", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const sent = (await (
      await sendEmail(app, tenant.sandboxKey, emailBody())
    ).json()) as EmailObjectOutput;

    const res = await getEmailById(app, tenant.sandboxKey, sent.id);

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toMatch(REQUEST_ID);
    expect(await res.json()).toEqual(sent);
  });

  test("an email from another environment of the same project is 404", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const sent = (await (
      await sendEmail(app, tenant.sandboxKey, emailBody())
    ).json()) as EmailObjectOutput;

    const res = await getEmailById(app, tenant.liveKey, sent.id);

    expect(res.status).toBe(404);
    expect(await errorOf(res)).toMatchObject({ type: "not_found_error", code: "not_found" });
  });

  test("an email from another organization is 404", async () => {
    const [tenant, other] = await Promise.all([createTestTenant(), createTestTenant()]);
    const { app } = createTestApp();
    const sent = (await (
      await sendEmail(app, tenant.sandboxKey, emailBody())
    ).json()) as EmailObjectOutput;

    const res = await getEmailById(app, other.sandboxKey, sent.id);

    expect(res.status).toBe(404);
    expect((await errorOf(res)).type).toBe("not_found_error");
  });

  test("unknown and malformed ids are 404", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    for (const id of [
      "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
      "not-an-id",
      "proj_01k7c8m4q2f3e9v6t5r1n0p8yz",
    ]) {
      const res = await getEmailById(app, tenant.sandboxKey, id);
      expect(res.status).toBe(404);
      expect((await errorOf(res)).code).toBe("not_found");
    }
  });
});
