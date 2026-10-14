import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { suspendOrganization, unsuspendOrganization } from "@coss/tenancy/admin";
import { createTestTenant, createTestUser } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint, signPayload, type WebhookSender } from "@coss/webhooks";
import { LEASE_MS } from "@coss/webhooks/engine";
import { testManagementDeps, webhookReceiver } from "@coss/webhooks/testing";
import { and, eq } from "drizzle-orm";
import { createHookApplication, deleteHookApplication } from "../src/applications.ts";
import {
  type FinishedHookDelivery,
  HELD_DELIVERY_DELAY_MS,
  HOOK_RETRY_DELAYS_MS,
  HOOK_USER_AGENT,
  MAX_IN_FLIGHT_PER_ENDPOINT,
  parkHeldHookDeliveries,
  runDueHookDeliveries,
} from "../src/deliver.ts";
import {
  getHookDelivery,
  HOOK_MAX_ATTEMPTS,
  listHookAttempts,
  pageHookDeliveries,
  retryHookDelivery,
} from "../src/deliveries.ts";
import { createHookEndpoint, deleteHookEndpoint, updateHookEndpoint } from "../src/endpoints.ts";
import { sendHookMessage } from "../src/messages.ts";
import { recoverHookEndpoint, runDueHookRecoveries } from "../src/recoveries.ts";
import { testHookDeliveryDeps, testHookDeps } from "../src/testing.ts";

const ok: WebhookSender = async () => ({ status: 200, body: "ok" });
const down: WebhookSender = async () => ({ status: 503, body: "down" });

async function setup(url = "https://example.com/hook") {
  const tenant = await createTestTenant();
  const application = await createHookApplication({
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    name: "Acme",
  });
  const { endpoint, secret } = await createHookEndpoint(
    {
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      applicationId: application.id,
      url,
    },
    testHookDeps,
  );
  const send = (payload: Record<string, unknown> = { amount: 42 }) =>
    sendHookMessage({ application, eventType: "invoice.paid", payload });
  const scope = { organizationIds: [tenant.organization.id] };
  const deliveries = async () =>
    (
      await pageHookDeliveries({
        organizationId: tenant.organization.id,
        applicationId: application.id,
      })
    ).deliveries;
  return { tenant, application, endpoint, secret, send, scope, deliveries };
}

const endpointRow = async (id: string) =>
  (await db.select().from(schema.hookEndpoint).where(eq(schema.hookEndpoint.id, id)))[0];

