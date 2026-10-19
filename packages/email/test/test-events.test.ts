import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createTestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { createWebhookEndpoint, createWebhookListener } from "@coss/webhooks";
import { testManagementDeps } from "@coss/webhooks/testing";
import { eq } from "drizzle-orm";
import { EmailError } from "../src/errors.ts";
import { WEBHOOK_EVENT_TYPES } from "../src/schemas.ts";
import {
  LIVE_ONLY_WEBHOOK_EVENT_TYPES,
  TEST_WEBHOOK_EVENT_TYPES,
  WebhookTestEventObject,
  webhookEventSchema,
} from "../src/test-event-schemas.ts";
import { sampleWebhookEvent, sendTestWebhookEvent } from "../src/test-events.ts";

const NOW = new Date("2026-10-19T12:00:00.000Z");

async function refusal(promise: Promise<unknown>): Promise<EmailError> {
  const error = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  if (!(error instanceof EmailError)) throw new Error(`expected an EmailError, got ${error}`);
  return error;
}

describe("test webhook events", () => {
  test("every event type is either testable or live-only", () => {
    expect([...TEST_WEBHOOK_EVENT_TYPES, ...LIVE_ONLY_WEBHOOK_EVENT_TYPES].toSorted()).toEqual(
      [...WEBHOOK_EVENT_TYPES].toSorted(),
    );
  });

  test.each([...TEST_WEBHOOK_EVENT_TYPES])("the %s sample is a valid event of its type", (type) => {
    const event = sampleWebhookEvent(type, NOW);
    expect(event).toMatchObject({ object: "event", type, created_at: NOW.toISOString() });
    expect(event.id).toStartWith("evt_");
    const parsed = webhookEventSchema(type).parse({ ...event, api_version: LATEST_API_VERSION });
    // Nothing in the sample is outside the schema.
    expect(parsed).toEqual({ ...event, api_version: LATEST_API_VERSION });
    if (type.startsWith("email.") && type !== "email.received") {
      expect(event.data).toMatchObject({ sandbox: true, occurred_at: NOW.toISOString() });
    }
  });

  test("samples carry the details of their type and fresh ids", () => {
    const bounced = sampleWebhookEvent("email.bounced", NOW);
    expect(bounced.data).toMatchObject({
      recipient: "user@example.com",
      bounce: { type: "permanent" },
    });
    expect(bounced.data).not.toHaveProperty("delivery");
    expect(sampleWebhookEvent("email.sent", NOW).data.recipient).toBeNull();
    expect(sampleWebhookEvent("broadcast.failed", NOW).data).toMatchObject({
      broadcast: { status: "failed" },
      error: { code: "render_failed" },
    });
    expect(sampleWebhookEvent("risk.assessment.reviewed", NOW).data.outcome).toBe("legitimate");
    expect(sampleWebhookEvent("email.delivered", NOW).id).not.toBe(
      sampleWebhookEvent("email.delivered", NOW).id,
    );
  });

  test("reaches the subscribed endpoints and listeners, with data merged over the sample", async () => {
    const tenant = await createTestTenant();
    const environment = {
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
    };
    const { endpoint } = await createWebhookEndpoint(
      {
        ...environment,
        url: "https://example.com/hook",
        eventTypes: ["email.bounced"],
        apiVersion: LATEST_API_VERSION,
        userId: null,
      },
      testManagementDeps,
    );
    // Not subscribed to bounces.
    await createWebhookEndpoint(
      {
        ...environment,
        url: "https://example.com/other",
        eventTypes: ["email.delivered"],
        apiVersion: LATEST_API_VERSION,
        userId: null,
      },
      testManagementDeps,
    );
    const listener = await createWebhookListener({
      ...environment,
      apiVersion: LATEST_API_VERSION,
      eventTypes: [],
    });

    const result = await sendTestWebhookEvent({
      ...environment,
      mode: "sandbox",
      type: "email.bounced",
      data: { recipient: "ada@example.com", bounce: { sub_type: "NoEmail" }, tags: [] },
      now: NOW,
    });
    expect(result).toMatchObject({ endpoints: 1, listeners: 1 });
    expect(result.event.data).toMatchObject({
      recipient: "ada@example.com",
      bounce: { type: "permanent", sub_type: "NoEmail" },
      tags: [],
    });
    expect(
      WebhookTestEventObject.safeParse({
        object: "webhook_test_event",
        event: { ...result.event, api_version: LATEST_API_VERSION },
        endpoints: 1,
        listeners: 1,
      }).success,
    ).toBe(true);

    const [message] = await db
      .select()
      .from(schema.webhookMessage)
      .where(eq(schema.webhookMessage.id, result.event.id));
    expect(message?.payload).toEqual(result.event);
    const deliveries = await db
      .select({ endpointId: schema.webhookDelivery.endpointId })
      .from(schema.webhookDelivery)
      .where(eq(schema.webhookDelivery.messageId, result.event.id));
    expect(deliveries).toEqual([{ endpointId: endpoint.id }]);
    const handed = await db
      .select({ listenerId: schema.webhookListenerDelivery.listenerId })
      .from(schema.webhookListenerDelivery)
      .where(eq(schema.webhookListenerDelivery.messageId, result.event.id));
    expect(handed).toEqual([{ listenerId: listener.id }]);
  });

  test("nothing subscribed: nothing stored", async () => {
    const tenant = await createTestTenant();
    const result = await sendTestWebhookEvent({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      mode: "sandbox",
      type: "contact.created",
    });
    expect(result).toMatchObject({ endpoints: 0, listeners: 0 });
    const stored = await db
      .select()
      .from(schema.webhookMessage)
      .where(eq(schema.webhookMessage.id, result.event.id));
    expect(stored).toEqual([]);
  });

  test("refuses live environments, live-only types and data that doesn't fit", async () => {
    const tenant = await createTestTenant();
    const environment = {
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
    };
    expect(
      (
        await refusal(
          sendTestWebhookEvent({
            organizationId: tenant.organization.id,
            environmentId: tenant.production.id,
            mode: "live",
            type: "email.bounced",
          }),
        )
      ).code,
    ).toBe("sandbox_only");
    const liveOnly = await refusal(
      sendTestWebhookEvent({ ...environment, mode: "sandbox", type: "billing.invoice_paid" }),
    );
    expect(liveOnly).toMatchObject({ code: "live_only_event_type" });
    expect(liveOnly.message).toContain("only reach live environments");

    const wrongType = await refusal(
      sendTestWebhookEvent({
        ...environment,
        mode: "sandbox",
        type: "email.bounced",
        data: { recipient: 5 },
      }),
    );
    expect(wrongType).toMatchObject({ code: "invalid_test_event", param: "data" });
    expect(wrongType.issues?.[0]?.path).toBe("data.recipient");

    const typo = await refusal(
      sendTestWebhookEvent({
        ...environment,
        mode: "sandbox",
        type: "email.bounced",
        data: { recipent: "ada@example.com", bounce: { subtype: "x" } },
      }),
    );
    expect(typo.issues?.map((issue) => issue.path)).toEqual([
      "data.recipent",
      "data.bounce.subtype",
    ]);

    // In the objects of a list too: the stored event is the one handlers receive.
    const inList = await refusal(
      sendTestWebhookEvent({
        ...environment,
        mode: "sandbox",
        type: "email.bounced",
        data: {
          tags: [
            { name: "template", value: "welcome" },
            { name: "plan", value: "pro", typo: true },
          ],
        },
      }),
    );
    expect(inList.issues?.map((issue) => issue.path)).toEqual(["data.tags.1.typo"]);
  });
});
