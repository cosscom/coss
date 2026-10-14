import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { queryLogs } from "@coss/logs";
import { requestOrganizationDeletion } from "@coss/tenancy";
import { suspendOrganization, unsuspendOrganization } from "@coss/tenancy/admin";
import { createTestTenant, createTestUser, type TestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { TEST_NEXT_VERSION, testVersioning } from "@coss/versioning/testing";
import { and, eq } from "drizzle-orm";
import {
  MAX_ATTEMPTS,
  RETRY_DELAYS_MS,
  recoverWebhookEndpoint,
  renderWebhookPayload,
  retryWebhookDelivery,
  runDueWebhookDeliveries,
} from "../src/deliver.ts";
import {
  createWebhookEndpoint,
  listWebhookDeliveries,
  MAX_ENDPOINTS_PER_ENVIRONMENT,
  revealWebhookSecret,
  toWebhookEndpointObject,
  updateWebhookEndpoint,
} from "../src/endpoints.ts";
import { LEASE_MS } from "../src/engine/index.ts";
import { WebhookError } from "../src/errors.ts";
import { enqueueWebhookMessage } from "../src/outbox.ts";
import { signPayload } from "../src/signing.ts";
import {
  TEST_SECRETS_KEYS,
  testManagementDeps,
  testSender,
  webhookReceiver,
} from "../src/testing.ts";

const deliveryDeps = { secretsKeys: TEST_SECRETS_KEYS, send: testSender() };

async function endpointFor(tenant: TestTenant, url: string, eventTypes: string[] = []) {
  return createWebhookEndpoint(
    {
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      url,
      eventTypes,
      apiVersion: LATEST_API_VERSION,
      userId: tenant.owner.id,
    },
    testManagementDeps,
  );
}

async function enqueue(tenant: TestTenant, type = "email.delivered") {
  const id = newId("evt");
  const queued = await enqueueWebhookMessage(db, {
    id,
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    type,
    payload: { id, object: "event", type, data: { email_id: "email_x" } },
  });
  return { id, queued };
}

const scopeOf = (tenant: TestTenant) => ({ organizationIds: [tenant.organization.id] });

describe("endpoints", () => {
  test("store an encrypted secret and validate the URL", async () => {
    const tenant = await createTestTenant();
    const { endpoint, secret } = await endpointFor(tenant, "https://example.com/hook", [
      "email.bounced",
      "email.bounced",
    ]);

    expect(endpoint).toMatchObject({
      url: "https://example.com/hook",
      eventTypes: ["email.bounced"],
      enabled: true,
      projectId: tenant.project.id,
    });
    expect(endpoint.secretCiphertext).not.toContain(secret);
    expect(revealWebhookSecret(endpoint, TEST_SECRETS_KEYS)).toBe(secret);

    const strict = { ...testManagementDeps, allowInsecureUrls: false };
    await expect(
      createWebhookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          url: "http://127.0.0.1/hook",
          eventTypes: [],
          apiVersion: LATEST_API_VERSION,
          userId: null,
        },
        strict,
      ),
    ).rejects.toThrow(WebhookError);
  });

  test("belong to an environment of the organization, at most 10 each", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    await expect(
      createWebhookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: other.development.id,
          url: "https://example.com/hook",
          eventTypes: [],
          apiVersion: LATEST_API_VERSION,
          userId: null,
        },
        testManagementDeps,
      ),
    ).rejects.toMatchObject({ code: "not_found" });

    for (let i = 0; i < MAX_ENDPOINTS_PER_ENVIRONMENT; i++) {
      await endpointFor(tenant, `https://example.com/hook/${i}`);
    }
    await expect(endpointFor(tenant, "https://example.com/one-more")).rejects.toMatchObject({
      code: "too_many_endpoints",
    });
  });
});

