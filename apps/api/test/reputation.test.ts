import { describe, expect, test } from "bun:test";
import { suspendOrganization } from "@coss/reputation";
import { ReputationObject } from "@coss/reputation/schemas";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  createTestApp,
  domainFrom,
  emailBody,
  errorOf,
  sendEmail,
  setKeyPermissions,
  type TestApp,
} from "./helpers.ts";

function getReputation(app: TestApp, key: string | null) {
  return Promise.resolve(
    app.request("/v1/reputation", {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
    }),
  );
}

describe("GET /v1/reputation", () => {
  test("is good before anything was measured, from either environment's key", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    for (const key of [tenant.liveKey, tenant.sandboxKey]) {
      const res = await getReputation(app, key);
      expect(res.status).toBe(200);
      expect(ReputationObject.parse(await res.json())).toEqual({
        object: "reputation",
        status: "good",
        reason: null,
        status_changed_at: null,
        evaluated_at: null,
        window: null,
        checks: [],
        marketing: { status: "active", reason: null, paused_at: null },
      });
    }
  });

  test("reports a suspension, and live sends are refused with account_suspended", async () => {
    const tenant = await createTestTenant();
    const { app, liveProvider, sandboxProvider, dispatch } = createTestApp();
    const from = await domainFrom(tenant.organization.id);
    await suspendOrganization({
      organizationId: tenant.organization.id,
      trigger: "complaint_rate",
      actor: { kind: "system" },
    });

    const res = await getReputation(app, tenant.liveKey);
    expect(await res.json()).toMatchObject({ status: "suspended", reason: "complaint_rate" });

    const live = await sendEmail(app, tenant.liveKey, emailBody({ from }));
    expect(live.status).toBe(403);
    expect(await errorOf(live)).toMatchObject({
      hint: expect.stringContaining("https://coss.com/docs/email/delivery.md"),
      type: "permission_error",
      code: "account_suspended",
    });
    expect(liveProvider.sent).toHaveLength(0);
    const sandbox = await sendEmail(app, tenant.sandboxKey, emailBody());
    expect(sandbox.status).toBe(202);
    await dispatch();
    expect(sandboxProvider.sent).toHaveLength(1);
  });

  test("needs a key with reputation:read", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    expect((await getReputation(app, null)).status).toBe(401);
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["send", "read"],
    });
    const res = await getReputation(app, tenant.sandboxKey);
    expect(res.status).toBe(403);
    expect(await errorOf(res)).toMatchObject({
      type: "permission_error",
      code: "insufficient_permissions",
    });
  });
});