describe("runDueHookDeliveries", () => {
  test("posts the payload, signed with the endpoint's secret, and records the attempt", async () => {
    const receiver = webhookReceiver();
    try {
      const { send, scope, secret, deliveries } = await setup(receiver.url);
      const { message } = await send({ amount: 42, nested: { object: "email" } });

      expect(await runDueHookDeliveries({ scope }, testHookDeliveryDeps())).toBe(1);

      const [request] = receiver.received;
      if (!request) throw new Error("nothing received");
      expect(JSON.parse(request.body)).toEqual({ amount: 42, nested: { object: "email" } });
      expect(request.headers.get("webhook-id")).toBe(message.id);
      expect(request.headers.get("coss-event-type")).toBe("invoice.paid");
      expect(request.headers.get("user-agent")).toBe(HOOK_USER_AGENT);
      const timestamp = Number(request.headers.get("webhook-timestamp"));
      expect(request.headers.get("webhook-signature")).toBe(
        signPayload({ secret, id: message.id, timestamp, body: request.body }),
      );
      const [delivery] = await deliveries();
      expect(delivery).toMatchObject({ status: "succeeded", attemptCount: 1, lastStatusCode: 200 });
      if (!delivery) throw new Error("no delivery");
      const attempts = await listHookAttempts(delivery);
      expect(attempts).toHaveLength(1);
      expect(attempts[0]).toMatchObject({ statusCode: 200, responseExcerpt: "ok", error: null });
    } finally {
      receiver.stop();
    }
  });

  test("retries with backoff, gives up after the last attempt, and a manual retry tries once more", async () => {
    const { tenant, application, send, scope, deliveries } = await setup();
    await send();
    let now = new Date();
    const finished: FinishedHookDelivery[] = [];
    const deps = testHookDeliveryDeps({
      send: down,
      onFinished: async (done) => {
        finished.push(...done);
      },
    });
    for (let attempt = 1; attempt <= HOOK_MAX_ATTEMPTS; attempt++) {
      expect(await runDueHookDeliveries({ now, scope }, deps)).toBe(1);
      expect(await runDueHookDeliveries({ now, scope }, deps)).toBe(0);
      now = new Date(now.getTime() + (HOOK_RETRY_DELAYS_MS[attempt - 1] ?? 0));
    }
    const [failed] = await deliveries();
    expect(failed).toMatchObject({
      status: "failed",
      attemptCount: HOOK_MAX_ATTEMPTS,
      lastError: "HTTP 503",
    });
    expect(finished).toEqual([
      expect.objectContaining({ organizationId: tenant.organization.id, succeeded: false }),
    ]);
    if (!failed) throw new Error("no delivery");

    const retried = await retryHookDelivery({
      organizationId: tenant.organization.id,
      applicationId: application.id,
      id: failed.id,
    });
    expect(retried).toMatchObject({ status: "pending", attemptCount: HOOK_MAX_ATTEMPTS - 1 });
    expect(await runDueHookDeliveries({ scope }, testHookDeliveryDeps({ send: ok }))).toBe(1);
    expect(
      await getHookDelivery({
        organizationId: tenant.organization.id,
        applicationId: application.id,
        id: failed.id,
      }),
    ).toMatchObject({ status: "succeeded", attemptCount: HOOK_MAX_ATTEMPTS });
  });

  test("disables an endpoint that keeps failing, and tells the customer by webhook", async () => {
    const { tenant, application, endpoint, send, scope } = await setup();
    // The customer's own webhook endpoint (COSS events), subscribed to Hooks' operational events.
    await createWebhookEndpoint(
      {
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        url: "https://customer.example/coss",
        eventTypes: ["hook_endpoint.disabled"],
        apiVersion: LATEST_API_VERSION,
        userId: tenant.owner.id,
      },
      testManagementDeps,
    );
    const deps = testHookDeliveryDeps({ send: down, disableAfterMs: 1 });
    const giveUp = async (start: Date) => {
      await send();
      let now = new Date(Math.max(start.getTime(), Date.now()));
      for (let attempt = 1; attempt <= HOOK_MAX_ATTEMPTS; attempt++) {
        await runDueHookDeliveries({ now, scope }, deps);
        now = new Date(now.getTime() + (HOOK_RETRY_DELAYS_MS[attempt - 1] ?? 0));
      }
      return now;
    };
    const later = await giveUp(new Date());
    expect(await endpointRow(endpoint.id)).toMatchObject({ enabled: true });
    expect((await endpointRow(endpoint.id))?.failingSince).toBeInstanceOf(Date);
    await giveUp(later);
    expect(await endpointRow(endpoint.id)).toMatchObject({
      enabled: false,
      disabledReason: "failing",
    });
    const [event] = await db
      .select()
      .from(schema.webhookMessage)
      .where(
        and(
          eq(schema.webhookMessage.organizationId, tenant.organization.id),
          eq(schema.webhookMessage.type, "hook_endpoint.disabled"),
        ),
      );
    expect(event?.payload).toMatchObject({
      object: "event",
      type: "hook_endpoint.disabled",
      data: { application_id: application.id, endpoint_id: endpoint.id, url: endpoint.url },
    });
    const audit = await db
      .select()
      .from(schema.orgAuditEvent)
      .where(
        and(
          eq(schema.orgAuditEvent.organizationId, tenant.organization.id),
          eq(schema.orgAuditEvent.action, "hook_endpoint.disabled"),
        ),
      );
    expect(audit).toHaveLength(1);
  });

  test("a worker whose lease was taken over records nothing", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const slow: WebhookSender = async () => {
      if (++calls === 1) await gate;
      return { status: 200, body: "ok" };
    };
    const { send, scope, deliveries } = await setup();
    await send();
    const now = new Date();
    const late = runDueHookDeliveries({ now, scope }, testHookDeliveryDeps({ send: slow }));
    while (calls === 0) await Bun.sleep(5);
    const takeover = new Date(now.getTime() + LEASE_MS + 1000);
    expect(
      await runDueHookDeliveries({ now: takeover, scope }, testHookDeliveryDeps({ send: slow })),
    ).toBe(1);
    release();
    await late;
    const [delivery] = await deliveries();
    if (!delivery) throw new Error("no delivery");
    expect(delivery).toMatchObject({ status: "succeeded", attemptCount: 1 });
    expect((await listHookAttempts(delivery)).map((attempt) => attempt.attemptedAt)).toEqual([
      takeover,
    ]);
  });

  test(`claims at most ${MAX_IN_FLIGHT_PER_ENDPOINT} deliveries of one endpoint per run`, async () => {
    const { send, scope } = await setup();
    for (let i = 0; i < MAX_IN_FLIGHT_PER_ENDPOINT + 3; i++) await send();
    expect(await runDueHookDeliveries({ scope }, testHookDeliveryDeps({ send: ok }))).toBe(
      MAX_IN_FLIGHT_PER_ENDPOINT,
    );
    expect(await runDueHookDeliveries({ scope }, testHookDeliveryDeps({ send: ok }))).toBe(3);
  });

  test("a throttled attempt is put off without counting", async () => {
    const { send, scope, deliveries } = await setup();
    await send();
    const now = new Date();
    let sent = 0;
    const throttled = testHookDeliveryDeps({
      send: async () => {
        sent++;
        return { status: 200, body: "" };
      },
      throttle: async () => ({ allowed: false, retryAfterMs: 2000 }),
    });
    expect(await runDueHookDeliveries({ now, scope }, throttled)).toBe(1);
    expect(sent).toBe(0);
    const [delivery] = await deliveries();
    expect(delivery).toMatchObject({ status: "pending", attemptCount: 0 });
    expect(delivery?.nextAttemptAt?.getTime()).toBe(now.getTime() + 2000);
    expect(await runDueHookDeliveries({ now, scope }, throttled)).toBe(0);
  });

  test("deliveries to a disabled or deleted endpoint, or a deleted application, fail without a request", async () => {
    const { tenant, application, endpoint, send, scope, deliveries } = await setup();
    const base = {
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      applicationId: application.id,
    };
    let requests = 0;
    const deps = testHookDeliveryDeps({
      send: async () => {
        requests++;
        return { status: 200, body: "" };
      },
    });
    await send();
    await updateHookEndpoint({ ...base, id: endpoint.id, enabled: false }, testHookDeps);
    await runDueHookDeliveries({ scope }, deps);
    expect((await deliveries())[0]).toMatchObject({
      status: "failed",
      lastError: "The endpoint is disabled.",
    });

    await updateHookEndpoint({ ...base, id: endpoint.id, enabled: true }, testHookDeps);
    await send();
    await deleteHookEndpoint({ ...base, id: endpoint.id });
    await runDueHookDeliveries({ scope }, deps);
    expect((await deliveries())[0]).toMatchObject({
      status: "failed",
      lastError: "The endpoint was deleted.",
    });

    const { endpoint: another } = await createHookEndpoint(
      { ...base, url: "https://example.com/again" },
      testHookDeps,
    );
    await send();
    await deleteHookApplication({ organizationId: tenant.organization.id, id: application.id });
    await runDueHookDeliveries({ scope }, deps);
    const [last] = await db
      .select()
      .from(schema.hookDelivery)
      .where(eq(schema.hookDelivery.endpointId, another.id));
    expect(last).toMatchObject({ status: "failed", lastError: "The endpoint was deleted." });
    expect(requests).toBe(0);
  });

  test("a suspended organization's deliveries are held and put off, then resume", async () => {
    const { tenant, send, scope, deliveries } = await setup();
    const admin = await createTestUser();
    const actor = { userId: admin.id, email: admin.email };
    await send();
    await suspendOrganization({ organizationId: tenant.organization.id, reason: "Test", actor });
    const now = new Date(Date.now() + 1000);
    expect(await runDueHookDeliveries({ now, scope }, testHookDeliveryDeps({ send: ok }))).toBe(0);
    expect(await parkHeldHookDeliveries({ now, scope })).toBe(1);
    expect((await deliveries())[0]?.nextAttemptAt?.getTime()).toBe(
      now.getTime() + HELD_DELIVERY_DELAY_MS,
    );

    await unsuspendOrganization({ organizationId: tenant.organization.id, actor });
    const later = new Date(now.getTime() + HELD_DELIVERY_DELAY_MS);
    expect(
      await runDueHookDeliveries({ now: later, scope }, testHookDeliveryDeps({ send: ok })),
    ).toBe(1);
    expect((await deliveries())[0]).toMatchObject({ status: "succeeded" });
  });
});

