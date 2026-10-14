import { describe, expect, test } from "bun:test";
import { db, pool, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { RETENTION_DAYS } from "@coss/retention";
import { createTestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { eq, inArray, sql } from "drizzle-orm";
import { recoverWebhookEndpoint, retryWebhookDelivery } from "../src/deliver.ts";
import { createWebhookEndpoint } from "../src/endpoints.ts";
import { enqueueWebhookMessage } from "../src/outbox.ts";
import { purgeExpiredWebhookMessages } from "../src/retention.ts";
import { testManagementDeps } from "../src/testing.ts";

const { webhookAttempt, webhookDelivery, webhookMessage } = schema;

describe("purgeExpiredWebhookMessages", () => {
  for (const [operation, purgeWins] of [
    ["retry", false],
    ["retry", true],
    ["recover", false],
    ["recover", true],
  ] as const) {
    test(`serializes a manual ${operation} with retention when ${purgeWins ? "purge" : operation} wins`, async () => {
      const tenant = await createTestTenant();
      const organizationId = tenant.organization.id;
      const scope = { organizationIds: [organizationId] };
      const { endpoint } = await createWebhookEndpoint(
        {
          organizationId,
          environmentId: tenant.development.id,
          url: "https://example.com/hook",
          eventTypes: [],
          apiVersion: LATEST_API_VERSION,
          userId: tenant.owner.id,
        },
        testManagementDeps,
      );
      const messageId = newId("evt");
      await enqueueWebhookMessage(db, {
        id: messageId,
        organizationId,
        environmentId: tenant.development.id,
        type: "email.delivered",
        payload: { id: messageId, object: "event", type: "email.delivered", data: {} },
      });
      await db
        .update(webhookMessage)
        .set({
          createdAt: sql`now() - make_interval(days => ${RETENTION_DAYS.webhookDeliveries + 1})`,
        })
        .where(eq(webhookMessage.id, messageId));
      const [delivery] = await db
        .update(webhookDelivery)
        .set({ status: "failed", nextAttemptAt: null })
        .where(eq(webhookDelivery.messageId, messageId))
        .returning();
      if (!delivery) throw new Error("no delivery");

      const blocker = await pool.connect();
      let retry: Promise<boolean> | undefined;
      const requeue = () =>
        operation === "retry"
          ? retryWebhookDelivery({ organizationId, endpointId: endpoint.id, id: delivery.id })
          : recoverWebhookEndpoint({
              organizationId,
              id: endpoint.id,
              since: new Date(Date.now() - 3_600_000),
            }).then((result) => result.requeued === 1);
      try {
        await blocker.query("BEGIN");
        await blocker.query("SELECT id FROM webhook_message WHERE id = $1 FOR UPDATE", [messageId]);
        retry = requeue();
        // Wait for the real retry to block on the parent, rather than relying on a sleep to
        // guess when it has started. Holding only the parent must also stop child updates.
        let waiting = false;
        const deadline = Date.now() + 3000;
        while (!waiting && Date.now() < deadline) {
          await blocker.query("SELECT pg_stat_clear_snapshot()");
          const { rows } = await blocker.query<{ waiting: boolean }>(
            `SELECT EXISTS (
              SELECT 1 FROM pg_stat_activity
              WHERE pg_backend_pid() = ANY(pg_blocking_pids(pid))
            ) AS waiting`,
          );
          waiting = rows[0]?.waiting ?? false;
          if (!waiting) await Bun.sleep(10);
        }
        expect(waiting).toBe(true);
        // A purge must skip a locked message even though the delivery still looks finished.
        expect(await purgeExpiredWebhookMessages({ scope })).toBe(0);
        if (purgeWins) {
          // Complete the purge's parent-lock/delete protocol before allowing the retry in.
          await blocker.query("DELETE FROM webhook_message WHERE id = $1", [messageId]);
        }
        await blocker.query("COMMIT");
        expect(await retry).toBe(!purgeWins);
        expect(await purgeExpiredWebhookMessages({ scope })).toBe(0);
        const remaining = await db
          .select({ status: webhookDelivery.status })
          .from(webhookDelivery)
          .where(eq(webhookDelivery.id, delivery.id));
        expect(remaining).toEqual(purgeWins ? [] : [{ status: "pending" }]);
      } finally {
        await blocker.query("ROLLBACK");
        blocker.release();
        await retry;
      }
    });
  }

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
