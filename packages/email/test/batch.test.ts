import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { uniqueSuffix } from "@coss/db/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { EmailError } from "../src/errors.ts";
import { FakeEmailProvider } from "../src/providers/fake.ts";
import { CreateSuppressionRequest } from "../src/schemas.ts";
import { createEmailService, IDEMPOTENCY_KEY_TTL_MS } from "../src/service.ts";
import { addSuppression } from "../src/suppressions.ts";
import { memoryDispatchQueue } from "../src/testing.ts";
import { params, sendEnvironment, verifiedFrom } from "./helpers.ts";

function fakeProviders() {
  const liveProvider = new FakeEmailProvider({ log: false });
  const sandboxProvider = new FakeEmailProvider({ log: false });
  const queue = memoryDispatchQueue();
  return {
    liveProvider,
    sandboxProvider,
    queue,
    service: createEmailService({ liveProvider, sandboxProvider, queue }),
  };
}

async function batchEmails(batchId: string) {
  return db.select().from(schema.email).where(eq(schema.email.batchId, batchId));
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

describe("sendBatch", () => {
  test("stores every email in request order and enqueues each dispatch", async () => {
    const tenant = await createTestTenant();
    const { service, queue, sandboxProvider } = fakeProviders();
    const apiKeyId = newId("key");

    const { batch, replayed } = await service.sendBatch({
      environment: sendEnvironment(tenant.development),
      apiKeyId,
      emails: [
        params({ to: "a@example.com", subject: "One" }),
        params({ to: "b@example.com", subject: "Two" }),
        params({ to: "c@example.com", subject: "Three" }),
      ],
    });

    expect(replayed).toBe(false);
    expect(batch.object).toBe("email_batch");
    expect(batch.id).toStartWith("batch_");
    expect(batch.data.map((email) => [email.subject, email.status, email.batch_id])).toEqual([
      ["One", "queued", batch.id],
      ["Two", "queued", batch.id],
      ["Three", "queued", batch.id],
    ]);
    const rows = await batchEmails(batch.id);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toMatchObject({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        apiKeyId,
        idempotencyKey: null,
      });
    }
    expect(queue.jobs.map((job) => job.emailId)).toEqual(batch.data.map((email) => email.id));

    await queue.drain(service);
    expect(sandboxProvider.sent.map((message) => message.to)).toEqual([
      ["a@example.com"],
      ["b@example.com"],
      ["c@example.com"],
    ]);
  });

  test("applies suppressions and scheduling per email", async () => {
    const tenant = await createTestTenant();
    const { service, queue } = fakeProviders();
    await addSuppression(
      { organizationId: tenant.organization.id, environmentId: tenant.development.id },
      CreateSuppressionRequest.parse({ address: "gone@example.com" }),
    );
    const later = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { batch } = await service.sendBatch({
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      emails: [
        params({ to: ["gone@example.com", "here@example.com"] }),
        params({ scheduled_at: later }),
      ],
    });

    expect(batch.data[0]?.recipients).toMatchObject([
      { address: "gone@example.com", status: "suppressed" },
      { address: "here@example.com", status: "queued" },
    ]);
    expect(batch.data[1]?.status).toBe("scheduled");
    // Only the immediate email is enqueued; the scheduled one waits for the worker.
    expect(queue.jobs.map((job) => job.emailId)).toEqual([batch.data[0]?.id ?? "missing"]);
  });

  test("a live batch with one unverified sender stores nothing", async () => {
    const tenant = await createTestTenant();
    const { service, queue } = fakeProviders();
    const from = await verifiedFrom(tenant.organization.id);

    const error = await expectEmailError(
      service.sendBatch({
        environment: sendEnvironment(tenant.production),
        apiKeyId: null,
        emails: [
          params({ from }),
          params({ from: `Acme <hello@unverified-${uniqueSuffix()}.test>` }),
        ],
      }),
      "domain_not_verified",
    );

    expect(error.param).toBe("emails.1.from");
    expect(queue.jobs).toHaveLength(0);
    const stored = await db
      .select()
      .from(schema.emailBatch)
      .where(eq(schema.emailBatch.environmentId, tenant.production.id));
    expect(stored).toHaveLength(0);
  });

  test("a live batch from a verified domain is sent by the live provider", async () => {
    const tenant = await createTestTenant();
    const { service, queue, liveProvider } = fakeProviders();
    const from = await verifiedFrom(tenant.organization.id);

    const { batch } = await service.sendBatch({
      environment: sendEnvironment(tenant.production),
      apiKeyId: null,
      emails: [params({ from }), params({ from, to: "other@example.com" })],
    });
    await queue.drain(service);

    expect(batch.data.every((email) => !email.sandbox)).toBe(true);
    expect(liveProvider.sent).toHaveLength(2);
  });
});

