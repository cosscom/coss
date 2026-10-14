import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { suspendOrganization } from "@coss/reputation";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  createHookApplication,
  findHookApplication,
  pageHookApplications,
  updateHookApplication,
} from "../src/applications.ts";
import {
  createHookEndpoint,
  MAX_ENDPOINTS,
  revealHookEndpointSecret,
  rollHookEndpointSecret,
  toHookEndpointObject,
  updateHookEndpoint,
} from "../src/endpoints.ts";
import { HookError } from "../src/errors.ts";
import {
  createHookEventType,
  pageHookEventTypes,
  toHookEventTypeObject,
  updateHookEventType,
} from "../src/event-types.ts";
import {
  countHookFanout,
  getHookMessage,
  pageHookMessages,
  sendHookMessage,
} from "../src/messages.ts";
import { MAX_PAYLOAD_BYTES } from "../src/schemas.ts";
import { testHookDeps } from "../src/testing.ts";

function app(tenant: TestTenant, uid?: string, live = false) {
  return createHookApplication({
    organizationId: tenant.organization.id,
    environmentId: live ? tenant.production.id : tenant.development.id,
    name: "Acme",
    uid,
  });
}

async function eventType(tenant: TestTenant, name: string, live = false) {
  return createHookEventType({
    organizationId: tenant.organization.id,
    environmentId: live ? tenant.production.id : tenant.development.id,
    name,
    examples: [{ example: true }],
  });
}

async function caught(promise: Promise<unknown>): Promise<HookError> {
  const error = await promise.then(
    () => null,
    (cause: unknown) => cause,
  );
  if (!(error instanceof HookError)) throw new Error(`expected a HookError, got ${error}`);
  return error;
}

describe("applications", () => {
  test("are found by id or uid, only in their environment; uids are unique", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const created = await app(tenant, "customer_1");
    const lookup = (ref: string, environmentId = tenant.development.id) =>
      findHookApplication({ organizationId, environmentId, ref });

    expect((await lookup(created.id))?.id).toBe(created.id);
    expect((await lookup("customer_1"))?.id).toBe(created.id);
    expect(await lookup("customer_1", tenant.production.id)).toBeNull();
    expect(await lookup("nobody")).toBeNull();

    expect((await caught(app(tenant, "customer_1"))).code).toBe("uid_taken");
    // The same uid in another environment is another application.
    expect((await app(tenant, "customer_1", true)).id).not.toBe(created.id);

    const other = await app(tenant, "customer_2");
    expect(
      (await caught(updateHookApplication({ organizationId, id: other.id, uid: "customer_1" })))
        .code,
    ).toBe("uid_taken");
    const renamed = await updateHookApplication({ organizationId, id: other.id, uid: null });
    expect(renamed.uid).toBeNull();
  });

  test("page newest first with a cursor", async () => {
    const tenant = await createTestTenant();
    const [a, b, c] = [(await app(tenant)).id, (await app(tenant)).id, (await app(tenant)).id];
    const base = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
    const first = await pageHookApplications({ ...base, limit: 2 });
    expect(first.applications.map((row) => row.id)).toEqual([c, b]);
    expect(first.hasMore).toBe(true);
    const second = await pageHookApplications({ ...base, limit: 2, after: b });
    expect(second).toMatchObject({ hasMore: false });
    expect(second.applications.map((row) => row.id)).toEqual([a]);
  });
});

