import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import { memoryLogWriter } from "@coss/logs/testing";
import type { RiskAssessmentOutput, RiskRuleOutput } from "@coss/risk/schemas";
import { fakeCaptcha, TEST_IPS, testRiskDeps } from "@coss/risk/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  setKeyPermissions,
} from "./helpers.ts";

describe("/v1/risk/settings", () => {
  test("get defaults, patch, and refuse bad thresholds; secrets never leave", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const { app } = createTestApp({ logWriter: writer });
    const key = tenant.liveKey;
    expect(await (await apiRequest(app, "GET", "/v1/risk/settings", { key })).json()).toMatchObject(
      {
        object: "risk_settings",
        review_threshold: 0.5,
        block_threshold: 0.85,
        captcha: null,
      },
    );
    const patched = await apiRequest(app, "PATCH", "/v1/risk/settings", {
      key,
      body: {
        block_threshold: 0.9,
        disabled_reasons: ["email.role_account"],
        captcha: { provider: "turnstile", secret: "0xTOPSECRET", required: true },
      },
    });
    expect(patched.status).toBe(200);
    const body = await patched.text();
    expect(body).not.toContain("0xTOPSECRET");
    expect(JSON.parse(body)).toMatchObject({
      block_threshold: 0.9,
      disabled_reasons: ["email.role_account"],
      captcha: { provider: "turnstile", required: true },
    });

    const bad = await apiRequest(app, "PATCH", "/v1/risk/settings", {
      key,
      body: { review_threshold: 0.95 },
    });
    expect(bad.status).toBe(422);
    expect(await errorOf(bad)).toMatchObject({
      code: "invalid_settings",
      param: "review_threshold",
    });

    // Neither the request log nor the audit log keeps the secret.
    await writer.flush();
    expect(JSON.stringify(writer.entries)).not.toContain("0xTOPSECRET");
    const { rows } = await pool.query(
      "select action, metadata from org_audit_event where organization_id = $1 and action = 'risk_settings.updated'",
      [tenant.organization.id],
    );
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain("0xTOPSECRET");
  });

  test("needs risk:update to change, risk:read to read", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      risk: ["read"],
    });
    const key = tenant.sandboxKey;
    expect((await apiRequest(app, "GET", "/v1/risk/settings", { key })).status).toBe(200);
    const refused = await apiRequest(app, "PATCH", "/v1/risk/settings", {
      key,
      body: { block_threshold: 0.9 },
    });
    expect(refused.status).toBe(403);
  });
});

describe("/v1/risk/rules", () => {
  test("CRUD, validation, and rules deciding assessments", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.liveKey;
    const created = await apiRequest(app, "POST", "/v1/risk/rules", {
      key,
      body: {
        name: "No VPN logins",
        events: ["login"],
        conditions: [{ field: "ip.vpn", operator: "is", value: true }],
        action: "block",
      },
    });
    expect(created.status).toBe(201);
    const rule = (await created.json()) as RiskRuleOutput;
    expect(rule).toMatchObject({ object: "risk_rule", enabled: true, position: 0, match: "all" });

    const invalid = await apiRequest(app, "POST", "/v1/risk/rules", {
      key,
      body: {
        name: "Bad",
        conditions: [{ field: "ip.vpn", operator: "gt", value: true }],
        action: "block",
      },
    });
    expect(invalid.status).toBe(422);
    expect((await errorOf(invalid)).issues?.[0]?.path).toBe("conditions.0.operator");

    const assessed = (await (
      await apiRequest(app, "POST", "/v1/risk/assessments", {
        key,
        body: { event: "login", user: { id: "u1" }, ip: TEST_IPS.vpn },
      })
    ).json()) as RiskAssessmentOutput;
    expect(assessed.decision).toBe("block");
    expect(assessed.reasons[0]).toMatchObject({ code: "rule.matched", rule: rule.id });

    const listed = await apiRequest(app, "GET", "/v1/risk/rules", { key });
    expect(((await listed.json()) as { data: unknown[] }).data).toHaveLength(1);
    const updated = await apiRequest(app, "PATCH", `/v1/risk/rules/${rule.id}`, {
      key,
      body: { enabled: false },
    });
    expect(await updated.json()).toMatchObject({ enabled: false });
    expect(
      (await apiRequest(app, "GET", `/v1/risk/rules/${rule.id}`, { key: tenant.sandboxKey }))
        .status,
    ).toBe(404);
    const deleted = await apiRequest(app, "DELETE", `/v1/risk/rules/${rule.id}`, { key });
    expect(await deleted.json()).toEqual({ object: "risk_rule", id: rule.id, deleted: true });
    expect((await apiRequest(app, "DELETE", `/v1/risk/rules/${rule.id}`, { key })).status).toBe(
      404,
    );
  });
});

describe("captcha on assessments", () => {
  test("verifies the token; the request log never keeps it", async () => {
    const tenant = await createTestTenant();
    const writer = memoryLogWriter();
    const verify = fakeCaptcha({ "tok-123": false });
    const { app } = createTestApp({
      logWriter: writer,
      riskDeps: testRiskDeps({ verifyCaptcha: verify }),
    });
    const key = tenant.liveKey;
    await apiRequest(app, "PATCH", "/v1/risk/settings", {
      key,
      body: { captcha: { provider: "hcaptcha", secret: "hsecret" } },
    });
    const res = await apiRequest(app, "POST", "/v1/risk/assessments", {
      key,
      body: { event: "signup", captcha: { token: "tok-123" } },
    });
    expect(await res.json()).toMatchObject({ reasons: [{ code: "captcha.failed" }] });
    await writer.flush();
    expect(JSON.stringify(writer.entries)).not.toContain("tok-123");
  });
});
