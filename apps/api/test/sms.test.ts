import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { memoryLogWriter } from "@coss/logs/testing";
import { cachedOverrides, setRateLimitOverride } from "@coss/ratelimit";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { SMS_SIMULATOR } from "@coss/sms/schemas";
import { createTestSmsNumber, testPhoneNumber, useTestTwilioAccount } from "@coss/sms/testing";
import { twilioSignature } from "@coss/sms/twilio";
import { createEnvironmentApiKey } from "@coss/tenancy";
import { createTestTenant } from "@coss/tenancy/testing";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import { apiRequest, createTestApp, errorOf, waitForLogLines } from "./helpers.ts";

const sms = (to: string = SMS_SIMULATOR.delivered, extra: Record<string, unknown> = {}) => ({
  from: "+14155550123",
  to,
  body: "Your code is 123456",
  ...extra,
});

describe("POST /v1/sms", () => {
  test("a sandbox send is queued, then delivered by the simulator", async () => {
    const tenant = await createTestTenant();
    const { app, dispatchSms } = createTestApp();
    const response = await apiRequest(app, "POST", "/v1/sms", {
      key: tenant.sandboxKey,
      body: sms(),
    });
    expect(response.status).toBe(202);
    const queued = await response.json();
    expect(queued).toMatchObject({
      object: "sms",
      status: "queued",
      segments: 1,
      encoding: "gsm7",
      country: "US",
      sandbox: true,
    });
    await dispatchSms();
    const read = await apiRequest(app, "GET", `/v1/sms/${queued.id}`, { key: tenant.sandboxKey });
    expect(await read.json()).toMatchObject({ id: queued.id, status: "delivered" });
    const events = await apiRequest(app, "GET", `/v1/sms/${queued.id}/events`, {
      key: tenant.sandboxKey,
    });
    expect((await events.json()).data.map((event: { type: string }) => event.type)).toEqual([
      "sms.sent",
      "sms.delivered",
    ]);
    const list = await apiRequest(app, "GET", "/v1/sms?status=delivered", {
      key: tenant.sandboxKey,
    });
    expect(await list.json()).toMatchObject({
      object: "list",
      data: [{ id: queued.id }],
      has_more: false,
    });
  });

  test("validation: E.164 numbers, at most 10 segments", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const badTo = await apiRequest(app, "POST", "/v1/sms", {
      key: tenant.sandboxKey,
      body: sms("4155550199"),
    });
    expect(badTo.status).toBe(422);
    expect((await errorOf(badTo)).code).toBe("validation_error");
    const long = await apiRequest(app, "POST", "/v1/sms", {
      key: tenant.sandboxKey,
      body: sms(undefined, { body: "✓".repeat(700) }),
    });
    expect(long.status).toBe(422);
    const invalid = await apiRequest(app, "POST", "/v1/sms", {
      key: tenant.sandboxKey,
      body: sms("+1415555"),
    });
    expect(invalid.status).toBe(422);
  });

  test("live keys need one of the organization's numbers", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const refused = await apiRequest(app, "POST", "/v1/sms", { key: tenant.liveKey, body: sms() });
    expect(refused.status).toBe(422);
    expect(await errorOf(refused)).toMatchObject({
      type: "invalid_request_error",
      code: "sender_not_found",
      param: "from",
    });
    const number = await createTestSmsNumber(tenant.organization.id);
    const accepted = await apiRequest(app, "POST", "/v1/sms", {
      key: tenant.liveKey,
      body: { ...sms(testPhoneNumber()), from: number.phoneNumber },
    });
    expect(accepted.status).toBe(202);
    const toGb = await apiRequest(app, "POST", "/v1/sms", {
      key: tenant.liveKey,
      body: { ...sms("+447400123456"), from: number.phoneNumber },
    });
    expect(await errorOf(toGb)).toMatchObject({ code: "country_not_allowed", param: "to" });
  });

  test("idempotency keys replay; the send quota counts segments and refunds replays", async () => {
    const tenant = await createTestTenant();
    await setRateLimitOverride({
      organizationId: tenant.organization.id,
      bucket: "sms.sandbox_segments.day",
      rule: { limit: 3, periodMs: 86_400_000 },
    });
    const { app } = createTestApp({ rateLimiter: memoryLimiter({ overrides: cachedOverrides() }) });
    const send = (key: string, body = sms()) =>
      apiRequest(app, "POST", "/v1/sms", {
        key: tenant.sandboxKey,
        body,
        headers: { "Idempotency-Key": key },
      });
    const first = await send("a");
    const replay = await send("a");
    expect(replay.status).toBe(202);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect((await replay.json()).id).toBe((await first.json()).id);
    // Two segments: the quota (3) is used up.
    expect((await send("b", sms(undefined, { body: "a".repeat(200) }))).status).toBe(202);
    const over = await send("c");
    expect(over.status).toBe(429);
    expect((await errorOf(over)).code).toBe("quota_exceeded");
  });

  test("a key without sms:send is refused", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = await createEnvironmentApiKey({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      name: "Email only",
      userId: tenant.owner.id,
      permissions: { email: ["send", "read"] },
    });
    const response = await apiRequest(app, "POST", "/v1/sms", { key: created.key, body: sms() });
    expect(response.status).toBe(403);
    expect((await errorOf(response)).message).toContain("sms:send");
  });
});

