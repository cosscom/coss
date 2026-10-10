import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { EmailError } from "../src/errors.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { createEmailService, IDEMPOTENCY_KEY_TTL_MS } from "../src/service.ts";
import { gatedProvider, params, sendEnvironment, verifiedFrom } from "./helpers.ts";

async function loadRow(id: string) {
  const [row] = await db.select().from(schema.email).where(eq(schema.email.id, id));
  if (!row) throw new Error(`email ${id} not found`);
  return row;
}

function fakeProviders() {
  const liveProvider = new FakeEmailProvider({ log: false });
  const sandboxProvider = new FakeEmailProvider({ log: false });
  return {
    liveProvider,
    sandboxProvider,
    service: createEmailService({ liveProvider, sandboxProvider }),
  };
}

async function expectEmailError(promise: Promise<unknown>, code: EmailError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(EmailError);
  expect((error as EmailError).code).toBe(code);
  return error as EmailError;
}

describe("send", () => {
  test("stores the email, sends it and records the provider message id", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const apiKeyId = newId("key");

    const { email, replayed } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId,
      params: params({ cc: "copy@example.com", headers: { "X-Campaign": "fall" } }),
    });

    expect(replayed).toBe(false);
    expect(email).toMatchObject({
      object: "email",
      from: "Acme <hello@acme.com>",
      to: ["user@example.com"],
      cc: ["copy@example.com"],
      bcc: [],
      reply_to: [],
      subject: "Welcome",
      html: null,
      text: "Hello!",
      headers: { "x-campaign": "fall" },
      tags: [],
      status: "sent",
      sandbox: true,
    });
    expect(email.id).toStartWith("email_");
    expect(Date.parse(email.created_at)).not.toBeNaN();
    expect(Date.parse(email.sent_at ?? "")).not.toBeNaN();

    const row = await loadRow(email.id);
    expect(row).toMatchObject({
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      environmentId: tenant.development.id,
      apiKeyId,
      status: "sent",
      provider: "fake",
      errorCode: null,
      idempotencyKey: null,
      requestHash: null,
    });
    expect(row.providerMessageId).toMatch(/^fake_[0-9a-f-]{36}$/);
    expect(sandboxProvider.sent).toHaveLength(1);
    expect(sandboxProvider.sent[0]).toMatchObject({
      emailId: email.id,
      cc: ["copy@example.com"],
      replyTo: [],
      headers: { "x-campaign": "fall" },
    });
  });

  test("sandbox always uses the sandbox provider; live uses the live provider", async () => {
    const tenant = await createTestTenant();
    const live = gatedProvider("live-test");
    live.release();
    const sandboxProvider = new FakeEmailProvider({ log: false });
    const service = createEmailService({ liveProvider: live.provider, sandboxProvider });

    const sandboxed = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });
    expect(sandboxed.email).toMatchObject({ status: "sent", sandbox: true });
    expect(sandboxProvider.sent.map((m) => m.emailId)).toEqual([sandboxed.email.id]);
    expect(live.sent).toHaveLength(0);

    const delivered = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ from: await verifiedFrom(tenant.organization.id, "live-test") }),
    });
    expect(delivered.email).toMatchObject({ status: "sent", sandbox: false });
    expect(live.sent.map((m) => m.emailId)).toEqual([delivered.email.id]);
    expect(sandboxProvider.sent).toHaveLength(1);
    expect(await loadRow(delivered.email.id)).toMatchObject({
      provider: "live-test",
      providerMessageId: "live-test_1",
    });
  });

  test("records provider failures on the email", async () => {
    const tenant = await createTestTenant();
    const failing = new FakeEmailProvider({ log: false, fail: () => true });
    const service = createEmailService({ liveProvider: failing, sandboxProvider: failing });

    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });

    expect(email).toMatchObject({ status: "failed", sent_at: null });
    expect(await loadRow(email.id)).toMatchObject({
      status: "failed",
      provider: "fake",
      providerMessageId: null,
      errorCode: "provider_error",
      errorMessage: `Fake provider rejected ${email.id}.`,
      sentAt: null,
    });
    expect(failing.sent).toHaveLength(0);
  });
});

