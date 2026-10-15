import { describe, expect, test } from "bun:test";
import { db } from "@coss/db";
import { listPushNotifications } from "@coss/push";
import { createTestTenant } from "@coss/tenancy/testing";
import { enqueueBillingNotification } from "../src/notifications.ts";

describe("billing notifications", () => {
  test("payment failures and holds are pushed to the iOS app once per dedupe key", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    for (let i = 0; i < 2; i++) {
      await enqueueBillingNotification(db, {
        organizationId,
        kind: "spend_limit_reached",
        dedupeKey: `spend:${organizationId}:test`,
        payload: { limit: "$10.00" },
      });
    }
    await enqueueBillingNotification(db, {
      organizationId,
      kind: "usage_threshold",
      dedupeKey: `usage:${organizationId}:test`,
      payload: {},
    });
    const pushes = await listPushNotifications(organizationId);
    expect(pushes.map((row) => [row.kind, row.subjectId])).toEqual([
      ["billing_hold_placed", "spend_limit"],
    ]);
  });
});
