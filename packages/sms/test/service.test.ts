import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { and, eq, sql } from "drizzle-orm";
import { setAllowedSmsCountries } from "../src/accounts.ts";
import { ingestSmsEvents } from "../src/events.ts";
import type { SmsProviderEvent } from "../src/provider.ts";
import { getSms, listSmsEvents } from "../src/read.ts";
import { listReceivedSms, receiveSms } from "../src/received.ts";
import { purgeExpiredReceivedSms, purgeExpiredSmsMessages } from "../src/retention.ts";
import { SendSmsRequest, type SendSmsRequestOutput, SMS_SIMULATOR } from "../src/schemas.ts";
import { createSmsService, type SendEnvironment } from "../src/service.ts";
import { addSmsSuppression, checkSmsSuppression } from "../src/suppressions.ts";
import { STALE_SMS_CLAIM_MS, sweepStaleSmsClaims, sweepUnclaimedSms } from "../src/sweeps.ts";
import {
  createTestSmsNumber,
  dispatchingSmsService,
  FakeSmsProvider,
  memorySmsDispatchQueue,
  testPhoneNumber,
} from "../src/testing.ts";

const { billingUsage, smsMessage, smsReceived, smsSuppression } = schema;

/** Provider message ids are unique across the (never truncated) test database. */
const run = randomUUID();

function env(environment: TestTenant["production"]): SendEnvironment {
  return {
    organizationId: environment.organizationId,
    projectId: environment.projectId,
    environmentId: environment.id,
    mode: environment.mode,
  };
}

function params(overrides: Partial<SendSmsRequestOutput> = {}): SendSmsRequestOutput {
  return SendSmsRequest.parse({
    from: "+14155550123",
    to: SMS_SIMULATOR.delivered,
    body: "Your code is 123456",
    ...overrides,
  });
}

async function usageOf(organizationId: string) {
  return db
    .select({
      meter: billingUsage.meter,
      dimension: billingUsage.dimension,
      quantity: sql<number>`sum(${billingUsage.quantity})::int`,
    })
    .from(billingUsage)
    .where(eq(billingUsage.organizationId, organizationId))
    .groupBy(billingUsage.meter, billingUsage.dimension);
}

describe("sandbox sends", () => {
  test("a message is delivered by the simulator, with its events and no usage", async () => {
    const tenant = await createTestTenant();
    const service = dispatchingSmsService();
    const { sms } = await service.send({
      environment: env(tenant.development),
      apiKeyId: null,
      params: params({ body: "Hello ✓" }),
    });
    expect(sms).toMatchObject({
      status: "delivered",
      segments: 1,
      encoding: "ucs2",
      country: "US",
      sandbox: true,
      failure: null,
    });
    const events = await listSmsEvents({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      smsId: sms.id,
    });
    expect(events.map((event) => event.type)).toEqual(["sms.sent", "sms.delivered"]);
    expect(await usageOf(tenant.organization.id)).toEqual([]);
  });

  test("the simulator's failures: an invalid number, carrier filtering", async () => {
    const tenant = await createTestTenant();
    const service = dispatchingSmsService();
    const invalid = await service.send({
      environment: env(tenant.development),
      apiKeyId: null,
      params: params({ to: SMS_SIMULATOR.invalidNumber }),
    });
    expect(invalid.sms).toMatchObject({
      status: "failed",
      failure: { code: "invalid_number" },
    });
    const filtered = await service.send({
      environment: env(tenant.development),
      apiKeyId: null,
      params: params({ to: SMS_SIMULATOR.carrierFiltered }),
    });
    expect(filtered.sms).toMatchObject({
      status: "undelivered",
      failure: { code: "carrier_filtered" },
    });
    // The simulator's numbers are never suppressed: the next test sees the same outcome.
    const check = await checkSmsSuppression({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      phoneNumber: SMS_SIMULATOR.invalidNumber,
    });
    expect(check.suppressed).toBe(false);
  });

  test("the simulator's reply number answers into the environment", async () => {
    const tenant = await createTestTenant();
    const service = dispatchingSmsService();
    await service.send({
      environment: env(tenant.development),
      apiKeyId: null,
      params: params({ to: SMS_SIMULATOR.reply }),
    });
    const received = await listReceivedSms({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
    });
    expect(received.data).toMatchObject([
      { from: SMS_SIMULATOR.reply, to: "+14155550123", sandbox: true, keyword: null },
    ]);
  });
});