describe("recovery", () => {
  test("requeues the endpoint's failed deliveries since a time, in batches", async () => {
    const { tenant, endpoint, send, scope, deliveries } = await setup();
    for (let i = 0; i < 3; i++) await send();
    await db
      .update(schema.hookDelivery)
      .set({ status: "failed", attemptCount: HOOK_MAX_ATTEMPTS, nextAttemptAt: null })
      .where(eq(schema.hookDelivery.endpointId, endpoint.id));
    const recovery = await recoverHookEndpoint({
      endpoint,
      since: new Date(Date.now() - 60_000),
      now: new Date(Date.now() + 1),
    });
    expect(recovery).toMatchObject({ status: "pending", requeued: 0 });

    expect(await runDueHookRecoveries({ scope, limit: 2 })).toBe(2);
    expect(await runDueHookRecoveries({ scope, limit: 2 })).toBe(1);
    expect(await runDueHookRecoveries({ scope, limit: 2 })).toBe(0);
    const [row] = await db
      .select()
      .from(schema.hookEndpointRecovery)
      .where(eq(schema.hookEndpointRecovery.id, recovery.id));
    expect(row).toMatchObject({ status: "completed", requeued: 3 });
    expect((await deliveries()).map((delivery) => delivery.status)).toEqual([
      "pending",
      "pending",
      "pending",
    ]);
    const inAMinute = new Date(Date.now() + 61_000);
    expect(
      await runDueHookDeliveries({ now: inAMinute, scope }, testHookDeliveryDeps({ send: ok })),
    ).toBe(3);

    await updateHookEndpoint(
      {
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        applicationId: endpoint.applicationId,
        id: endpoint.id,
        enabled: false,
      },
      testHookDeps,
    );
    const disabled = await endpointRow(endpoint.id);
    if (!disabled) throw new Error("no endpoint");
    await expect(
      recoverHookEndpoint({ endpoint: disabled, since: new Date(0) }),
    ).rejects.toMatchObject({
      code: "endpoint_disabled",
    });
  });
});