test("scheduled messages can be canceled", async () => {
  const tenant = await createTestTenant();
  const { app } = createTestApp();
  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const created = await (
    await apiRequest(app, "POST", "/v1/sms", {
      key: tenant.sandboxKey,
      body: sms(undefined, { scheduled_at: scheduledAt }),
    })
  ).json();
  expect(created.status).toBe("scheduled");
  const canceled = await apiRequest(app, "POST", `/v1/sms/${created.id}/cancel`, {
    key: tenant.sandboxKey,
  });
  expect(await canceled.json()).toMatchObject({ status: "canceled" });
  const missing = await apiRequest(app, "GET", "/v1/sms/sms_01k7c8m4q2f3e9v6t5r1n0p8yz", {
    key: tenant.sandboxKey,
  });
  expect(missing.status).toBe(404);
});

test("SMS suppressions: add, check, list, remove", async () => {
  const tenant = await createTestTenant();
  const { app } = createTestApp();
  const number = testPhoneNumber();
  const created = await apiRequest(app, "POST", "/v1/sms/suppressions", {
    key: tenant.sandboxKey,
    body: { phone_number: number },
  });
  expect(created.status).toBe(201);
  const entry = await created.json();
  expect(entry).toMatchObject({
    object: "sms_suppression",
    phone_number: number,
    reason: "manual",
  });
  const again = await apiRequest(app, "POST", "/v1/sms/suppressions", {
    key: tenant.sandboxKey,
    body: { phone_number: number },
  });
  expect(again.status).toBe(200);
  const check = await apiRequest(
    app,
    "GET",
    `/v1/sms/suppressions/check?phone_number=${encodeURIComponent(number)}`,
    { key: tenant.sandboxKey },
  );
  expect(await check.json()).toMatchObject({ suppressed: true, suppression: { id: entry.id } });
  const list = await apiRequest(app, "GET", "/v1/sms/suppressions", { key: tenant.sandboxKey });
  expect((await list.json()).data).toHaveLength(1);
  const removed = await apiRequest(app, "DELETE", `/v1/sms/suppressions/${entry.id}`, {
    key: tenant.sandboxKey,
  });
  expect(await removed.json()).toEqual({ object: "sms_suppression", id: entry.id, deleted: true });
});

test("numbers and received messages, whose text never reaches the log", async () => {
  const tenant = await createTestTenant();
  const writer = memoryLogWriter();
  const { app, dispatchSms } = createTestApp({ logWriter: writer });
  await createTestSmsNumber(tenant.organization.id, {
    receivingEnvironmentId: tenant.production.id,
  });
  const numbers = await (
    await apiRequest(app, "GET", "/v1/sms/numbers", { key: tenant.liveKey })
  ).json();
  expect(numbers.data).toMatchObject([
    {
      object: "sms_number",
      status: "active",
      registration_status: "approved",
      can_send: true,
      receives_here: true,
    },
  ]);
  await apiRequest(app, "POST", "/v1/sms", {
    key: tenant.sandboxKey,
    body: sms(SMS_SIMULATOR.reply),
  });
  await dispatchSms();
  const received = await (
    await apiRequest(app, "GET", "/v1/sms/received", { key: tenant.sandboxKey })
  ).json();
  expect(received.data).toMatchObject([
    { object: "received_sms", from: SMS_SIMULATOR.reply, sandbox: true },
  ]);
  const one = await apiRequest(app, "GET", `/v1/sms/received/${received.data[0].id}`, {
    key: tenant.sandboxKey,
  });
  expect(one.status).toBe(200);
  const lines = await waitForLogLines(writer, 4);
  const reads = lines.filter((line) => line.path?.startsWith("/v1/sms/received"));
  expect(reads).toHaveLength(2);
  expect(JSON.stringify(reads)).not.toContain(received.data[0].body);
});

describe("Twilio callbacks", () => {
  test("are verified against the subaccount's token, then recorded", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id, {
      provider: "twilio",
      receivingEnvironmentId: tenant.production.id,
    });
    const { accountSid, authToken } = await useTestTwilioAccount(
      tenant.organization.id,
      TEST_SECRETS_KEYS,
    );
    const { app } = createTestApp();
    const url = "http://localhost/sms/twilio/inbound";
    const params = {
      AccountSid: accountSid,
      MessageSid: `SM${randomUUID().replaceAll("-", "")}`,
      From: testPhoneNumber(),
      To: number.phoneNumber,
      Body: "Thanks!",
    };
    const post = (signature: string) =>
      app.request(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-twilio-signature": signature,
        },
        body: new URLSearchParams(params).toString(),
      });
    expect((await post("forged")).status).toBe(403);
    const accepted = await post(twilioSignature(authToken, url, params));
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get("content-type")).toContain("text/xml");
    const received = await (
      await apiRequest(app, "GET", "/v1/sms/received", { key: tenant.liveKey })
    ).json();
    expect(received.data).toMatchObject([{ body: "Thanks!", to: number.phoneNumber }]);
    // A status callback without the message it is about.
    const status = await app.request("http://localhost/sms/twilio/status", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "AccountSid=ACnobody&MessageStatus=sent",
    });
    expect(status.status).toBe(400);
  });
});