describe("event types", () => {
  test("are unique by name, archive and restore, and gate endpoint filters", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const environmentId = tenant.development.id;
    const created = await eventType(tenant, "invoice.paid");
    expect(toHookEventTypeObject(created)).toMatchObject({
      object: "hook_event_type",
      name: "invoice.paid",
      archived: false,
      examples: [{ example: true }],
    });
    expect((await caught(eventType(tenant, "invoice.paid"))).code).toBe("event_type_exists");

    const application = await app(tenant);
    const endpointWith = (filterTypes: string[]) =>
      createHookEndpoint(
        {
          organizationId,
          environmentId,
          applicationId: application.id,
          url: "https://example.com/hook",
          filterTypes,
        },
        testHookDeps,
      );
    const { endpoint } = await endpointWith(["invoice.paid", "invoice.paid"]);
    expect(endpoint.filterTypes).toEqual(["invoice.paid"]);
    expect((await caught(endpointWith(["invoice.voided"]))).code).toBe("unknown_event_type");

    await updateHookEventType({
      organizationId,
      environmentId,
      name: "invoice.paid",
      archived: true,
    });
    expect((await caught(endpointWith(["invoice.paid"]))).code).toBe("unknown_event_type");
    expect((await pageHookEventTypes({ organizationId, environmentId })).eventTypes).toEqual([]);
    const all = await pageHookEventTypes({ organizationId, environmentId, includeArchived: true });
    expect(all.eventTypes.map((row) => row.name)).toEqual(["invoice.paid"]);
    await updateHookEventType({
      organizationId,
      environmentId,
      name: "invoice.paid",
      archived: false,
    });
    expect((await endpointWith(["invoice.paid"])).endpoint.filterTypes).toEqual(["invoice.paid"]);
  });
});

describe("endpoints", () => {
  test("encrypt a generated or supplied secret, roll it, and record why they are disabled", async () => {
    const tenant = await createTestTenant();
    const application = await app(tenant);
    const base = {
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      applicationId: application.id,
    };
    const { endpoint, secret } = await createHookEndpoint(
      { ...base, url: "https://example.com/hook" },
      testHookDeps,
    );
    expect(secret).toStartWith("whsec_");
    expect(endpoint.secretCiphertext).not.toContain(secret);
    expect(revealHookEndpointSecret(endpoint, testHookDeps)).toBe(secret);

    const supplied = `whsec_${Buffer.alloc(32, 1).toString("base64")}`;
    const imported = await createHookEndpoint(
      { ...base, url: "https://example.com/other", secret: supplied },
      testHookDeps,
    );
    expect(imported.secret).toBe(supplied);
    expect(
      (
        await caught(
          createHookEndpoint(
            { ...base, url: "https://example.com/x", secret: "whsec_short" },
            testHookDeps,
          ),
        )
      ).code,
    ).toBe("invalid_secret");
    expect(
      (await caught(createHookEndpoint({ ...base, url: "ftp://example.com" }, testHookDeps))).code,
    ).toBe("invalid_url");

    const rolled = await rollHookEndpointSecret({ ...base, id: endpoint.id }, testHookDeps);
    expect(rolled.secret).not.toBe(secret);
    expect(toHookEndpointObject(rolled.endpoint).previous_secret_expires_at).not.toBeNull();

    const disabled = await updateHookEndpoint(
      { ...base, id: endpoint.id, enabled: false },
      testHookDeps,
    );
    expect(disabled).toMatchObject({ enabled: false, disabledReason: "manual" });
    const enabled = await updateHookEndpoint(
      { ...base, id: endpoint.id, enabled: true },
      testHookDeps,
    );
    expect(enabled).toMatchObject({ enabled: true, disabledReason: null, failingSince: null });
  });

  test(`a sandbox application has at most ${MAX_ENDPOINTS.sandbox}`, async () => {
    const tenant = await createTestTenant();
    const application = await app(tenant);
    const create = (n: number) =>
      createHookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          applicationId: application.id,
          url: `https://example.com/${n}`,
        },
        testHookDeps,
      );
    for (let n = 0; n < MAX_ENDPOINTS.sandbox; n++) await create(n);
    expect((await caught(create(99))).code).toBe("too_many_endpoints");
  });
});