describe("live sends", () => {
  test("only from an approved number of the organization", async () => {
    const tenant = await createTestTenant();
    const service = dispatchingSmsService();
    await expect(
      service.send({ environment: env(tenant.production), apiKeyId: null, params: params() }),
    ).rejects.toMatchObject({ code: "sender_not_found", param: "from" });
    const number = await createTestSmsNumber(tenant.organization.id);
    const { sms } = await service.send({
      environment: env(tenant.production),
      apiKeyId: null,
      params: params({ from: number.phoneNumber, body: "a".repeat(200) }),
    });
    expect(sms).toMatchObject({ status: "delivered", segments: 2, sandbox: false });
    expect(await usageOf(tenant.organization.id)).toEqual([
      { meter: "sms.segments", dimension: "country=US", quantity: 2 },
    ]);
  });

  test("only to allowed countries", async () => {
    const tenant = await createTestTenant();
    const service = dispatchingSmsService();
    const number = await createTestSmsNumber(tenant.organization.id);
    const toGb = params({ from: number.phoneNumber, to: "+447400123456" });
    await expect(
      service.send({ environment: env(tenant.production), apiKeyId: null, params: toGb }),
    ).rejects.toMatchObject({ code: "country_not_allowed", param: "to" });
    await expect(
      setAllowedSmsCountries(tenant.organization.id, ["US", "NG"]),
    ).rejects.toMatchObject({
      code: "country_not_allowed",
    });
    await setAllowedSmsCountries(tenant.organization.id, ["US", "GB"]);
    const { sms } = await service.send({
      environment: env(tenant.production),
      apiKeyId: null,
      params: toGb,
    });
    expect(sms).toMatchObject({ status: "delivered", country: "GB" });
  });

  test("the billing gate prices the destination country", async () => {
    const tenant = await createTestTenant();
    const reserved: unknown[] = [];
    const service = dispatchingSmsService({
      billing: {
        async reserve(_tx, input) {
          reserved.push(input);
        },
      },
    });
    const number = await createTestSmsNumber(tenant.organization.id);
    await service.send({
      environment: env(tenant.production),
      apiKeyId: null,
      params: params({ from: number.phoneNumber }),
    });
    expect(reserved).toEqual([
      {
        organizationId: tenant.organization.id,
        meter: "sms.segments",
        quantity: 1,
        dimension: "country=US",
      },
    ]);
  });
});

test("suppressed numbers are skipped, never handed over", async () => {
  const tenant = await createTestTenant();
  const service = dispatchingSmsService();
  const to = testPhoneNumber();
  await addSmsSuppression(
    {
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      environmentId: tenant.development.id,
    },
    to,
  );
  const { sms } = await service.send({
    environment: env(tenant.development),
    apiKeyId: null,
    params: params({ to }),
  });
  expect(sms).toMatchObject({ status: "failed", failure: { code: "suppressed" } });
  expect(service.provider.sent).toHaveLength(0);
  const events = await listSmsEvents({
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    smsId: sms.id,
  });
  expect(events).toMatchObject([
    { type: "sms.suppressed", data: { suppression: { reason: "manual" } } },
  ]);
});

test("a number that opts out while its message waits in the queue gets nothing", async () => {
  const tenant = await createTestTenant();
  const queue = memorySmsDispatchQueue();
  const provider = new FakeSmsProvider({ log: false });
  const service = createSmsService({ liveProvider: provider, sandboxProvider: provider, queue });
  const to = testPhoneNumber();
  const { sms } = await service.send({
    environment: env(tenant.development),
    apiKeyId: null,
    params: params({ to }),
  });
  expect(sms.status).toBe("queued");
  await addSmsSuppression(
    {
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      environmentId: tenant.development.id,
    },
    to,
  );
  await queue.drain(service);
  expect(provider.sent).toHaveLength(0);
  const scoped = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
  expect(await getSms({ ...scoped, smsId: sms.id })).toMatchObject({
    status: "failed",
    failure: { code: "suppressed" },
  });
  expect(await listSmsEvents({ ...scoped, smsId: sms.id })).toMatchObject([
    { type: "sms.suppressed" },
  ]);
});

