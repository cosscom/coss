import { describe, expect, test } from "bun:test";
import { createPlanGate, createUsageGate, periodOf, placeHold } from "@coss/billing";
import { createTestContract } from "@coss/billing/testing";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { createVerifiedDomain } from "@coss/email/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { apiRequest, createTestApp, emailBody, errorOf, sendEmail } from "./helpers.ts";

describe("billing errors", () => {
  test("plan limits answer 402 billing_error", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ plans: createPlanGate() });
    const create = () =>
      apiRequest(app, "POST", "/v1/domains", {
        key: tenant.liveKey,
        body: { name: `t-${uniqueSuffix()}.coss.test` },
      });
    expect((await create()).status).toBe(200);
    const refused = await create();
    expect(refused.status).toBe(402);
    expect(await errorOf(refused)).toMatchObject({
      type: "billing_error",
      code: "plan_limit_reached",
      message: expect.stringContaining("1 domains"),
    });
  });

  test("the audit log needs a plan that includes it", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ plans: createPlanGate() });
    const free = await apiRequest(app, "GET", "/v1/audit_events", { key: tenant.liveKey });
    expect(free.status).toBe(402);
    expect((await errorOf(free)).code).toBe("plan_feature_unavailable");
    await createTestContract(
      tenant.organization.id,
      { version: 1, plan: "pro" },
      { effectiveFrom: new Date("2026-01-01T00:00:00Z") },
    );
    expect((await apiRequest(app, "GET", "/v1/audit_events", { key: tenant.liveKey })).status).toBe(
      200,
    );
  });

  test("a billing hold refuses live sends; Free's allowance caps them", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ plans: createPlanGate(), billing: createUsageGate() });
    const domain = await createVerifiedDomain(tenant.organization.id);
    const from = `hello@${domain.name}`;

    await db.insert(schema.billingQuota).values({
      organizationId: tenant.organization.id,
      meter: "email.recipients",
      periodStart: periodOf(new Date()).start,
      reserved: 3_000,
    });
    const capped = await sendEmail(app, tenant.liveKey, emailBody({ from }));
    expect(capped.status).toBe(402);
    expect(await errorOf(capped)).toMatchObject({
      type: "billing_error",
      code: "usage_limit_exceeded",
    });
    // Sandbox sends aren't capped.
    expect((await sendEmail(app, tenant.sandboxKey, emailBody())).status).toBe(202);

    await placeHold(db, tenant.organization.id, "delinquent", null);
    const held = await sendEmail(app, tenant.liveKey, emailBody({ from }));
    expect(held.status).toBe(402);
    expect(await errorOf(held)).toMatchObject({ type: "billing_error", code: "billing_hold" });
  });
});
