import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { RETENTION_DAYS } from "@coss/retention";
import { createTestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { eq, inArray, sql } from "drizzle-orm";
import { createWebhookEndpoint } from "../src/endpoints.ts";
import { enqueueWebhookMessage } from "../src/outbox.ts";
import { purgeExpiredWebhookMessages } from "../src/retention.ts";
import { testManagementDeps } from "../src/testing.ts";

const { webhookAttempt, webhookDelivery, webhookMessage } = schema;

describe("purgeExpiredWebhookMessages", () => {
  test("deletes old finished messages with their deliveries and attempts, keeping pending ones", async () => {
    const tenant = await createTestTenant();
    const scope = { organizationIds: [tenant.organization.id] };
    await createWebhookEndpoint(
      {
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        url: "https://example.com/hook",
        eventTypes: [],
        apiVersion: LATEST_API_VERSION,
        userId: tenant.owner.id,
      },
      testManagementDeps,
    );
    const enqueue = async () => {
      const id = newId("evt");
      await enqueueWebhookMessage(db, {
        id,
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        type: "email.delivered",
        payload: { id, object: "event", type: "email.delivered", data: {} },
      });
      return id;
    };
    const [finished, pending, recent] = [await enqueue(), await enqueue(), await enqueue()];

    const [delivery] = await db
      .update(webhookDelivery)
      .set({ status: "succeeded", nextAttemptAt: null })
      .where(eq(webhookDelivery.messageId, finished))
      .returning();
    if (!delivery) throw new Error("no delivery");
    await db.insert(webhookAttempt).values({
      organizationId: tenant.organization.id,
      deliveryId: delivery.id,
      attemptedAt: new Date(),
      statusCode: 200,
      durationMs: 12,
    });
    await db
      .update(webhookMessage)
      .set({
        createdAt: sql`now() - make_interval(days => ${RETENTION_DAYS.webhookDeliveries + 1})`,
      })
      .where(inArray(webhookMessage.id, [finished, pending]));

    expect(await purgeExpiredWebhookMessages({ scope })).toBe(1);
    expect(await purgeExpiredWebhookMessages({ scope })).toBe(0);
    const left = await db
      .select({ id: webhookMessage.id })
      .from(webhookMessage)
      .where(inArray(webhookMessage.id, [finished, pending, recent]));
    expect(left.map((row) => row.id).sort()).toEqual([pending, recent].sort());
    const attempts = await db
      .select()
      .from(webhookAttempt)
      .where(eq(webhookAttempt.deliveryId, delivery.id));
    expect(attempts).toEqual([]);
  });
});