describe("updateWebhookEndpoint", () => {
  test("changes only the fields given, keeping the secret", async () => {
    const tenant = await createTestTenant();
    const { endpoint, secret } = await endpointFor(tenant, "https://example.com/hook", [
      "email.sent",
    ]);

    const updated = await updateWebhookEndpoint(
      {
        organizationId: tenant.organization.id,
        id: endpoint.id,
        url: "https://example.com/other",
        eventTypes: ["email.bounced", "email.sent", "email.bounced"],
        enabled: false,
      },
      testManagementDeps,
    );

    expect(updated).toMatchObject({
      url: "https://example.com/other",
      // Deduplicated and sorted, like on create.
      eventTypes: ["email.bounced", "email.sent"],
      enabled: false,
      description: null,
    });
    expect(revealWebhookSecret(updated, TEST_SECRETS_KEYS)).toBe(secret);
  });

  test("trims a description and clears it with null", async () => {
    const tenant = await createTestTenant();
    const { endpoint } = await endpointFor(tenant, "https://example.com/hook");
    const scope = { organizationId: tenant.organization.id, id: endpoint.id };

    const described = await updateWebhookEndpoint(
      { ...scope, description: "  Receiver  " },
      testManagementDeps,
    );
    const cleared = await updateWebhookEndpoint(
      { ...scope, description: null },
      testManagementDeps,
    );

    expect(described.description).toBe("Receiver");
    expect(cleared.description).toBeNull();
    // Everything else is untouched by a description-only update.
    expect(cleared.url).toBe(endpoint.url);
  });

  test("with nothing to change still reports a missing endpoint", async () => {
    const tenant = await createTestTenant();
    const { endpoint } = await endpointFor(tenant, "https://example.com/hook");
    const scope = { organizationId: tenant.organization.id };

    const unchanged = await updateWebhookEndpoint(
      { ...scope, id: endpoint.id },
      testManagementDeps,
    );

    expect(unchanged).toEqual(endpoint);
    await expect(
      updateWebhookEndpoint(
        { ...scope, id: "whep_01k7c8m4q2f3e9v6t5r1n0p8yz" },
        testManagementDeps,
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  test("rejects an unusable URL and another organization's endpoint", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { endpoint } = await endpointFor(tenant, "https://example.com/hook");

    await expect(
      updateWebhookEndpoint(
        { organizationId: tenant.organization.id, id: endpoint.id, url: "ftp://example.com" },
        testManagementDeps,
      ),
    ).rejects.toMatchObject({ code: "invalid_url" });
    await expect(
      updateWebhookEndpoint(
        { organizationId: other.organization.id, id: endpoint.id, enabled: false },
        testManagementDeps,
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    // The rejected URL was never stored.
    const [row] = await db
      .select()
      .from(schema.webhookEndpoint)
      .where(eq(schema.webhookEndpoint.id, endpoint.id));
    expect(row?.url).toBe("https://example.com/hook");
    expect(row?.enabled).toBe(true);
  });
});

describe("API versions", () => {
  test("an endpoint's version must be a known one", async () => {
    const tenant = await createTestTenant();
    await expect(
      createWebhookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          url: "https://example.com/hook",
          eventTypes: [],
          apiVersion: "2000-01-01",
          userId: null,
        },
        testManagementDeps,
      ),
    ).rejects.toMatchObject({ code: "invalid_api_version" });
    const { endpoint } = await endpointFor(tenant, "https://example.com/hook");
    expect(endpoint.apiVersion).toBe(LATEST_API_VERSION);
    await expect(
      updateWebhookEndpoint(
        { organizationId: tenant.organization.id, id: endpoint.id, apiVersion: "latest" },
        testManagementDeps,
      ),
    ).rejects.toMatchObject({ code: "invalid_api_version" });
  });

  test.each(["2100-01-01", "2098-01-01"])(
    "renderWebhookPayload labels an unknown pin %s with the resolved schema version",
    (pin) => {
      const versioning = testVersioning();
      const stored = {
        object: "event",
        type: "email.sent",
        api_version: pin,
        data: { recipient: "a" },
      };
      const rendered = renderWebhookPayload(stored, pin, versioning);
      expect(rendered.api_version).toBe(
        pin > TEST_NEXT_VERSION ? TEST_NEXT_VERSION : LATEST_API_VERSION,
      );
      expect(rendered.data).toEqual(
        pin > TEST_NEXT_VERSION ? { recipient: "a" } : { address: "a" },
      );
      expect(stored.data).toEqual({ recipient: "a" });
      expect(renderWebhookPayload({ object: "event" }, pin, versioning).api_version).toBe(
        rendered.api_version,
      );
    },
  );

  test("renderWebhookPayload places api_version after type and keeps the stored payload intact", () => {
    const stored = {
      id: "evt_1",
      object: "event",
      type: "email.sent",
      created_at: "x",
      data: { recipient: "a" },
    };
    const rendered = renderWebhookPayload(stored, LATEST_API_VERSION, testVersioning());
    expect(Object.keys(rendered)).toEqual([
      "id",
      "object",
      "type",
      "api_version",
      "created_at",
      "data",
    ]);
    expect(rendered.data).toEqual({ address: "a" });
    expect(stored.data).toEqual({ recipient: "a" });
  });
});

describe("toWebhookEndpointObject", () => {
  test("is the wire shape, without the secret", async () => {
    const tenant = await createTestTenant();
    const { endpoint } = await endpointFor(tenant, "https://example.com/hook", ["email.sent"]);

    const object = toWebhookEndpointObject(endpoint);

    expect(object).toEqual({
      object: "webhook_endpoint",
      id: endpoint.id,
      url: "https://example.com/hook",
      description: null,
      event_types: ["email.sent"],
      api_version: LATEST_API_VERSION,
      enabled: true,
      disabled_reason: null,
      disabled_at: null,
      failing_since: null,
      previous_secret_expires_at: null,
      created_at: endpoint.createdAt.toISOString(),
      updated_at: endpoint.updatedAt.toISOString(),
    });
    expect(JSON.stringify(object)).not.toContain("whsec_");
  });
});

describe("enqueueWebhookMessage", () => {
  test("fans out to enabled endpoints subscribed to the type, once per message", async () => {
    const tenant = await createTestTenant();
    await endpointFor(tenant, "https://example.com/all");
    await endpointFor(tenant, "https://example.com/bounces", ["email.bounced"]);
    const { endpoint: disabled } = await endpointFor(tenant, "https://example.com/off");
    await updateWebhookEndpoint(
      { organizationId: tenant.organization.id, id: disabled.id, enabled: false },
      testManagementDeps,
    );

    expect((await enqueue(tenant, "email.delivered")).queued).toBe(1);
    expect((await enqueue(tenant, "email.bounced")).queued).toBe(2);
  });

  test("records nothing without subscribed endpoints", async () => {
    const tenant = await createTestTenant();
    const { id, queued } = await enqueue(tenant);
    expect(queued).toBe(0);
    const stored = await db
      .select()
      .from(schema.webhookMessage)
      .where(eq(schema.webhookMessage.id, id));
    expect(stored).toHaveLength(0);
  });
});

describe("runDueWebhookDeliveries", () => {
  test("delivers a signed request and records the attempt", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      const { endpoint, secret } = await endpointFor(tenant, receiver.url);
      const { id } = await enqueue(tenant);
      const now = new Date();

      expect(await runDueWebhookDeliveries({ now, scope: scopeOf(tenant) }, deliveryDeps)).toBe(1);

      const [request] = receiver.received;
      if (!request) throw new Error("nothing received");
      const timestamp = Number(request.headers.get("webhook-timestamp"));
      expect(timestamp).toBe(Math.floor(now.getTime() / 1000));
      expect(request.headers.get("webhook-id")).toBe(id);
      expect(request.headers.get("webhook-signature")).toBe(
        signPayload({ secret, id, timestamp, body: request.body }),
      );
      // The stored event, with the endpoint's API version after its type.
      expect(request.body).toBe(
        JSON.stringify({
          id,
          object: "event",
          type: "email.delivered",
          api_version: LATEST_API_VERSION,
          data: { email_id: "email_x" },
        }),
      );

      const [logged] = await listWebhookDeliveries({
        organizationId: tenant.organization.id,
        endpointId: endpoint.id,
      });
      expect(logged).toMatchObject({
        status: "succeeded",
        attemptCount: 1,
        lastStatusCode: 200,
        nextAttemptAt: null,
        eventType: "email.delivered",
      });
      expect(logged?.attempts).toMatchObject([{ statusCode: 200, responseExcerpt: "ok" }]);
      expect(await runDueWebhookDeliveries({ now, scope: scopeOf(tenant) }, deliveryDeps)).toBe(0);
    } finally {
      receiver.stop();
    }
  });

  test("renders each endpoint's API version, signing the bytes it sends", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      // With the test registry, stored payloads are TEST_NEXT_VERSION; LATEST_API_VERSION is one behind.
      const versioning = testVersioning();
      const current = await endpointFor(tenant, `${receiver.url}/current`);
      const older = await endpointFor(tenant, `${receiver.url}/older`);
      await db
        .update(schema.webhookEndpoint)
        .set({ apiVersion: TEST_NEXT_VERSION })
        .where(eq(schema.webhookEndpoint.id, current.endpoint.id));
      const id = newId("evt");
      await enqueueWebhookMessage(db, {
        id,
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        type: "email.bounced",
        payload: {
          id,
          object: "event",
          type: "email.bounced",
          data: { email_id: "e", recipient: "a@x.test" },
        },
      });

      const now = new Date();
      await runDueWebhookDeliveries(
        { now, scope: scopeOf(tenant) },
        { ...deliveryDeps, versioning },
      );

      const byPath = (path: string) =>
        receiver.received.find((r) => new URL(r.url).pathname === path);
      const newer = byPath("/webhooks/current");
      const old = byPath("/webhooks/older");
      if (!newer || !old) throw new Error("not delivered");
      expect(JSON.parse(newer.body)).toEqual({
        id,
        object: "event",
        type: "email.bounced",
        api_version: TEST_NEXT_VERSION,
        data: { email_id: "e", recipient: "a@x.test" },
      });
      expect(JSON.parse(old.body)).toEqual({
        id,
        object: "event",
        type: "email.bounced",
        api_version: LATEST_API_VERSION,
        data: { email_id: "e", address: "a@x.test" },
      });
      const timestamp = Number(old.headers.get("webhook-timestamp"));
      expect(old.headers.get("webhook-signature")).toBe(
        signPayload({ secret: older.secret, id, timestamp, body: old.body }),
      );
    } finally {
      receiver.stop();
    }
  });

  test("retries failures with backoff, then gives up; a manual retry tries once more", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver(() => new Response("nope", { status: 503 }));
    try {
      const { endpoint } = await endpointFor(tenant, receiver.url);
      await enqueue(tenant);
      const scope = scopeOf(tenant);
      let now = new Date();

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        expect(await runDueWebhookDeliveries({ now, scope }, deliveryDeps)).toBe(1);
        // Not due again until its backoff has passed.
        expect(await runDueWebhookDeliveries({ now, scope }, deliveryDeps)).toBe(0);
        now = new Date(now.getTime() + (RETRY_DELAYS_MS[attempt - 1] ?? 0));
      }
      const log = () =>
        listWebhookDeliveries({ organizationId: tenant.organization.id, endpointId: endpoint.id });
      const [failed] = await log();
      expect(failed).toMatchObject({
        status: "failed",
        attemptCount: MAX_ATTEMPTS,
        lastStatusCode: 503,
        lastError: "HTTP 503",
      });
      expect(failed?.attempts).toHaveLength(MAX_ATTEMPTS);
      expect(await runDueWebhookDeliveries({ now, scope }, deliveryDeps)).toBe(0);

      if (!failed) throw new Error("missing delivery");
      expect(
        await retryWebhookDelivery({
          organizationId: tenant.organization.id,
          endpointId: endpoint.id,
          id: failed.id,
        }),
      ).toBe(true);
      expect(await runDueWebhookDeliveries({ scope }, deliveryDeps)).toBe(1);
      const [again] = await log();
      expect(again).toMatchObject({ status: "failed", attemptCount: MAX_ATTEMPTS });
      expect(again?.attempts).toHaveLength(MAX_ATTEMPTS + 1);
    } finally {
      receiver.stop();
    }
  });

  test("concurrent workers attempt a delivery once", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      await endpointFor(tenant, receiver.url);
      await enqueue(tenant);
      const scope = scopeOf(tenant);

      const counts = await Promise.all([
        runDueWebhookDeliveries({ scope }, deliveryDeps),
        runDueWebhookDeliveries({ scope }, deliveryDeps),
        runDueWebhookDeliveries({ scope }, deliveryDeps),
      ]);
      expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
      expect(receiver.received).toHaveLength(1);
    } finally {
      receiver.stop();
    }
  });

  test("a disabled endpoint's pending deliveries fail without a request", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      const { endpoint } = await endpointFor(tenant, receiver.url);
      await enqueue(tenant);
      await updateWebhookEndpoint(
        { organizationId: tenant.organization.id, id: endpoint.id, enabled: false },
        testManagementDeps,
      );

      await runDueWebhookDeliveries({ scope: scopeOf(tenant) }, deliveryDeps);

      expect(receiver.received).toHaveLength(0);
      const [delivery] = await listWebhookDeliveries({
        organizationId: tenant.organization.id,
        endpointId: endpoint.id,
      });
      expect(delivery).toMatchObject({ status: "failed", lastError: "The endpoint is disabled." });
    } finally {
      receiver.stop();
    }
  });

  test("a suspended organization's deliveries are held until the suspension is lifted", async () => {
    const tenant = await createTestTenant();
    const admin = await createTestUser();
    const actor = { userId: admin.id, email: admin.email };
    const receiver = webhookReceiver();
    try {
      const { endpoint } = await endpointFor(tenant, receiver.url);
      await enqueue(tenant);
      await suspendOrganization({ organizationId: tenant.organization.id, reason: "Test", actor });

      expect(await runDueWebhookDeliveries({ scope: scopeOf(tenant) }, deliveryDeps)).toBe(0);
      expect(receiver.received).toHaveLength(0);
      const [held] = await listWebhookDeliveries({
        organizationId: tenant.organization.id,
        endpointId: endpoint.id,
      });
      expect(held).toMatchObject({ status: "pending", attemptCount: 0 });

      await unsuspendOrganization({ organizationId: tenant.organization.id, actor });
      expect(await runDueWebhookDeliveries({ scope: scopeOf(tenant) }, deliveryDeps)).toBe(1);
      expect(receiver.received).toHaveLength(1);
    } finally {
      receiver.stop();
    }
  });

  test("nothing more is delivered once the organization's deletion is requested", async () => {
    const tenant = await createTestTenant();
    const receiver = webhookReceiver();
    try {
      await endpointFor(tenant, receiver.url);
      await enqueue(tenant);
      await requestOrganizationDeletion({
        organizationId: tenant.organization.id,
        actor: { userId: tenant.owner.id, email: tenant.owner.email },
      });
      expect(await runDueWebhookDeliveries({ scope: scopeOf(tenant) }, deliveryDeps)).toBe(0);
      expect(receiver.received).toHaveLength(0);
    } finally {
      receiver.stop();
    }
  });
});

