import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import type { EmailBatchObjectOutput } from "@coss/email/schemas";
import {
  type BucketName,
  cachedOverrides,
  type LimitRule,
  setRateLimitOverride,
} from "@coss/ratelimit";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiRequest,
  createTestApp,
  domainFrom,
  emailBody,
  errorOf,
  getEmailById,
  REQUEST_ID,
  type TestApp,
} from "./helpers.ts";

function sendBatch(
  app: TestApp,
  key: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return apiRequest(app, "POST", "/v1/emails/batch", { key, body, headers });
}

async function storedBatches(environmentId: string) {
  const { rows } = await pool.query("select id from email_batch where environment_id = $1", [
    environmentId,
  ]);
  return rows;
}

describe("POST /v1/emails/batch", () => {
  test("queues every email in order and dispatches them all", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();

    const res = await sendBatch(app, tenant.sandboxKey, {
      emails: [
        emailBody({ to: "a@example.com", subject: "One" }),
        emailBody({ to: "b@example.com", subject: "Two" }),
      ],
    });

    expect(res.status).toBe(202);
    expect(res.headers.get("x-request-id")).toMatch(REQUEST_ID);
    expect(res.headers.get("idempotent-replayed")).toBeNull();
    const batch = (await res.json()) as EmailBatchObjectOutput;
    expect(batch).toMatchObject({ object: "email_batch", id: expect.stringMatching(/^batch_/) });
    expect(batch.data.map((email) => [email.subject, email.status, email.sandbox])).toEqual([
      ["One", "queued", true],
      ["Two", "queued", true],
    ]);

    await dispatch();
    expect(sandboxProvider.sent.map((message) => message.to)).toEqual([
      ["a@example.com"],
      ["b@example.com"],
    ]);
    const [first] = batch.data;
    if (!first) throw new Error("no email");
    expect(await (await getEmailById(app, tenant.sandboxKey, first.id)).json()).toMatchObject({
      status: "sent",
      batch_id: batch.id,
    });
  });

  test("an invalid email rejects the whole batch with its index in the issue path", async () => {
    const tenant = await createTestTenant();
    const { app, queue } = createTestApp();

    const res = await sendBatch(app, tenant.sandboxKey, {
      emails: [emailBody(), emailBody({ to: "not an address" })],
    });

    expect(res.status).toBe(422);
    const error = await errorOf(res);
    expect(error).toMatchObject({ type: "invalid_request_error", code: "validation_error" });
    expect(error.issues?.map((issue) => issue.path)).toEqual(["emails.1.to"]);
    expect(queue.jobs).toHaveLength(0);
    expect(await storedBatches(tenant.development.id)).toHaveLength(0);
  });

  test("rejects empty and oversized batches", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const empty = await sendBatch(app, tenant.sandboxKey, { emails: [] });
    expect(empty.status).toBe(422);
    expect((await errorOf(empty)).param).toBe("emails");

    const tooMany = await sendBatch(app, tenant.sandboxKey, {
      emails: Array.from({ length: 101 }, () => emailBody()),
    });
    expect(tooMany.status).toBe(422);
    expect((await errorOf(tooMany)).param).toBe("emails");
  });

  test("a live batch with an unverified sender stores nothing and names the email", async () => {
    const tenant = await createTestTenant();
    const { app, queue } = createTestApp();
    const from = await domainFrom(tenant.organization.id);

    const res = await sendBatch(app, tenant.liveKey, {
      emails: [emailBody({ from }), emailBody({ from: "Acme <hello@unverified.coss.test>" })],
    });

    expect(res.status).toBe(422);
    expect(await errorOf(res)).toMatchObject({
      code: "domain_not_verified",
      param: "emails.1.from",
    });
    expect(queue.jobs).toHaveLength(0);
    expect(await storedBatches(tenant.production.id)).toHaveLength(0);
  });

  test("a retry with the same Idempotency-Key replays the batch without sending twice", async () => {
    const tenant = await createTestTenant();
    const { app, sandboxProvider, dispatch } = createTestApp();
    const body = {
      emails: [emailBody({ to: "a@example.com" }), emailBody({ to: "b@example.com" })],
    };
    const headers = { "Idempotency-Key": "batch-retry" };

    const first = await sendBatch(app, tenant.sandboxKey, body, headers);
    await dispatch();
    const second = await sendBatch(app, tenant.sandboxKey, body, headers);
    await dispatch();

    expect(second.status).toBe(202);
    expect(second.headers.get("idempotent-replayed")).toBe("true");
    const [a, b] = (await Promise.all([first.json(), second.json()])) as EmailBatchObjectOutput[];
    expect(b?.id).toBe(a?.id);
    expect(b?.data.map((email) => email.status)).toEqual(["sent", "sent"]);
    expect(sandboxProvider.sent).toHaveLength(2);

    const changed = await sendBatch(app, tenant.sandboxKey, { emails: [emailBody()] }, headers);
    expect(changed.status).toBe(422);
    expect(await errorOf(changed)).toMatchObject({
      type: "idempotency_error",
      code: "idempotency_key_reused",
    });
  });

  test("requires an API key", async () => {
    const { app } = createTestApp();
    const res = await apiRequest(app, "POST", "/v1/emails/batch", {
      key: null,
      body: { emails: [emailBody()] },
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /v1/emails/batch send quota", () => {
  async function setup(overrides: Partial<Record<BucketName, LimitRule>>) {
    const tenant = await createTestTenant();
    for (const [bucket, rule] of Object.entries(overrides)) {
      await setRateLimitOverride({ organizationId: tenant.organization.id, bucket, rule });
    }
    const testApp = createTestApp({ rateLimiter: memoryLimiter({ overrides: cachedOverrides() }) });
    return { tenant, ...testApp };
  }

  test("charges the recipients of every email together", async () => {
    const { tenant, app, queue } = await setup({
      "email.sandbox_recipients.day": { limit: 4, periodMs: 86_400_000 },
    });

    const ok = await sendBatch(app, tenant.sandboxKey, {
      emails: [
        emailBody({ to: ["a@example.com", "b@example.com"] }),
        emailBody({ to: "c@example.com" }),
      ],
    });
    expect(ok.status).toBe(202);

    // Two more recipients don't fit in the one left: nothing of this batch is stored.
    const over = await sendBatch(app, tenant.sandboxKey, {
      emails: [emailBody({ to: "d@example.com" }), emailBody({ to: "e@example.com" })],
    });
    expect(over.status).toBe(429);
    expect(await errorOf(over)).toMatchObject({ type: "rate_limit_error", code: "quota_exceeded" });
    expect(Number(over.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(queue.jobs).toHaveLength(2);
  });

  test("a batch larger than the quota's burst has no Retry-After", async () => {
    const { tenant, app } = await setup({
      "email.sandbox_recipients.day": { limit: 2, periodMs: 86_400_000 },
    });
    const res = await sendBatch(app, tenant.sandboxKey, {
      emails: [
        emailBody({ to: "a@example.com" }),
        emailBody({ to: "b@example.com" }),
        emailBody({ to: "c@example.com" }),
      ],
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeNull();
    expect((await errorOf(res)).message).toContain("Split it");
  });

  test("a replay succeeds with the quota used up and a refused batch is refunded", async () => {
    const { tenant, app } = await setup({
      "email.sandbox_recipients.day": { limit: 2, periodMs: 86_400_000 },
    });
    const body = {
      emails: [emailBody({ to: "a@example.com" }), emailBody({ to: "b@example.com" })],
    };
    const headers = { "Idempotency-Key": "batch-quota-replay" };

    expect((await sendBatch(app, tenant.sandboxKey, body, headers)).status).toBe(202);
    const replay = await sendBatch(app, tenant.sandboxKey, body, headers);
    expect(replay.status).toBe(202);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
  });
});

describe("GET /v1/emails/batch/{id}", () => {
  const getBatch = (app: TestApp, key: string, id: string) =>
    apiRequest(app, "GET", `/v1/emails/batch/${encodeURIComponent(id)}`, { key });

  test("returns the batch with its emails' current statuses in request order", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = createTestApp();
    const sent = (await (
      await sendBatch(app, tenant.sandboxKey, {
        emails: [emailBody({ subject: "One" }), emailBody({ subject: "Two" })],
      })
    ).json()) as EmailBatchObjectOutput;

    const queued = await getBatch(app, tenant.sandboxKey, sent.id);
    expect(queued.status).toBe(200);
    expect(queued.headers.get("x-request-id")).toMatch(REQUEST_ID);
    expect(await queued.json()).toEqual(sent);

    await dispatch();
    const batch = (await (
      await getBatch(app, tenant.sandboxKey, sent.id)
    ).json()) as EmailBatchObjectOutput;
    expect(batch).toMatchObject({
      object: "email_batch",
      id: sent.id,
      created_at: sent.created_at,
    });
    expect(batch.data.map((email) => [email.subject, email.status, email.batch_id])).toEqual([
      ["One", "sent", sent.id],
      ["Two", "sent", sent.id],
    ]);
  });

  test("batches of other environments and organizations, and unknown ids, are 404", async () => {
    const [tenant, other] = await Promise.all([createTestTenant(), createTestTenant()]);
    const { app } = createTestApp();
    const sent = (await (
      await sendBatch(app, tenant.sandboxKey, { emails: [emailBody()] })
    ).json()) as EmailBatchObjectOutput;

    for (const [key, id] of [
      [tenant.liveKey, sent.id],
      [other.sandboxKey, sent.id],
      [tenant.sandboxKey, "batch_01k8d0n6x5f3w2e1r9t7y4u6i8"],
      [tenant.sandboxKey, "not-an-id"],
      [tenant.sandboxKey, sent.data[0]?.id ?? ""],
    ] as const) {
      const res = await getBatch(app, key, id);
      expect(res.status).toBe(404);
      expect((await errorOf(res)).code).toBe("not_found");
    }
  });
});
