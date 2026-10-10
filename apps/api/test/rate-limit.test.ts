import { describe, expect, test } from "bun:test";
import {
  type BucketName,
  cachedOverrides,
  clientIpResolver,
  type LimitRule,
  setRateLimitOverride,
} from "@coss/ratelimit";
import { memoryLimiter, testValkeyLimiter } from "@coss/ratelimit/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiRequest,
  createTestApp,
  domainFrom,
  emailBody,
  errorOf,
  sendEmail,
  type TestApp,
} from "./helpers.ts";

const MISSING_EMAIL = "/v1/emails/email_01k7c8m4q2f3e9v6t5r1n0p8yz";

/** A tenant whose organization has the given overrides, and an app that reads them. */
async function setup(overrides: Partial<Record<BucketName, LimitRule>>) {
  const tenant = await createTestTenant();
  for (const [bucket, rule] of Object.entries(overrides)) {
    await setRateLimitOverride({ organizationId: tenant.organization.id, bucket, rule });
  }
  const testApp = createTestApp({
    rateLimiter: memoryLimiter({ overrides: cachedOverrides() }),
  });
  return { tenant, ...testApp };
}

function recipients(count: number, tag: string): string[] {
  return Array.from({ length: count }, (_, i) => `${tag}-${i}@example.com`);
}

