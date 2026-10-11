import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { RETENTION_DAYS } from "@coss/retention";
import { createTestTenant } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  purgeExpiredReputationEvents,
  purgeExpiredReputationNotifications,
} from "../src/retention.ts";
import { reinstateOrganization, suspendOrganization } from "../src/transitions.ts";

const { reputationEvent, reputationNotification } = schema;
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

async function suspendedLongAgo() {
  const tenant = await createTestTenant();
  const organizationId = tenant.organization.id;
  const suspended = await suspendOrganization({
    organizationId,
    trigger: "bounce_rate",
    actor: { kind: "system" },
    now: daysAgo(RETENTION_DAYS.reputationHistory + 100),
  });
  if (!suspended) throw new Error("not suspended");
  return { tenant, organizationId, suspended, scope: { organizationIds: [organizationId] } };
}

const eventIds = async (organizationId: string) =>
  (
    await db
      .select({ id: reputationEvent.id })
      .from(reputationEvent)
      .where(eq(reputationEvent.organizationId, organizationId))
  ).map((row) => row.id);

describe("purgeExpiredReputationEvents", () => {
  test("expires policy updates without a later standing transition", async () => {
    const { organization } = await createTestTenant();
    const scope = { organizationIds: [organization.id] };
    const insertPolicy = async (age: number) => {
      const [event] = await db
        .insert(reputationEvent)
        .values({
          organizationId: organization.id,
          type: "policy_updated",
          trigger: "policy",
          actor: "admin",
          createdAt: daysAgo(age),
        })
        .returning();
      if (!event) throw new Error("no policy event");
      return event;
    };
    await insertPolicy(RETENTION_DAYS.reputationHistory + 2);
    await insertPolicy(RETENTION_DAYS.reputationHistory + 1);
    expect(await purgeExpiredReputationEvents({ scope })).toBe(2);
    expect(await eventIds(organization.id)).toEqual([]);

    const suspended = await suspendOrganization({
      organizationId: organization.id,
      trigger: "bounce_rate",
      actor: { kind: "system" },
      now: daysAgo(RETENTION_DAYS.reputationHistory + 10),
    });
    if (!suspended) throw new Error("not suspended");
    await insertPolicy(RETENTION_DAYS.reputationHistory + 1);
    const recent = await insertPolicy(0);
    expect(await purgeExpiredReputationEvents({ scope })).toBe(1);
    expect((await eventIds(organization.id)).sort()).toEqual([suspended.id, recent.id].sort());
  });

  test("keeps an organization's latest transition however old, and deletes superseded ones", async () => {
    const { tenant, organizationId, suspended, scope } = await suspendedLongAgo();
    expect(await purgeExpiredReputationEvents({ scope })).toBe(0);

    const reinstated = await reinstateOrganization({
      organizationId,
      adminUserId: tenant.owner.id,
      note: "Fixed their list.",
      now: daysAgo(RETENTION_DAYS.reputationHistory + 50),
    });
    expect(await purgeExpiredReputationEvents({ scope })).toBe(1);
    expect(await eventIds(organizationId)).toEqual([reinstated.id]);
    // The suspension's notification went with it.
    const notifications = await db
      .select()
      .from(reputationNotification)
      .where(eq(reputationNotification.reputationEventId, suspended.id));
    expect(notifications).toEqual([]);
  });
});

describe("purgeExpiredReputationNotifications", () => {
  test("deletes old settled notifications only", async () => {
    const { suspended, scope } = await suspendedLongAgo();
    const ofEvent = eq(reputationNotification.reputationEventId, suspended.id);
    expect(await purgeExpiredReputationNotifications({ scope })).toBe(0);

    await db
      .update(reputationNotification)
      .set({ status: "skipped", nextAttemptAt: null })
      .where(ofEvent);
    expect(await purgeExpiredReputationNotifications({ scope })).toBe(1);
    expect(await db.select().from(reputationNotification).where(ofEvent)).toEqual([]);
  });
});