test("a send the provider accepted is never failed when recording it goes wrong", async () => {
  const tenant = await createTestTenant();
  const queue = memorySmsDispatchQueue();
  const provider = new FakeSmsProvider({ log: false });
  // Accepted, but with an event that can't be stored: recording the outcome throws.
  const accepting = {
    name: provider.name,
    async send(message: { smsId: string }) {
      const broken: SmsProviderEvent = {
        provider: provider.name,
        providerStatus: "delivered",
        smsId: message.smsId,
        providerMessageId: "accepted",
        type: "sms.delivered",
        occurredAt: new Date(Number.NaN),
        sourceId: "delivered",
        data: {},
      };
      return { providerMessageId: "accepted", events: [broken] };
    },
  };
  const service = createSmsService({
    liveProvider: accepting,
    sandboxProvider: accepting,
    queue,
  });
  const { sms } = await service.send({
    environment: env(tenant.development),
    apiKeyId: null,
    params: params(),
  });
  await expect(queue.drain(service)).rejects.toThrow();
  const [row] = await db.select().from(smsMessage).where(eq(smsMessage.id, sms.id));
  // Still claimed: the provider's callback or the stale-claim sweep settles it.
  expect(row).toMatchObject({ status: "queued", provider: provider.name });
});

test("an idempotency key replays the same request and refuses another", async () => {
  const tenant = await createTestTenant();
  const queue = memorySmsDispatchQueue();
  const provider = new FakeSmsProvider({ log: false });
  const service = createSmsService({ liveProvider: provider, sandboxProvider: provider, queue });
  const input = {
    environment: env(tenant.development),
    apiKeyId: null,
    params: params(),
    idempotencyKey: "abc",
  };
  const first = await service.send(input);
  const second = await service.send(input);
  expect(second).toEqual({ sms: first.sms, replayed: true });
  expect(queue.jobs).toHaveLength(1);
  await expect(
    service.send({ ...input, params: params({ body: "Another" }) }),
  ).rejects.toMatchObject({ code: "idempotency_key_reused" });
});

test("scheduled sends wait, go when due, and can be canceled", async () => {
  const tenant = await createTestTenant();
  const queue = memorySmsDispatchQueue();
  const provider = new FakeSmsProvider({ log: false });
  const service = createSmsService({ liveProvider: provider, sandboxProvider: provider, queue });
  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const later = await service.send({
    environment: env(tenant.development),
    apiKeyId: null,
    params: params({ scheduled_at: scheduledAt }),
  });
  const canceled = await service.send({
    environment: env(tenant.development),
    apiKeyId: null,
    params: params({ scheduled_at: scheduledAt, body: "Never" }),
  });
  expect(later.sms.status).toBe("scheduled");
  expect(queue.jobs).toHaveLength(0);
  const scope = {
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
  };
  expect((await service.cancel({ ...scope, smsId: canceled.sms.id })).status).toBe("canceled");
  // A billing hold holds live messages only: sandbox ones aren't billed.
  await db
    .insert(schema.billingHold)
    .values({ organizationId: tenant.organization.id, reason: "admin" });
  const due = await service.dispatchDue({
    now: new Date(Date.now() + 2 * 60 * 60 * 1000),
    scope: { organizationIds: [tenant.organization.id] },
  });
  expect(due).toBe(1);
  expect((await getSms({ ...scope, smsId: later.sms.id })).status).toBe("delivered");
  await expect(service.cancel({ ...scope, smsId: later.sms.id })).rejects.toMatchObject({
    code: "sms_not_cancelable",
  });
});

