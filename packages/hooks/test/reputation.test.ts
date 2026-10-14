import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import {
  getReputationStanding,
  runDueReputationEvaluations,
  updateReputationPolicy,
} from "@coss/reputation";
import { createTestTenant, createTestUser } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import {
  hookFailureRateCheck,
  purgeExpiredHookDeliveryRollups,
  recordHookDeliveryOutcomes,
} from "../src/reputation.ts";

function finished(
  tenant: Awaited<ReturnType<typeof createTestTenant>>,
  live: boolean,
  succeeded: boolean,
  times: number,
) {
  return Array.from({ length: times }, () => ({
    organizationId: tenant.organization.id,
    environmentId: live ? tenant.production.id : tenant.development.id,
    endpointId: "hep_x",
    succeeded,
  }));
}

describe("hook_failure_rate", () => {
  test("counts live deliveries only, and warns but never suspends by default", async () => {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const admin = await createTestUser();
    const now = new Date();
    await recordHookDeliveryOutcomes(
      [
        ...finished(tenant, true, false, 8),
        ...finished(tenant, true, true, 2),
        // Sandbox endpoints can be anything: never counted.
        ...finished(tenant, false, false, 50),
      ],
      now,
    );
    const rows = await db
      .select()
      .from(schema.hookDeliveryRollup)
      .where(eq(schema.hookDeliveryRollup.organizationId, organizationId));
    expect(rows).toEqual([expect.objectContaining({ succeeded: 2, failed: 8 })]);

    await updateReputationPolicy({
      organizationId,
      overrides: { hookFailureRate: { minimumDeliveries: 10 } },
      adminUserId: admin.id,
    });
    await runDueReputationEvaluations(
      { scope: { organizationIds: [organizationId] }, now: new Date(now.getTime() + 1000) },
      { checks: [hookFailureRateCheck] },
    );
    const standing = await getReputationStanding(organizationId);
    expect(standing).toMatchObject({ status: "warning", reason: "hook_failure_rate" });

    // With a suspension threshold set, the same rate suspends.
    await updateReputationPolicy({
      organizationId,
      overrides: { hookFailureRate: { minimumDeliveries: 10, suspend: 0.75 } },
      adminUserId: admin.id,
    });
    await runDueReputationEvaluations(
      { scope: { organizationIds: [organizationId] }, now: new Date(now.getTime() + 2000) },
      { checks: [hookFailureRateCheck] },
    );
    expect((await getReputationStanding(organizationId))?.status).toBe("suspended");
  });

  test("hourly counts are purged after the longest reputation window", async () => {
    const tenant = await createTestTenant();
    const old = new Date(Date.now() - 40 * 24 * 3_600_000);
    await recordHookDeliveryOutcomes(finished(tenant, true, true, 1), old);
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await purgeExpiredHookDeliveryRollups({ scope })).toBe(1);
    expect(await purgeExpiredHookDeliveryRollups({ scope })).toBe(0);
  });
});
