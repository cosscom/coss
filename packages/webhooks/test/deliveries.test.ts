import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  MAX_ATTEMPTS,
  RETRY_DELAYS_MS,
  retryWebhookDelivery,
  runDueWebhookDeliveries,
} from "../src/deliver.ts";
import {
  createWebhookEndpoint,
  listWebhookDeliveries,
  MAX_ENDPOINTS_PER_ENVIRONMENT,
  revealWebhookSecret,
  setWebhookEndpointEnabled,
} from "../src/endpoints.ts";
import { WebhookError } from "../src/errors.ts";
import { enqueueWebhookMessage } from "../src/outbox.ts";
import { signPayload } from "../src/signing.ts";
import {
  TEST_SECRETS_KEY,
  testManagementDeps,
  testSender,
  webhookReceiver,
} from "../src/testing.ts";

const deliveryDeps = { secretsKey: TEST_SECRETS_KEY, send: testSender() };

async function endpointFor(tenant: TestTenant, url: string, eventTypes: string[] = []) {
  return createWebhookEndpoint(
    {
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      url,
      eventTypes,
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
    expect(revealWebhookSecret(endpoint, TEST_SECRETS_KEY)).toBe(secret);

    const strict = { ...testManagementDeps, allowInsecureUrls: false };
    await expect(
      createWebhookEndpoint(
        {
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          url: "http://127.0.0.1/hook",
          eventTypes: [],
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

describe("enqueueWebhookMessage", () => {
  test("fans out to enabled endpoints subscribed to the type, once per message", async () => {
    const tenant = await createTestTenant();
    await endpointFor(tenant, "https://example.com/all");
    await endpointFor(tenant, "https://example.com/bounces", ["email.bounced"]);
    const { endpoint: disabled } = await endpointFor(tenant, "https://example.com/off");
    await setWebhookEndpointEnabled({
      organizationId: tenant.organization.id,
      id: disabled.id,
      enabled: false,
    });

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
      expect(JSON.parse(request.body)).toEqual({
        id,
        object: "event",
        type: "email.delivered",
        data: { email_id: "email_x" },
      });

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
      await setWebhookEndpointEnabled({
        organizationId: tenant.organization.id,
        id: endpoint.id,
        enabled: false,
      });

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
});