describe("request rate limits", () => {
  test("429 rate_limited with Retry-After once the key's bucket is empty", async () => {
    const { tenant, app } = await setup({ "api.read": { limit: 2, periodMs: 60_000 } });
    const first = await apiRequest(app, "GET", MISSING_EMAIL, { key: tenant.sandboxKey });
    expect(first.status).toBe(404);
    expect(first.headers.get("ratelimit-limit")).toBe("2");
    expect(first.headers.get("ratelimit-remaining")).toBe("1");
    expect(first.headers.get("ratelimit-reset")).toBe("30");
    await apiRequest(app, "GET", MISSING_EMAIL, { key: tenant.sandboxKey });

    const limited = await apiRequest(app, "GET", MISSING_EMAIL, { key: tenant.sandboxKey });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("30");
    expect(limited.headers.get("ratelimit-remaining")).toBe("0");
    const error = await errorOf(limited);
    expect(error).toMatchObject({ type: "rate_limit_error", code: "rate_limited" });

    // Other keys and other route classes have their own buckets.
    expect((await apiRequest(app, "GET", MISSING_EMAIL, { key: tenant.liveKey })).status).toBe(404);
    const write = await apiRequest(app, "POST", "/v1/suppressions", {
      key: tenant.sandboxKey,
      body: { address: "someone@example.com" },
    });
    expect(write.status).toBe(201);
    expect(write.headers.get("ratelimit-limit")).toBe("30");
  });

  test("bulk suppression import and export use the write and read buckets", async () => {
    const { tenant, app } = await setup({
      "api.write": { limit: 1, periodMs: 60_000 },
      "api.read": { limit: 1, periodMs: 60_000 },
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      const imported = await apiRequest(app, "POST", "/v1/suppressions/import", {
        key: tenant.sandboxKey,
        body: { suppressions: [{ address: "bulk@example.com" }] },
      });
      const exported = await apiRequest(app, "GET", "/v1/suppressions/export", {
        key: tenant.sandboxKey,
      });
      expect(imported.status).toBe(attempt === 0 ? 200 : 429);
      expect(exported.status).toBe(attempt === 0 ? 200 : 429);
      await imported.text();
      await exported.text();
    }
  });

  test("authentication runs first: a bad key never spends a bucket", async () => {
    const { tenant, app } = await setup({ "api.read": { limit: 1, periodMs: 60_000 } });
    const bad = await apiRequest(app, "GET", MISSING_EMAIL, { key: "coss_test_nope" });
    expect(bad.status).toBe(401);
    expect(bad.headers.get("ratelimit-limit")).toBeNull();
    expect((await apiRequest(app, "GET", MISSING_EMAIL, { key: tenant.sandboxKey })).status).toBe(
      404,
    );
  });

  test("works against Valkey", async () => {
    const tenant = await createTestTenant();
    await setRateLimitOverride({
      organizationId: tenant.organization.id,
      bucket: "api.read",
      rule: { limit: 1, periodMs: 60_000 },
    });
    const limiter = await testValkeyLimiter({ overrides: cachedOverrides() });
    try {
      const { app } = createTestApp({ rateLimiter: limiter });
      expect((await apiRequest(app, "GET", MISSING_EMAIL, { key: tenant.sandboxKey })).status).toBe(
        404,
      );
      const limited = await apiRequest(app, "GET", MISSING_EMAIL, { key: tenant.sandboxKey });
      expect(limited.status).toBe(429);
      expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(55);
    } finally {
      await limiter.close();
    }
  });
});

describe("send quota", () => {
  test("counts distinct recipients across to, cc and bcc", async () => {
    const { tenant, app } = await setup({
      "email.sandbox_recipients.day": { limit: 5, periodMs: 86_400_000 },
    });
    const ok = await sendEmail(
      app,
      tenant.sandboxKey,
      emailBody({
        to: ["a@example.com", "A@example.com"],
        cc: "b@example.com",
        bcc: "c@example.com",
      }),
    );
    expect(ok.status).toBe(202);

    const over = await sendEmail(app, tenant.sandboxKey, emailBody({ to: recipients(3, "x") }));
    expect(over.status).toBe(429);
    const error = await errorOf(over);
    expect(error).toMatchObject({ type: "rate_limit_error", code: "quota_exceeded" });
    expect(error.message).toContain("email.sandbox_recipients.day");
    expect(Number(over.headers.get("retry-after"))).toBeGreaterThan(3600);

    // What still fits is still accepted.
    expect(
      (await sendEmail(app, tenant.sandboxKey, emailBody({ to: recipients(2, "y") }))).status,
    ).toBe(202);
  });

  test("an email larger than the quota's burst has no Retry-After", async () => {
    const { tenant, app } = await setup({
      "email.sandbox_recipients.day": { limit: 3, periodMs: 86_400_000 },
    });
    const response = await sendEmail(app, tenant.sandboxKey, emailBody({ to: recipients(4, "z") }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeNull();
    expect((await errorOf(response)).message).toContain("more recipients than");
  });

  test("live sends count against the organization, across environments' keys", async () => {
    const { tenant, app } = await setup({
      "email.recipients.day": { limit: 3, periodMs: 86_400_000 },
    });
    const from = await domainFrom(tenant.organization.id);
    expect(
      (await sendEmail(app, tenant.liveKey, emailBody({ from, to: recipients(3, "l") }))).status,
    ).toBe(202);
    const over = await sendEmail(app, tenant.liveKey, emailBody({ from }));
    expect(over.status).toBe(429);
    // The sandbox quota is separate.
    expect((await sendEmail(app, tenant.sandboxKey, emailBody())).status).toBe(202);
  });

  for (const mode of ["live", "sandbox"] as const) {
    test(`${mode} queued and completed replays succeed with exhausted recipient quota`, async () => {
      const { tenant, app, liveProvider, sandboxProvider, dispatch } = await setup({
        [mode === "live" ? "email.recipients.day" : "email.sandbox_recipients.day"]: {
          limit: 1,
          periodMs: 86_400_000,
        },
      });
      const key = mode === "live" ? tenant.liveKey : tenant.sandboxKey;
      const provider = mode === "live" ? liveProvider : sandboxProvider;
      const body = emailBody({ from: await domainFrom(tenant.organization.id) });
      const headers = { "Idempotency-Key": "exhausted-quota-replay" };
      const first = await sendEmail(app, key, body, headers);
      expect(first.status).toBe(202);
      const original = (await first.json()) as { id: string };

      for (let attempt = 0; attempt < 2; attempt++) {
        const replay = await sendEmail(app, key, body, headers);
        expect(replay.status).toBe(202);
        expect(replay.headers.get("idempotent-replayed")).toBe("true");
        expect(await replay.json()).toEqual(original);
      }

      // Replays must neither dispatch again nor refund quota they did not consume.
      for (const [requestBody, requestHeaders] of [
        [body, {}],
        [body, { "Idempotency-Key": "new-send" }],
        [{ ...body, subject: "Different request" }, headers],
      ] as const) {
        const rejected = await sendEmail(app, key, requestBody, requestHeaders);
        expect(rejected.status).toBe(429);
        expect(await errorOf(rejected)).toMatchObject({ code: "quota_exceeded" });
      }
      expect(provider.sent).toHaveLength(0);
      await dispatch();
      const completed = await sendEmail(app, key, body, headers);
      expect(completed.status).toBe(202);
      expect(completed.headers.get("idempotent-replayed")).toBe("true");
      expect(await completed.json()).toMatchObject({ id: original.id, status: "sent" });
      await dispatch();
      expect(provider.sent).toHaveLength(1);
    });
  }

  test("idempotent replays and rejected sends are not charged", async () => {
    const { tenant, app } = await setup({
      "email.recipients.day": { limit: 4, periodMs: 86_400_000 },
    });
    const from = await domainFrom(tenant.organization.id);
    const body = emailBody({ from, to: recipients(2, "r") });
    const headers = { "Idempotency-Key": "quota-replay" };
    expect((await sendEmail(app, tenant.liveKey, body, headers)).status).toBe(202);
    const replay = await sendEmail(app, tenant.liveKey, body, headers);
    expect(replay.status).toBe(202);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");

    // Not a verified domain: 422, and the recipients are given back.
    const rejected = await sendEmail(
      app,
      tenant.liveKey,
      emailBody({ from: "x@unverified.example", to: recipients(2, "u") }),
    );
    expect(rejected.status).toBe(422);

    expect(
      (await sendEmail(app, tenant.liveKey, emailBody({ from, to: recipients(2, "s") }))).status,
    ).toBe(202);
    expect((await sendEmail(app, tenant.liveKey, emailBody({ from }))).status).toBe(429);
  });
});

describe("failed authentication per client IP", () => {
  async function attempts(app: TestApp, ip: string, count: number): Promise<number[]> {
    const statuses: number[] = [];
    for (let i = 0; i < count; i++) {
      const response = await apiRequest(app, "GET", MISSING_EMAIL, {
        key: `coss_test_${"x".repeat(64)}`,
        headers: { "X-Forwarded-For": `203.0.113.9, ${ip}` },
      });
      statuses.push(response.status);
    }
    return statuses;
  }

  test("cuts an address off after 30 invalid keys a minute", async () => {
    const { app } = createTestApp({
      rateLimiter: memoryLimiter(),
      clientIp: clientIpResolver({ header: "x-forwarded-for" }),
    });
    const statuses = await attempts(app, "198.51.100.7", 31);
    expect(statuses.slice(0, 30).every((status) => status === 401)).toBe(true);
    expect(statuses[30]).toBe(429);

    const tenant = await createTestTenant();
    const cutOff = await apiRequest(app, "GET", MISSING_EMAIL, {
      key: tenant.sandboxKey,
      headers: { "X-Forwarded-For": "198.51.100.7" },
    });
    expect(cutOff.status).toBe(429);
    expect(await errorOf(cutOff)).toMatchObject({ code: "too_many_failed_authentications" });
    // Another address is unaffected; the spoofable left part of the header is ignored.
    expect(await attempts(app, "198.51.100.8", 1)).toEqual([401]);
  });

  test("is off without a client IP header", async () => {
    const { app } = createTestApp({ rateLimiter: memoryLimiter() });
    const statuses = await attempts(app, "198.51.100.9", 31);
    expect(statuses.every((status) => status === 401)).toBe(true);
  });
});