describe("leases", () => {
  test("a worker whose lease was taken over records nothing", async () => {
    const tenant = await createTestTenant();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const receiver = webhookReceiver(async () => {
      // The first worker's request hangs until its lease has been taken over.
      if (++calls === 1) await gate;
      return new Response("ok");
    });
    try {
      const { endpoint } = await endpointFor(tenant, receiver.url);
      await enqueue(tenant);
      const scope = scopeOf(tenant);
      const now = new Date();
      const late = runDueWebhookDeliveries({ now, scope }, deliveryDeps);
      while (receiver.received.length === 0) await Bun.sleep(5);

      const takeover = new Date(now.getTime() + LEASE_MS + 1000);
      expect(await runDueWebhookDeliveries({ now: takeover, scope }, deliveryDeps)).toBe(1);
      release();
      expect(await late).toBe(1);

      const [delivery] = await listWebhookDeliveries({
        organizationId: tenant.organization.id,
        endpointId: endpoint.id,
      });
      expect(receiver.received).toHaveLength(2);
      expect(delivery).toMatchObject({ status: "succeeded", attemptCount: 1 });
      expect(delivery?.attempts.map((attempt) => attempt.attemptedAt)).toEqual([takeover]);
    } finally {
      release();
      receiver.stop();
    }
  });
});

