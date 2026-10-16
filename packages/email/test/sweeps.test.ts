import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { eq, inArray, sql } from "drizzle-orm";
import { ingestProviderEvents } from "../src/events.ts";
import { getEmail, listEmailEvents } from "../src/read.ts";
import { createEmailService } from "../src/service.ts";
import {
  STALE_CLAIM_MS,
  sweepStaleClaims,
  sweepUnclaimedEmails,
  UNCLAIMED_FAIL_MS,
  UNCLAIMED_REQUEUE_MS,
} from "../src/sweeps.ts";
import { dispatchingEmailService, memoryDispatchQueue } from "../src/testing.ts";
import { gatedProvider, params, sendEnvironment } from "./helpers.ts";

/** An email claimed by a dispatcher that never came back, as if its process died. */
async function interruptedEmail(tenant: TestTenant) {
  const gated = gatedProvider("fake");
  const service = dispatchingEmailService({
    liveProvider: gated.provider,
    sandboxProvider: gated.provider,
  });
  void service.send({
    environment: sendEnvironment(tenant.development),
    apiKeyId: null,
    params: params(),
  });
  await gated.called;
  const [message] = gated.sent;
  if (!message) throw new Error("not sent");
  // Pretend the claim happened long ago.
  await db
    .update(schema.email)
    .set({ updatedAt: sql`now() - interval '1 hour'` })
    .where(eq(schema.email.id, message.emailId));
  return { emailId: message.emailId, release: gated.release };
}

const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });

describe("sweepStaleClaims", () => {
  test("fails an interrupted email, and a late Send event still repairs it", async () => {
    const tenant = await createTestTenant();
    const { emailId, release } = await interruptedEmail(tenant);
    const read = () =>
      getEmail({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        id: emailId,
      });

    expect(await sweepStaleClaims({ scope: scopeOf(tenant) })).toBe(1);
    expect(await sweepStaleClaims({ scope: scopeOf(tenant) })).toBe(0);
    expect(await read()).toMatchObject({ status: "failed", recipients: [{ status: "failed" }] });
    const listed = await listEmailEvents({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      emailId,
    });
    expect(listed?.events.map((e) => [e.type, e.data.failure?.code])).toEqual([
      ["email.failed", "dispatch_interrupted"],
    ]);

    await ingestProviderEvents([
      {
        provider: "fake",
        providerEventType: "Send",
        emailId,
        providerMessageId: "fake_late",
        type: "email.sent",
        recipients: null,
        occurredAt: new Date(),
        sourceId: "fake_late",
        data: {},
      },
    ]);
    expect(await read()).toMatchObject({ status: "sent", recipients: [{ status: "sent" }] });
    release();
  });

  test("marks an email sent when the provider already reported it", async () => {
    const tenant = await createTestTenant();
    const { emailId, release } = await interruptedEmail(tenant);
    // The Send event arrived, but the dispatcher died before recording its own outcome.
    await db.insert(schema.emailEvent).values({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      emailId,
      type: "email.sent",
      provider: "fake",
      providerEventType: "Send",
      occurredAt: new Date(),
      dedupeKey: "manual",
    });

    expect(await sweepStaleClaims({ scope: scopeOf(tenant) })).toBe(1);
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, emailId));
    expect(row).toMatchObject({ status: "sent", errorCode: null });
    release();
  });

  test("leaves recent claims alone", async () => {
    const tenant = await createTestTenant();
    const { emailId, release } = await interruptedEmail(tenant);
    await db
      .update(schema.email)
      .set({ updatedAt: new Date() })
      .where(eq(schema.email.id, emailId));

    expect(await sweepStaleClaims({ scope: scopeOf(tenant) })).toBe(0);
    expect(
      await sweepStaleClaims({
        scope: scopeOf(tenant),
        now: new Date(Date.now() + STALE_CLAIM_MS + 1000),
      }),
    ).toBe(1);
    release();
  });
});

/** A service whose sends only enqueue (in memory), so their emails stay unclaimed. */
function queuingService() {
  const gated = gatedProvider("fake");
  gated.release();
  const service = createEmailService({
    liveProvider: gated.provider,
    sandboxProvider: gated.provider,
    queue: memoryDispatchQueue(),
  });
  const send = async (tenant: TestTenant) =>
    (
      await service.send({
        environment: sendEnvironment(tenant.development),
        apiKeyId: null,
        params: params(),
      })
    ).email.id;
  return { service, sent: gated.sent, send };
}

async function backdate(emailIds: string[], interval: string) {
  await db
    .update(schema.email)
    .set({ createdAt: sql`now() - ${interval}::interval` })
    .where(inArray(schema.email.id, emailIds));
}