describe("receiving", () => {
  test("replies go to the number's environment; STOP and START change every live list", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id, {
      receivingEnvironmentId: tenant.production.id,
    });
    const from = testPhoneNumber();
    const reply = {
      provider: "fake",
      from,
      to: number.phoneNumber,
      occurredAt: new Date(),
    };
    expect(
      await receiveSms({ ...reply, providerMessageId: `m1-${run}`, body: "Thanks!" }),
    ).toMatchObject({
      status: "stored",
    });
    expect(await receiveSms({ ...reply, providerMessageId: `m1-${run}`, body: "Thanks!" })).toEqual(
      {
        status: "duplicate",
      },
    );
    await receiveSms({ ...reply, providerMessageId: `m2-${run}`, body: "Stop" });
    const live = {
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      phoneNumber: from,
    };
    expect(await checkSmsSuppression(live)).toMatchObject({
      suppressed: true,
      suppression: { reason: "opt_out" },
    });
    // Sandbox environments never get opt-outs.
    expect(
      (await checkSmsSuppression({ ...live, environmentId: tenant.development.id })).suppressed,
    ).toBe(false);
    const service = dispatchingSmsService();
    const { sms } = await service.send({
      environment: env(tenant.production),
      apiKeyId: null,
      params: params({ from: number.phoneNumber, to: from }),
    });
    expect(sms).toMatchObject({ status: "failed", failure: { code: "suppressed" } });
    await receiveSms({ ...reply, providerMessageId: `m3-${run}`, body: "START" });
    expect((await checkSmsSuppression(live)).suppressed).toBe(false);
    const received = await listReceivedSms({
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
    });
    expect(received.data.map((row) => row.keyword)).toEqual(["start", "stop", null]);
    expect(await usageOf(tenant.organization.id)).toContainEqual({
      meter: "sms.received_segments",
      dimension: "country=US",
      quantity: 3,
    });
  });

  test("an unrouted STOP still opts the number out", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id);
    const from = testPhoneNumber();
    expect(
      await receiveSms({
        provider: "fake",
        providerMessageId: `x1-${run}`,
        from,
        to: number.phoneNumber,
        body: "STOP",
        occurredAt: new Date(),
      }),
    ).toEqual({ status: "unrouted" });
    // Received all the same: billed to the organization.
    expect(await usageOf(tenant.organization.id)).toEqual([
      { meter: "sms.received_segments", dimension: "country=US", quantity: 1 },
    ]);
    const [entry] = await db
      .select()
      .from(smsSuppression)
      .where(
        and(
          eq(smsSuppression.organizationId, tenant.organization.id),
          eq(smsSuppression.phoneNumber, from),
        ),
      );
    expect(entry).toMatchObject({ environmentId: tenant.production.id, reason: "opt_out" });
  });

  test("a received message keeps the provider's segment count", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id, {
      receivingEnvironmentId: tenant.production.id,
    });
    const result = await receiveSms({
      provider: "fake",
      providerMessageId: `segments-${run}-${number.phoneNumber}`,
      from: testPhoneNumber(),
      to: number.phoneNumber,
      body: "a".repeat(305),
      occurredAt: new Date(),
      segments: 3,
    });
    if (result.status !== "stored") throw new Error(result.status);
    const [stored] = await db.select().from(smsReceived).where(eq(smsReceived.id, result.id));
    expect(stored?.segments).toBe(3);
  });

  test("a live START leaves sandbox environments' opt-outs alone", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id);
    const from = testPhoneNumber();
    await db.insert(smsSuppression).values({
      organizationId: tenant.organization.id,
      projectId: tenant.project.id,
      environmentId: tenant.development.id,
      phoneNumber: from,
      reason: "opt_out",
    });
    await receiveSms({
      provider: "fake",
      providerMessageId: `start-${run}-${from}`,
      from,
      to: number.phoneNumber,
      body: "START",
      occurredAt: new Date(),
    });
    const entries = await db
      .select({ environmentId: smsSuppression.environmentId })
      .from(smsSuppression)
      .where(
        and(
          eq(smsSuppression.organizationId, tenant.organization.id),
          eq(smsSuppression.phoneNumber, from),
        ),
      );
    expect(entries).toEqual([{ environmentId: tenant.development.id }]);
  });

  test("a retried unrouted START doesn't undo the STOP that came after it", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id);
    const from = testPhoneNumber();
    const reply = (id: string, body: string) =>
      receiveSms({
        provider: "fake",
        providerMessageId: `${id}-${run}`,
        from,
        to: number.phoneNumber,
        body,
        occurredAt: new Date(),
      });
    expect(await reply("r1", "STOP")).toEqual({ status: "unrouted" });
    expect(await reply("r2", "START")).toEqual({ status: "unrouted" });
    expect(await reply("r3", "STOP")).toEqual({ status: "unrouted" });
    // The provider retries the START callback.
    expect(await reply("r2", "START")).toEqual({ status: "duplicate" });
    const entries = await db
      .select()
      .from(smsSuppression)
      .where(
        and(
          eq(smsSuppression.organizationId, tenant.organization.id),
          eq(smsSuppression.phoneNumber, from),
        ),
      );
    expect(entries).toEqual([expect.objectContaining({ reason: "opt_out" })]);
  });
});