describe("partitions", () => {
  test("lookups by id touch one partition", async () => {
    const { send } = await setup();
    const { message } = await send();
    const plan = await db.execute<{ "QUERY PLAN": string }>(
      `explain select * from hook_message where created_at = '${message.createdAt.toISOString()}' and id = '${message.id}'`,
    );
    const text = plan.rows.map((row) => row["QUERY PLAN"]).join("\n");
    expect(new Set(text.match(/hook_message_p\d{8}/g))).toHaveProperty("size", 1);
  });

  test("expired days of all three tables are dropped together", async () => {
    const { dropExpiredPartitions, ensurePartitions, HOOK_PARTITIONS, listPartitions } =
      await import("@coss/db/partitions");
    // Days well in the past, which no other test writes to.
    const past = new Date(Date.now() - 400 * 24 * 3_600_000);
    for (const spec of HOOK_PARTITIONS) await ensurePartitions(spec, { now: past, aheadDays: 0 });
    const old = (table: string) =>
      listPartitions(table).then((rows) =>
        rows.filter((row) => row.day.getTime() < past.getTime() + 24 * 3_600_000),
      );
    for (const spec of HOOK_PARTITIONS) expect((await old(spec.table)).length).toBeGreaterThan(0);
    for (const spec of HOOK_PARTITIONS) {
      await dropExpiredPartitions(spec, { retentionDays: 30 });
      expect(await old(spec.table)).toEqual([]);
    }
  });
});
