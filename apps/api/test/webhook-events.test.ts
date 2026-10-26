import { describe, expect, test } from "bun:test";
import { WebhookTestEventObject } from "@coss/email/test-event-schemas";
import { createTestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { testVersioning } from "@coss/versioning/testing";
import { runDueWebhookDeliveries, type WebhookRequest } from "@coss/webhooks";
import type { WebhookEndpointWithSecretOutput } from "@coss/webhooks/schemas";
import { TEST_SECRETS_KEYS } from "@coss/webhooks/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  setKeyPermissions,
  type TestApp,
} from "./helpers.ts";

function trigger(app: TestApp, key: string, body: unknown, headers?: Record<string, string>) {
  return apiRequest(app, "POST", "/v1/webhook_events/test", { key, body, headers });
}

async function createEndpoint(
  app: TestApp,
  key: string,
  eventTypes: string[],
): Promise<WebhookEndpointWithSecretOutput> {
  const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
    key,
    body: { url: "https://hooks.example.com/coss", event_types: eventTypes },
  });
  expect(res.status).toBe(200);
  return (await res.json()) as WebhookEndpointWithSecretOutput;
}

describe("POST /v1/webhook_events/test", () => {
  test("sends a sample event to the subscribed endpoints and listeners, like a real one", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await createEndpoint(app, tenant.sandboxKey, ["email.bounced"]);
    await createEndpoint(app, tenant.sandboxKey, ["email.delivered"]);
    const opened = await apiRequest(app, "POST", "/v1/webhook_listeners", {
      key: tenant.sandboxKey,
      body: {},
    });
    const listener = (await opened.json()) as { id: string };

    const res = await trigger(app, tenant.sandboxKey, {
      type: "email.bounced",
      data: { recipient: "ada@example.com" },
    });
    expect(res.status).toBe(200);
    const body = WebhookTestEventObject.parse(await res.json());
    expect(body).toMatchObject({
      object: "webhook_test_event",
      endpoints: 1,
      listeners: 1,
      event: {
        object: "event",
        type: "email.bounced",
        api_version: LATEST_API_VERSION,
        data: { recipient: "ada@example.com", sandbox: true, bounce: { type: "permanent" } },
      },
    });

    // The endpoint gets the same body, signed, with the event id as its webhook-id.
    const sent: WebhookRequest[] = [];
    await runDueWebhookDeliveries(
      { scope: { organizationIds: [tenant.organization.id] } },
      {
        secretsKeys: TEST_SECRETS_KEYS,
        send: async (request) => {
          sent.push(request);
          return { status: 204, body: "" };
        },
      },
    );
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]?.body ?? "{}")).toEqual(body.event);
    expect(sent[0]?.headers["webhook-id"]).toBe(body.event.id);
    expect(sent[0]?.headers["webhook-signature"]).toStartWith("v1,");

    const polled = await apiRequest(app, "POST", `/v1/webhook_listeners/${listener.id}/poll`, {
      key: tenant.sandboxKey,
      body: { wait_ms: 0 },
    });
    const poll = (await polled.json()) as { deliveries: { event_id: string; body: string }[] };
    expect(poll.deliveries.map((delivery) => delivery.event_id)).toEqual([body.event.id]);
    expect(JSON.parse(poll.deliveries[0]?.body ?? "{}")).toEqual(body.event);
  });

  test("the event is rendered in the request's API version", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ versioning: testVersioning() });
    const res = await trigger(
      app,
      tenant.sandboxKey,
      { type: "email.delivered" },
      { "Coss-Version": LATEST_API_VERSION },
    );
    expect(res.status).toBe(200);
    const { event, endpoints, listeners } = (await res.json()) as {
      event: { api_version: string; data: Record<string, unknown> };
      endpoints: number;
      listeners: number;
    };
    expect({ endpoints, listeners }).toEqual({ endpoints: 0, listeners: 0 });
    expect(event.api_version).toBe(LATEST_API_VERSION);
    expect(event.data).toHaveProperty("address", "user@example.com");
    expect(event.data).not.toHaveProperty("recipient");
  });

  test("refuses live keys, live-only types, data that doesn't fit and keys without webhook:create", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const live = await trigger(app, tenant.liveKey, { type: "email.bounced" });
    expect(live.status).toBe(403);
    expect(await errorOf(live)).toMatchObject({
      type: "permission_error",
      code: "sandbox_only",
      hint: expect.stringContaining("https://coss.com/docs/environments.md"),
    });

    const billing = await trigger(app, tenant.sandboxKey, { type: "billing.invoice_paid" });
    expect(billing.status).toBe(422);
    expect(await errorOf(billing)).toMatchObject({
      type: "invalid_request_error",
      code: "live_only_event_type",
      param: "type",
    });

    const typo = await trigger(app, tenant.sandboxKey, {
      type: "contact.created",
      data: { contact: { emial: "ada@example.com" }, source: "carrier_pigeon" },
    });
    expect(typo.status).toBe(422);
    const error = await errorOf(typo);
    expect(error).toMatchObject({ code: "invalid_test_event", param: "data" });
    expect(error.issues?.map((issue) => issue.path).toSorted()).toEqual(["data.source"]);

    const unknown = await trigger(app, tenant.sandboxKey, {
      type: "contact.created",
      data: { contact: { emial: "ada@example.com" } },
    });
    expect((await errorOf(unknown)).issues).toEqual([
      { path: "data.contact.emial", message: "Not a field of contact.created events." },
    ]);

    const notAType = await trigger(app, tenant.sandboxKey, { type: "email.exploded" });
    expect(notAType.status).toBe(422);
    expect((await errorOf(notAType)).code).toBe("validation_error");

    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      webhook: ["read"],
    });
    const forbidden = await trigger(app, tenant.sandboxKey, { type: "email.bounced" });
    expect(forbidden.status).toBe(403);
  });
});