describe("endpoint health", () => {
  const endpointRow = (id: string) =>
    db.select().from(schema.webhookEndpoint).where(eq(schema.webhookEndpoint.id, id));

  /** Runs one delivery through every attempt, starting at `start`; returns when it gave up. */
  async function failForGood(tenant: TestTenant, start: Date, deps = deliveryDeps) {
    await enqueue(tenant);
    // Never before the delivery was queued.
    let now = new Date(Math.max(start.getTime(), Date.now()));
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await runDueWebhookDeliveries({ now, scope: scopeOf(tenant) }, deps);
      now = new Date(now.getTime() + (RETRY_DELAYS_MS[attempt - 1] ?? 0));
    }
    return now;
  }

  test("an endpoint switched off without a reason (code from before the column) reads as manual", async () => {
    const tenant = await createTestTenant();
    const { endpoint } = await endpointFor(tenant, "https://example.com/hook");
    // What the code running during a deploy's migration does: `enabled` alone.
    await db
      .update(schema.webhookEndpoint)
      .set({ enabled: false })
      .where(eq(schema.webhookEndpoint.id, endpoint.id));
    const [row] = await endpointRow(endpoint.id);
    expect(toWebhookEndpointObject(row as NonNullable<typeof row>)).toMatchObject({
      enabled: false,
      disabled_reason: "manual",
    });
  });

  test("tracks a failure streak and disables an endpoint failing for too long", async () => {
    const tenant = await createTestTenant();
    let status = 500;
    const receiver = webhookReceiver(() => new Response("down", { status }));
    const deps = { ...deliveryDeps, disableAfterMs: 2 * 24 * 3_600_000 };
    try {
      const { endpoint } = await endpointFor(tenant, receiver.url);
      const start = new Date();
      const firstGaveUp = await failForGood(tenant, start, deps);
      const [failing] = await endpointRow(endpoint.id);
      const since = failing?.failingSince?.getTime();
      expect(failing?.enabled).toBe(true);
      expect(since).toBeNumber();

      // A success clears the streak; the next failure for good starts a new one.
      status = 200;
      await enqueue(tenant);
      await runDueWebhookDeliveries({ now: firstGaveUp, scope: scopeOf(tenant) }, deps);
      expect((await endpointRow(endpoint.id))[0]?.failingSince).toBeNull();

      status = 500;
      const later = await failForGood(tenant, firstGaveUp, deps);
      expect((await endpointRow(endpoint.id))[0]).toMatchObject({ enabled: true });
      // Still failing two days on: the next delivery to give up disables the endpoint.
      await failForGood(tenant, new Date(later.getTime() + 2 * 24 * 3_600_000), deps);
      const [disabled] = await endpointRow(endpoint.id);
      expect(disabled).toMatchObject({ enabled: false, disabledReason: "failing" });
      expect(disabled?.failingSince?.getTime()).toBeGreaterThan(since ?? 0);
      expect(toWebhookEndpointObject(disabled as NonNullable<typeof disabled>)).toMatchObject({
        enabled: false,
        disabled_reason: "failing",
      });
      const audit = await db
        .select()
        .from(schema.orgAuditEvent)
        .where(
          and(
            eq(schema.orgAuditEvent.organizationId, tenant.organization.id),
            eq(schema.orgAuditEvent.action, "webhook_endpoint.disabled"),
          ),
        );
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ actorType: "system", targetId: endpoint.id });

      // Enabling it again clears the reason and the streak.
      const enabled = await updateWebhookEndpoint(
        { organizationId: tenant.organization.id, id: endpoint.id, enabled: true },
        testManagementDeps,
      );
      expect(enabled).toMatchObject({
        enabled: true,
        disabledReason: null,
        disabledAt: null,
        failingSince: null,
      });
    } finally {
      receiver.stop();
    }
  });

  test("disabling by hand records `manual`, and disabling again keeps the first time", async () => {
    const tenant = await createTestTenant();
    const { endpoint } = await endpointFor(tenant, "https://example.com/hook");
    const off = () =>
      updateWebhookEndpoint(
        { organizationId: tenant.organization.id, id: endpoint.id, enabled: false },
        testManagementDeps,
      );
    const first = await off();
    expect(first).toMatchObject({ enabled: false, disabledReason: "manual" });
    const second = await off();
    expect(second.disabledAt).toEqual(first.disabledAt);
  });
});