describe("sweepUnclaimedEmails", () => {
  test("re-enqueues unclaimed emails older than 10 minutes only", async () => {
    const tenant = await createTestTenant();
    const { service, sent, send } = queuingService();
    const lost = await send(tenant);
    const dispatched = await send(tenant);
    await service.dispatch({ organizationId: tenant.organization.id, emailId: dispatched });
    const interrupted = await interruptedEmail(tenant);
    const recent = await send(tenant);
    await backdate([lost, dispatched, interrupted.emailId], "30 minutes");

    const sweep = memoryDispatchQueue();
    const scope = scopeOf(tenant);
    expect(await sweepUnclaimedEmails(sweep, { scope })).toEqual({ failed: 0, requeued: 1 });
    expect(sweep.jobs).toEqual([
      { organizationId: tenant.organization.id, emailId: lost, stream: "transactional" },
    ]);

    await sweep.drain(service);
    expect(sent.map((message) => message.emailId)).toContain(lost);
    expect(await sweepUnclaimedEmails(sweep, { scope })).toEqual({ failed: 0, requeued: 0 });

    const later = new Date(Date.now() + UNCLAIMED_REQUEUE_MS + 1000);
    expect(await sweepUnclaimedEmails(sweep, { scope, now: later })).toEqual({
      failed: 0,
      requeued: 1,
    });
    expect(sweep.jobs.map((job) => job.emailId)).toEqual([recent]);
    interrupted.release();
  });

  test("fails unclaimed emails older than an hour, with an email.failed webhook", async () => {
    const tenant = await createTestTenant();
    const { endpoint } = await createWebhookEndpoint(
      {
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        url: "http://127.0.0.1:9/hooks",
        eventTypes: ["email.failed"],
        apiVersion: LATEST_API_VERSION,
        userId: null,
      },
      testManagementDeps,
    );
    const { service, sent, send } = queuingService();
    const expired = await send(tenant);
    // A claimed email belongs to the stale-claim sweep, however old it is.
    const interrupted = await interruptedEmail(tenant);
    await backdate([expired, interrupted.emailId], "61 minutes");

    const sweep = memoryDispatchQueue();
    const scope = scopeOf(tenant);
    expect(await sweepUnclaimedEmails(sweep, { scope })).toEqual({ failed: 1, requeued: 0 });
    expect(sweep.jobs).toEqual([]);
    const read = () =>
      getEmail({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        id: expired,
      });
    expect(await read()).toMatchObject({
      status: "failed",
      sent_at: null,
      recipients: [{ status: "failed" }],
    });
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, expired));
    expect(row).toMatchObject({ errorCode: "dispatch_failed", provider: null });
    expect(
      (await db.select().from(schema.email).where(eq(schema.email.id, interrupted.emailId)))[0]
        ?.status,
    ).toBe("queued");

    const listed = await listEmailEvents({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      emailId: expired,
    });
    expect(listed?.events.map((e) => [e.type, e.data.failure?.code])).toEqual([
      ["email.failed", "dispatch_failed"],
    ]);
    const eventId = listed?.events[0]?.id ?? "";
    const [message] = await db
      .select()
      .from(schema.webhookMessage)
      .where(eq(schema.webhookMessage.id, eventId));
    expect(message).toMatchObject({ type: "email.failed", environmentId: tenant.development.id });
    const deliveries = await db
      .select()
      .from(schema.webhookDelivery)
      .where(eq(schema.webhookDelivery.messageId, eventId));
    expect(deliveries.map((delivery) => delivery.endpointId)).toEqual([endpoint.id]);

    // Its original job running late finds the email finished and sends nothing.
    await service.dispatch({ organizationId: tenant.organization.id, emailId: expired });
    expect(sent.map((m) => m.emailId)).not.toContain(expired);
    expect(await read()).toMatchObject({ status: "failed" });
    expect(await sweepUnclaimedEmails(sweep, { scope })).toEqual({ failed: 0, requeued: 0 });
    interrupted.release();
  });

  test("a dispatcher's claim wins over the failing update", async () => {
    const tenant = await createTestTenant();
    const { send } = queuingService();
    const emailId = await send(tenant);
    await backdate([emailId], "2 hours");
    // Claimed between the sweep's scan and its update (as `dispatch` claims).
    await db.update(schema.email).set({ provider: "fake" }).where(eq(schema.email.id, emailId));

    const sweep = memoryDispatchQueue();
    expect(
      await sweepUnclaimedEmails(sweep, {
        scope: scopeOf(tenant),
        now: new Date(Date.now() + UNCLAIMED_FAIL_MS),
      }),
    ).toEqual({ failed: 0, requeued: 0 });
    const [row] = await db.select().from(schema.email).where(eq(schema.email.id, emailId));
    expect(row).toMatchObject({ status: "queued", errorCode: null });
  });

  test("emails that can never be dispatched don't starve newer lost ones", async () => {
    const tenant = await createTestTenant();
    const { service, sent, send } = queuingService();
    const stuck = [await send(tenant), await send(tenant), await send(tenant)];
    const lost = await send(tenant);
    await backdate(stuck, "3 hours");
    await backdate([lost], "20 minutes");

    const sweep = memoryDispatchQueue();
    expect(await sweepUnclaimedEmails(sweep, { scope: scopeOf(tenant), limit: 2 })).toEqual({
      failed: 2,
      requeued: 1,
    });
    expect(sweep.jobs.map((job) => job.emailId)).toEqual([lost]);
    await sweep.drain(service);
    expect(sent.map((message) => message.emailId)).toEqual([lost]);

    expect(await sweepUnclaimedEmails(sweep, { scope: scopeOf(tenant), limit: 2 })).toEqual({
      failed: 1,
      requeued: 0,
    });
    const rows = await db.select().from(schema.email).where(inArray(schema.email.id, stuck));
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toMatchObject({ status: "failed", errorCode: "dispatch_failed", provider: null });
    }
  });
});