describe("sendBatch idempotency", () => {
  test("replays the same batch without storing or enqueuing again", async () => {
    const tenant = await createTestTenant();
    const { service, queue } = fakeProviders();
    const input = {
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      emails: [params({ to: "a@example.com" }), params({ to: "b@example.com" })],
      idempotencyKey: `key-${uniqueSuffix()}`,
    };

    const first = await service.sendBatch(input);
    const second = await service.sendBatch(input);

    expect(second.replayed).toBe(true);
    expect(second.batch.id).toBe(first.batch.id);
    expect(second.batch.data.map((email) => email.id)).toEqual(
      first.batch.data.map((email) => email.id),
    );
    expect(queue.jobs).toHaveLength(2);
    expect(await service.replayBatch(input)).toMatchObject({ id: first.batch.id });
  });

  test("rejects the same key with a different batch", async () => {
    const tenant = await createTestTenant();
    const { service } = fakeProviders();
    const environment = sendEnvironment(tenant.development);
    const idempotencyKey = `key-${uniqueSuffix()}`;

    await service.sendBatch({ environment, apiKeyId: null, emails: [params()], idempotencyKey });
    await expectEmailError(
      service.sendBatch({
        environment,
        apiKeyId: null,
        emails: [params(), params({ to: "b@example.com" })],
        idempotencyKey,
      }),
      "idempotency_key_reused",
    );
  });

  test("concurrent requests with one key store the batch exactly once", async () => {
    const tenant = await createTestTenant();
    const { service, queue } = fakeProviders();
    const input = {
      environment: sendEnvironment(tenant.development),
      apiKeyId: null,
      emails: [params({ to: "a@example.com" }), params({ to: "b@example.com" })],
      idempotencyKey: `key-${uniqueSuffix()}`,
    };

    const results = await Promise.all([1, 2, 3, 4].map(() => service.sendBatch(input)));

    expect(new Set(results.map((result) => result.batch.id)).size).toBe(1);
    expect(results.filter((result) => !result.replayed)).toHaveLength(1);
    expect(queue.jobs).toHaveLength(2);
  });

  test("an expired key starts a fresh batch", async () => {
    const tenant = await createTestTenant();
    const { service } = fakeProviders();
    const environment = sendEnvironment(tenant.development);
    const idempotencyKey = `key-${uniqueSuffix()}`;

    const first = await service.sendBatch({
      environment,
      apiKeyId: null,
      emails: [params()],
      idempotencyKey,
    });
    await db
      .update(schema.emailBatch)
      .set({ createdAt: new Date(Date.now() - IDEMPOTENCY_KEY_TTL_MS - 60_000) })
      .where(eq(schema.emailBatch.id, first.batch.id));

    const second = await service.sendBatch({
      environment,
      apiKeyId: null,
      emails: [params({ subject: "Again" })],
      idempotencyKey,
    });

    expect(second.replayed).toBe(false);
    expect(second.batch.id).not.toBe(first.batch.id);
    const [old] = await db
      .select()
      .from(schema.emailBatch)
      .where(eq(schema.emailBatch.id, first.batch.id));
    expect(old?.idempotencyKey).toBeNull();
  });

  test("batch keys and single-send keys don't collide", async () => {
    const tenant = await createTestTenant();
    const { service } = fakeProviders();
    const environment = sendEnvironment(tenant.development);
    const idempotencyKey = `key-${uniqueSuffix()}`;

    const single = await service.send({
      environment,
      apiKeyId: null,
      params: params(),
      idempotencyKey,
    });
    const batch = await service.sendBatch({
      environment,
      apiKeyId: null,
      emails: [params()],
      idempotencyKey,
    });

    expect(batch.replayed).toBe(false);
    expect(batch.batch.data[0]?.id).not.toBe(single.email.id);
  });
});