describe("recoverWebhookEndpoint", () => {
  test("requeues failed deliveries since a time, once each, in batches", async () => {
    const tenant = await createTestTenant();
    let status = 500;
    const receiver = webhookReceiver(() => new Response("", { status }));
    try {
      const { endpoint } = await endpointFor(tenant, receiver.url);
      const organizationId = tenant.organization.id;
      for (let i = 0; i < 3; i++) await enqueue(tenant);
      await db
        .update(schema.webhookDelivery)
        .set({ status: "failed", attemptCount: MAX_ATTEMPTS, nextAttemptAt: null })
        .where(eq(schema.webhookDelivery.endpointId, endpoint.id));
      const since = new Date(Date.now() - 60_000);

      expect(
        await recoverWebhookEndpoint({ organizationId, id: endpoint.id, since, limit: 2 }),
      ).toEqual({ requeued: 2, hasMore: true });
      expect(await recoverWebhookEndpoint({ organizationId, id: endpoint.id, since })).toEqual({
        requeued: 1,
        hasMore: false,
      });
      // Nothing failed since a later time; another organization's endpoint is not found.
      expect(
        await recoverWebhookEndpoint({ organizationId, id: endpoint.id, since: new Date() }),
      ).toEqual({ requeued: 0, hasMore: false });
      const other = await createTestTenant();
      await expect(
        recoverWebhookEndpoint({ organizationId: other.organization.id, id: endpoint.id, since }),
      ).rejects.toMatchObject({ code: "not_found" });

      // Spread over the next minute, each gets one more attempt.
      status = 200;
      const scope = scopeOf(tenant);
      const inAMinute = new Date(Date.now() + 61_000);
      expect(await runDueWebhookDeliveries({ now: inAMinute, scope }, deliveryDeps)).toBe(3);
      const deliveries = await listWebhookDeliveries({ organizationId, endpointId: endpoint.id });
      expect(deliveries.map((delivery) => delivery.status)).toEqual([
        "succeeded",
        "succeeded",
        "succeeded",
      ]);
      expect(deliveries.every((delivery) => delivery.attemptCount === MAX_ATTEMPTS)).toBe(true);
    } finally {
      receiver.stop();
    }
  });

  test("refuses a disabled endpoint", async () => {
    const tenant = await createTestTenant();
    const { endpoint } = await endpointFor(tenant, "https://example.com/hook");
    await updateWebhookEndpoint(
      { organizationId: tenant.organization.id, id: endpoint.id, enabled: false },
      testManagementDeps,
    );
    const error = await recoverWebhookEndpoint({
      organizationId: tenant.organization.id,
      id: endpoint.id,
      since: new Date(0),
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(WebhookError);
    expect(error).toMatchObject({ code: "endpoint_disabled" });
  });
});

describe("environment log", () => {
  test("every attempt is a webhook.attempt line: warning while retrying, error when given up", async () => {
    const tenant = await createTestTenant();
    let status = 500;
    const receiver = webhookReceiver(() => new Response("broken", { status }));
    try {
      const { endpoint } = await endpointFor(tenant, receiver.url);
      await enqueue(tenant, "email.bounced");
      const scope = scopeOf(tenant);
      const now = new Date();
      await runDueWebhookDeliveries({ now, scope }, deliveryDeps);
      status = 200;
      await runDueWebhookDeliveries(
        { now: new Date(now.getTime() + (RETRY_DELAYS_MS[0] ?? 0)), scope },
        deliveryDeps,
      );
      const page = await queryLogs({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        from: new Date(now.getTime() - 60_000),
        to: new Date(now.getTime() + 3_600_000),
        filters: { sources: ["webhook"] },
      });
      const [succeeded, retrying] = page.data;
      expect(retrying).toMatchObject({
        type: "webhook.attempt",
        level: "warning",
        message: `email.bounced → ${receiver.url} 500`,
        status_code: 500,
        error_code: "webhook_delivery_failed",
        resource_type: "email",
        resource_id: "email_x",
        attributes: expect.objectContaining({
          endpoint_id: endpoint.id,
          attempt: 1,
          outcome: "retrying",
          response_excerpt: "broken",
        }),
      });
      expect(succeeded).toMatchObject({ level: "info", status_code: 200, error_code: null });
      // The endpoint's id finds its attempts.
      const byEndpoint = await queryLogs({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        from: new Date(now.getTime() - 60_000),
        to: new Date(now.getTime() + 3_600_000),
        filters: { text: endpoint.id },
      });
      expect(byEndpoint.data).toHaveLength(2);
    } finally {
      receiver.stop();
    }
  });
});