describe("sendHookMessage", () => {
  async function setup(live = false) {
    const tenant = await createTestTenant();
    const application = await app(tenant, undefined, live);
    await eventType(tenant, "invoice.paid", live);
    await eventType(tenant, "invoice.voided", live);
    const endpoint = (url: string, filterTypes: string[] = [], enabled = true) =>
      createHookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: application.environmentId,
          applicationId: application.id,
          url,
          filterTypes,
          enabled,
        },
        testHookDeps,
      );
    return { tenant, application, endpoint };
  }

  const deliveriesOf = (messageId: string) =>
    db.select().from(schema.hookDelivery).where(eq(schema.hookDelivery.messageId, messageId));

  test("fans out to enabled endpoints whose filter matches, and stores messages nobody gets", async () => {
    const { tenant, application, endpoint } = await setup();
    const all = (await endpoint("https://example.com/all")).endpoint;
    const paid = (await endpoint("https://example.com/paid", ["invoice.paid"])).endpoint;
    await endpoint("https://example.com/voided", ["invoice.voided"]);
    await endpoint("https://example.com/off", [], false);
    const organizationId = tenant.organization.id;

    expect(
      await countHookFanout({
        organizationId,
        applicationId: application.id,
        eventType: "invoice.paid",
      }),
    ).toBe(2);
    const { message, deliveries } = await sendHookMessage({
      application,
      eventType: "invoice.paid",
      payload: { amount: 42 },
    });
    expect(deliveries).toBe(2);
    expect((await deliveriesOf(message.id)).map((row) => row.endpointId).sort()).toEqual(
      [all.id, paid.id].sort(),
    );
    // The id encodes the message's partition time.
    expect(
      await getHookMessage({ organizationId, applicationId: application.id, id: message.id }),
    ).toMatchObject({ eventType: "invoice.paid", payload: { amount: 42 } });

    const unsubscribed = await sendHookMessage({
      application,
      eventType: "customer.created",
      payload: {},
    });
    expect(unsubscribed.deliveries).toBe(1);
    const page = await pageHookMessages({ organizationId, applicationId: application.id });
    expect(page.messages.map((row) => row.id)).toEqual([unsubscribed.message.id, message.id]);
    const ofType = await pageHookMessages({
      organizationId,
      applicationId: application.id,
      eventType: "invoice.paid",
    });
    expect(ofType.messages.map((row) => row.id)).toEqual([message.id]);
    const after = await pageHookMessages({
      organizationId,
      applicationId: application.id,
      after: unsubscribed.message.id,
    });
    expect(after.messages.map((row) => row.id)).toEqual([message.id]);
  });

  test("refuses payloads that aren't objects or are too large", async () => {
    const { application } = await setup();
    const send = (payload: unknown) =>
      caught(
        sendHookMessage({
          application,
          eventType: "invoice.paid",
          payload: payload as Record<string, unknown>,
        }),
      );
    expect((await send([1, 2])).param).toBe("payload");
    expect((await send({ blob: "x".repeat(MAX_PAYLOAD_BYTES) })).code).toBe("payload_too_large");
  });

  test("an idempotency key replays the first message, and refuses another request", async () => {
    const { application, endpoint } = await setup();
    await endpoint("https://example.com/all");
    const send = (amount: number) =>
      sendHookMessage({
        application,
        eventType: "invoice.paid",
        payload: { amount },
        idempotencyKey: `key-${application.id}`,
      });
    const first = await send(1);
    const again = await send(1);
    expect(first.replayed).toBe(false);
    expect(again).toMatchObject({ replayed: true });
    expect(again.message.id).toBe(first.message.id);
    expect(await deliveriesOf(first.message.id)).toHaveLength(1);
    await expect(send(2)).rejects.toMatchObject({ code: "idempotency_key_reused" });

    // Concurrent requests with one key send once.
    const key = `race-${application.id}`;
    const raced = await Promise.all(
      [1, 2, 3].map(() =>
        sendHookMessage({
          application,
          eventType: "invoice.paid",
          payload: {},
          idempotencyKey: key,
        }),
      ),
    );
    expect(new Set(raced.map((sent) => sent.message.id)).size).toBe(1);
    expect(raced.filter((sent) => !sent.replayed)).toHaveLength(1);
  });

  test("live sends are refused while the organization is suspended; replays still return", async () => {
    const { tenant, application } = await setup(true);
    const send = () =>
      sendHookMessage({
        application,
        eventType: "invoice.paid",
        payload: {},
        idempotencyKey: "suspended",
      });
    const first = await send();
    await suspendOrganization({
      organizationId: tenant.organization.id,
      trigger: "manual",
      actor: { kind: "system" },
    });
    expect((await send()).message.id).toBe(first.message.id);
    expect(
      (await caught(sendHookMessage({ application, eventType: "invoice.paid", payload: {} }))).code,
    ).toBe("account_suspended");
  });
});