describe("sweeps", () => {
  test("an interrupted dispatch fails, and a late callback repairs it", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id);
    const queue = memorySmsDispatchQueue();
    const provider = new FakeSmsProvider({ log: false });
    const service = createSmsService({ liveProvider: provider, sandboxProvider: provider, queue });
    const { sms } = await service.send({
      environment: env(tenant.production),
      apiKeyId: null,
      params: params({ from: number.phoneNumber }),
    });
    // A dispatcher claimed it long ago and never came back.
    await db
      .update(smsMessage)
      .set({ provider: "fake", updatedAt: sql`now() - interval '1 hour'` })
      .where(eq(smsMessage.id, sms.id));
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await sweepStaleSmsClaims({ scope })).toBe(1);
    const scoped = { organizationId: tenant.organization.id, environmentId: tenant.production.id };
    expect(await getSms({ ...scoped, smsId: sms.id })).toMatchObject({
      status: "failed",
      failure: { code: "dispatch_interrupted" },
    });
    await ingestSmsEvents([
      {
        provider: "fake",
        providerStatus: "delivered",
        smsId: sms.id,
        providerMessageId: "late",
        type: "sms.delivered",
        occurredAt: new Date(),
        sourceId: "delivered",
        data: {},
      },
    ]);
    expect(await getSms({ ...scoped, smsId: sms.id })).toMatchObject({
      status: "delivered",
      failure: null,
      sent_at: expect.any(String),
      delivered_at: expect.any(String),
    });
    // The repair stored the provider's message id: another one's callbacks are refused.
    const [repaired] = await db
      .select({ providerMessageId: smsMessage.providerMessageId })
      .from(smsMessage)
      .where(eq(smsMessage.id, sms.id));
    expect(repaired?.providerMessageId).toBe("late");
    expect(await usageOf(tenant.organization.id)).toEqual([
      { meter: "sms.segments", dimension: "country=US", quantity: 1 },
    ]);
    expect(STALE_SMS_CLAIM_MS).toBeLessThan(60 * 60 * 1000);
  });

  test("a late failure callback replaces an interrupted dispatch's error, unbilled", async () => {
    const tenant = await createTestTenant();
    const number = await createTestSmsNumber(tenant.organization.id);
    const queue = memorySmsDispatchQueue();
    const provider = new FakeSmsProvider({ log: false });
    const service = createSmsService({ liveProvider: provider, sandboxProvider: provider, queue });
    const { sms } = await service.send({
      environment: env(tenant.production),
      apiKeyId: null,
      params: params({ from: number.phoneNumber }),
    });
    await db
      .update(smsMessage)
      .set({ provider: "fake", updatedAt: sql`now() - interval '1 hour'` })
      .where(eq(smsMessage.id, sms.id));
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await sweepStaleSmsClaims({ scope })).toBe(1);
    const failure = {
      code: "opted_out",
      message: "The recipient opted out of messages from this number (they replied STOP).",
    };
    await ingestSmsEvents([
      {
        provider: "fake",
        providerStatus: "failed",
        smsId: sms.id,
        providerMessageId: "late-failure",
        type: "sms.failed",
        occurredAt: new Date(),
        sourceId: "failed",
        data: { failure },
      },
    ]);
    const scoped = { organizationId: tenant.organization.id, environmentId: tenant.production.id };
    expect(await getSms({ ...scoped, smsId: sms.id })).toMatchObject({ status: "failed", failure });
    expect(await usageOf(tenant.organization.id)).toEqual([]);
  });

  test("an unclaimed message is enqueued again, then failed", async () => {
    const tenant = await createTestTenant();
    const queue = memorySmsDispatchQueue();
    const provider = new FakeSmsProvider({ log: false });
    const service = createSmsService({ liveProvider: provider, sandboxProvider: provider, queue });
    const { sms } = await service.send({
      environment: env(tenant.development),
      apiKeyId: null,
      params: params(),
    });
    queue.jobs.splice(0);
    const scope = { organizationIds: [tenant.organization.id] };
    const later = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000);
    expect(await sweepUnclaimedSms(queue, { now: later(20), scope })).toEqual({
      failed: 0,
      requeued: 1,
    });
    expect(queue.jobs).toEqual([{ organizationId: tenant.organization.id, smsId: sms.id }]);
    expect(await sweepUnclaimedSms(queue, { now: later(90), scope })).toEqual({
      failed: 1,
      requeued: 0,
    });
  });
});

test("retention purges old messages, never queued or scheduled ones", async () => {
  const tenant = await createTestTenant();
  const service = dispatchingSmsService();
  const { sms } = await service.send({
    environment: env(tenant.development),
    apiKeyId: null,
    params: params({ to: SMS_SIMULATOR.reply }),
  });
  const scope = { organizationIds: [tenant.organization.id] };
  const now = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  expect(await purgeExpiredSmsMessages({ now, scope })).toBe(1);
  expect(await purgeExpiredReceivedSms({ now, scope })).toBe(1);
  await expect(
    getSms({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      smsId: sms.id,
    }),
  ).rejects.toMatchObject({ code: "not_found" });
});