describe("idempotency", () => {
  test("replays the same request without sending again", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const environment = sendEnvironment(tenant.development);
    const idempotencyKey = `key-${uniqueSuffix()}`;

    const first = await service.send({
      environment,
      apiKeyId: null,
      params: params({ to: "user@example.com", headers: { "X-A": "1" } }),
      idempotencyKey,
    });
    // Same request, spelled differently.
    const second = await service.send({
      environment,
      apiKeyId: null,
      params: params({ to: ["user@example.com"], headers: { "x-a": "1" }, cc: [] }),
      idempotencyKey,
    });

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.email).toEqual(first.email);
    expect(sandboxProvider.sent).toHaveLength(1);
    expect(await loadRow(first.email.id)).toMatchObject({
      idempotencyKey,
      requestHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  test("rejects the same key with a different body", async () => {
    const tenant = await createTestTenant();
    const { service } = fakeProviders();
    const environment = sendEnvironment(tenant.development);
    const idempotencyKey = `key-${uniqueSuffix()}`;

    await service.send({ environment, apiKeyId: null, params: params(), idempotencyKey });
    const error = await expectEmailError(
      service.send({
        environment,
        apiKeyId: null,
        params: params({ subject: "Different" }),
        idempotencyKey,
      }),
      "idempotency_key_reused",
    );
    expect(error.status).toBe(422);
  });

  test("reports a request that is still in progress", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider();
    const service = createEmailService({
      liveProvider: gated.provider,
      sandboxProvider: gated.provider,
    });
    const environment = sendEnvironment(tenant.development);
    const idempotencyKey = `key-${uniqueSuffix()}`;

    const first = service.send({ environment, apiKeyId: null, params: params(), idempotencyKey });
    await gated.called;

    const error = await expectEmailError(
      service.send({ environment, apiKeyId: null, params: params(), idempotencyKey }),
      "request_in_progress",
    );
    expect(error.status).toBe(409);

    gated.release();
    const done = await first;
    expect(done).toMatchObject({ replayed: false, email: { status: "sent" } });

    const retried = await service.send({
      environment,
      apiKeyId: null,
      params: params(),
      idempotencyKey,
    });
    expect(retried).toEqual({ email: done.email, replayed: true });
    expect(gated.sent).toHaveLength(1);
  });

  test("concurrent requests with one key send exactly once", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const environment = sendEnvironment(tenant.development);
    const idempotencyKey = `key-${uniqueSuffix()}`;

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        service.send({ environment, apiKeyId: null, params: params(), idempotencyKey }),
      ),
    );

    const fulfilled = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const rejected = results.flatMap((r) => (r.status === "rejected" ? [r.reason] : []));
    expect(fulfilled.filter((r) => !r.replayed)).toHaveLength(1);
    expect(new Set(fulfilled.map((r) => r.email.id)).size).toBe(1);
    for (const reason of rejected) {
      expect(reason).toBeInstanceOf(EmailError);
      expect((reason as EmailError).code).toBe("request_in_progress");
    }
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("an expired key starts a fresh email", async () => {
    const tenant = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const environment = sendEnvironment(tenant.development);
    const idempotencyKey = `key-${uniqueSuffix()}`;

    const first = await service.send({
      environment,
      apiKeyId: null,
      params: params(),
      idempotencyKey,
    });
    await db
      .update(schema.email)
      .set({ createdAt: new Date(Date.now() - IDEMPOTENCY_KEY_TTL_MS - 60_000) })
      .where(eq(schema.email.id, first.email.id));

    // Even a different body is fine once the key expired.
    const second = await service.send({
      environment,
      apiKeyId: null,
      params: params({ subject: "Again" }),
      idempotencyKey,
    });

    expect(second.replayed).toBe(false);
    expect(second.email.id).not.toBe(first.email.id);
    expect(second.email).toMatchObject({ subject: "Again", status: "sent" });
    expect((await loadRow(first.email.id)).idempotencyKey).toBeNull();
    expect((await loadRow(second.email.id)).idempotencyKey).toBe(idempotencyKey);
    expect(sandboxProvider.sent).toHaveLength(2);
  });

  test("keys are scoped to the environment", async () => {
    const tenant = await createTestTenant();
    const { service } = fakeProviders();
    const idempotencyKey = `key-${uniqueSuffix()}`;

    const dev = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
      idempotencyKey,
    });
    const prod = await service.send({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      params: params({ subject: "Other", from: await verifiedFrom(tenant.organization.id) }),
      idempotencyKey,
    });
    expect(prod.replayed).toBe(false);
    expect(prod.email.id).not.toBe(dev.email.id);
  });
});

describe("dispatch", () => {
  test("is scoped by organization and leaves finished emails alone", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { service, sandboxProvider } = fakeProviders();
    const { email } = await service.send({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      params: params(),
    });

    expect(
      await service.dispatch({ organizationId: tenant.organization.id, emailId: email.id }),
    ).toEqual(email);
    expect(sandboxProvider.sent).toHaveLength(1);

    for (const input of [
      { organizationId: other.organization.id, emailId: email.id },
      { organizationId: tenant.organization.id, emailId: "not-an-id" },
      { organizationId: tenant.organization.id, emailId: newId("email") },
    ]) {
      await expectEmailError(service.dispatch(input), "not_found");
    }
  });

  test("delivers a queued email", async () => {
    const tenant = await createTestTenant();
    const { service, liveProvider } = fakeProviders();
    const [row] = await db
      .insert(schema.email)
      .values({
        organizationId: tenant.organization.id,
        projectId: tenant.project.id,
        environmentId: tenant.production.id,
        from: "hello@acme.com",
        to: ["user@example.com"],
        subject: "Queued",
        text: "Hi",
      })
      .returning();
    if (!row) throw new Error("insert failed");

    const email = await service.dispatch({
      organizationId: tenant.organization.id,
      emailId: row.id,
    });
    expect(email).toMatchObject({ id: row.id, status: "sent", sandbox: false });
    expect(liveProvider.sent.map((m) => m.emailId)).toEqual([row.id]);
  });

  test("concurrent dispatchers send an email only once", async () => {
    const tenant = await createTestTenant();
    const gated = gatedProvider();
    const service = createEmailService({
      liveProvider: gated.provider,
      sandboxProvider: new FakeEmailProvider({ log: false }),
    });
    const [row] = await db
      .insert(schema.email)
      .values({
        organizationId: tenant.organization.id,
        projectId: tenant.project.id,
        environmentId: tenant.production.id,
        from: "hello@acme.com",
        to: ["user@example.com"],
        subject: "Race",
        text: "Hi",
      })
      .returning();
    if (!row) throw new Error("insert failed");
    const input = { organizationId: tenant.organization.id, emailId: row.id };

    const first = service.dispatch(input);
    await gated.called; // the first dispatcher has claimed the email and is inside provider.send
    const second = await service.dispatch(input);
    expect(second.status).toBe("queued");
    gated.release();
    expect((await first).status).toBe("sent");
    expect(gated.sent).toHaveLength(1);
  });
});
