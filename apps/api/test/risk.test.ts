import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import type { RiskAssessmentOutput, RiskListEntryOutput } from "@coss/risk/schemas";
import { TEST_IPS, testRiskDeps } from "@coss/risk/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  setKeyPermissions,
} from "./helpers.ts";

async function assess(
  app: ReturnType<typeof createTestApp>["app"],
  key: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return apiRequest(app, "POST", "/v1/risk/assessments", { key, body, headers });
}

describe("POST /v1/risk/assessments", () => {
  test("assesses with the key's environment and logs it", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const res = await assess(app, tenant.liveKey, {
      event: "signup",
      user: { email: "x@mailinator.com" },
      ip: TEST_IPS.tor,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as RiskAssessmentOutput;
    expect(body).toMatchObject({
      object: "risk_assessment",
      event: "signup",
      decision: "block",
      score: 0.85,
      reasons: [{ code: "email.disposable" }, { code: "ip.tor" }],
      user: { id: null, email: "x@mailinator.com" },
    });
    const { rows } = await pool.query(
      "select environment_id, source, type from log_entry where resource_id = $1",
      [body.id],
    );
    expect(rows).toEqual([
      { environment_id: tenant.production.id, source: "risk", type: "risk.assessment" },
    ]);
  });

  test("an Idempotency-Key replays; a reused key is refused; a bad one is a 400", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const body = { event: "login", user: { id: "u1" } };
    const first = await assess(app, tenant.sandboxKey, body, { "Idempotency-Key": "k" });
    const again = await assess(app, tenant.sandboxKey, body, { "Idempotency-Key": "k" });
    expect(again.status).toBe(201);
    expect(again.headers.get("idempotent-replayed")).toBe("true");
    expect(((await again.json()) as RiskAssessmentOutput).id).toBe(
      ((await first.json()) as RiskAssessmentOutput).id,
    );
    const reused = await assess(
      app,
      tenant.sandboxKey,
      { event: "login", user: { id: "u2" } },
      {
        "Idempotency-Key": "k",
      },
    );
    expect(reused.status).toBe(422);
    expect(await errorOf(reused)).toMatchObject({
      type: "idempotency_error",
      code: "idempotency_key_reused",
      param: "Idempotency-Key",
    });
    const bad = await assess(app, tenant.sandboxKey, body, { "Idempotency-Key": "x".repeat(257) });
    expect(bad.status).toBe(400);
    expect((await errorOf(bad)).code).toBe("invalid_idempotency_key");
  });

  test("validation: unknown events, bad IPs, custom events without a name", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    for (const [body, path] of [
      [{ event: "purchase" }, "event"],
      [{ event: "login", ip: "999.1.1.1" }, "ip"],
      [{ event: "custom" }, "event_name"],
      [{ event: "login", user: { id: "" } }, "user.id"],
      [{ event: "login", extra: 1 }, "extra"],
    ] as const) {
      const res = await assess(app, tenant.sandboxKey, body);
      expect(res.status).toBe(422);
      const error = await errorOf(res);
      expect(error.code).toBe("validation_error");
      expect(error.issues?.[0]?.path).toBe(path);
    }
  });

  test("needs the risk:assess permission; reads need risk:read", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = (await (await assess(app, tenant.sandboxKey, { event: "login" })).json()) as {
      id: string;
    };
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      risk: ["read"],
    });
    const refused = await assess(app, tenant.sandboxKey, { event: "login" });
    expect(refused.status).toBe(403);
    expect((await errorOf(refused)).type).toBe("permission_error");
    const read = await apiRequest(app, "GET", `/v1/risk/assessments/${created.id}`, {
      key: tenant.sandboxKey,
    });
    expect(read.status).toBe(200);
    const feedback = await apiRequest(app, "POST", `/v1/risk/assessments/${created.id}/feedback`, {
      key: tenant.sandboxKey,
      body: { outcome: "fraud" },
    });
    expect(feedback.status).toBe(403);
  });

  test("a store outage of the rate limiter refuses assessments (authentication denies first)", async () => {
    const tenant = await createTestTenant();
    const { createRateLimiter } = await import("@coss/ratelimit");
    const rateLimiter = createRateLimiter({
      store: {
        consume: async () => {
          throw new Error("down");
        },
        close: async () => {},
      },
      onStoreError: () => {},
    });
    const { app } = createTestApp({ rateLimiter });
    const res = await assess(app, tenant.sandboxKey, { event: "login" });
    expect(res.status).toBe(429);
  });
});

describe("assessments: read, list, feedback", () => {
  test("get and list are scoped to the key's environment; feedback resolves reviews", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp({ riskDeps: testRiskDeps() });
    const review = (await (
      await assess(app, tenant.liveKey, { event: "signup", user: { email: "x@mailinator.com" } })
    ).json()) as RiskAssessmentOutput;
    expect(review).toMatchObject({ decision: "review", review_status: "open" });
    await assess(app, tenant.liveKey, { event: "login", user: { id: "u1" } });

    const queue = await apiRequest(app, "GET", "/v1/risk/assessments?review_status=open", {
      key: tenant.liveKey,
    });
    expect(((await queue.json()) as { data: { id: string }[] }).data.map((a) => a.id)).toEqual([
      review.id,
    ]);
    const other = await apiRequest(app, "GET", `/v1/risk/assessments/${review.id}`, {
      key: tenant.sandboxKey,
    });
    expect(other.status).toBe(404);
    expect((await errorOf(other)).code).toBe("not_found");

    const feedback = await apiRequest(app, "POST", `/v1/risk/assessments/${review.id}/feedback`, {
      key: tenant.liveKey,
      body: { outcome: "abuse", note: "Spam bot" },
    });
    expect(feedback.status).toBe(200);
    expect(await feedback.json()).toMatchObject({ outcome: "abuse", review_status: "resolved" });
    const missing = await apiRequest(
      app,
      "POST",
      "/v1/risk/assessments/rsk_01k7c8m4q2f3e9v6t5r1n0p8yz/feedback",
      { key: tenant.liveKey, body: { outcome: "fraud" } },
    );
    expect(missing.status).toBe(404);
    const invalid = await apiRequest(app, "POST", `/v1/risk/assessments/${review.id}/feedback`, {
      key: tenant.liveKey,
      body: { outcome: "maybe" },
    });
    expect(invalid.status).toBe(422);
  });
});

describe("list entries", () => {
  test("create (201, then 200), list, get, delete; invalid values are 422; audited", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    const created = await apiRequest(app, "POST", "/v1/risk/list_entries", {
      key,
      body: { list: "block", type: "ip", value: "203.0.113.9/24", note: "Botnet" },
    });
    expect(created.status).toBe(201);
    const entry = (await created.json()) as RiskListEntryOutput;
    expect(entry).toMatchObject({
      object: "risk_list_entry",
      list: "block",
      type: "ip",
      value: "203.0.113.0/24",
      note: "Botnet",
      expires_at: null,
    });
    const again = await apiRequest(app, "POST", "/v1/risk/list_entries", {
      key,
      body: { list: "block", type: "ip", value: "203.0.113.0/24" },
    });
    expect(again.status).toBe(200);

    const invalid = await apiRequest(app, "POST", "/v1/risk/list_entries", {
      key,
      body: { list: "block", type: "country", value: "Germany" },
    });
    expect(invalid.status).toBe(422);
    expect(await errorOf(invalid)).toMatchObject({ code: "invalid_list_value", param: "value" });

    const list = await apiRequest(app, "GET", "/v1/risk/list_entries?list=block", { key });
    expect(((await list.json()) as { data: unknown[] }).data).toHaveLength(1);
    expect(
      (await apiRequest(app, "GET", `/v1/risk/list_entries/${entry.id}`, { key })).status,
    ).toBe(200);
    const deleted = await apiRequest(app, "DELETE", `/v1/risk/list_entries/${entry.id}`, { key });
    expect(await deleted.json()).toEqual({
      object: "risk_list_entry",
      id: entry.id,
      deleted: true,
    });
    expect(
      (await apiRequest(app, "DELETE", `/v1/risk/list_entries/${entry.id}`, { key })).status,
    ).toBe(404);

    const { rows } = await pool.query(
      "select action from org_audit_event where organization_id = $1 and action like 'risk%' order by created_at",
      [tenant.organization.id],
    );
    expect(rows.map((row) => row.action)).toEqual([
      "risk_list_entry.created",
      "risk_list_entry.deleted",
    ]);
  });

  test("an entry decides later assessments", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await apiRequest(app, "POST", "/v1/risk/list_entries", {
      key: tenant.liveKey,
      body: { list: "block", type: "user", value: "u_bad" },
    });
    const res = await assess(app, tenant.liveKey, { event: "login", user: { id: "u_bad" } });
    expect(await res.json()).toMatchObject({
      decision: "block",
      reasons: [{ code: "list.blocked", type: "user" }],
    });
  });
});

describe("DELETE /v1/risk/users/{user_id}", () => {
  test("forgets the user's personal data and is idempotent", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const created = (await (
      await assess(app, tenant.liveKey, {
        event: "signup",
        user: { id: "u 42", email: "ada@acme.io" },
        ip: TEST_IPS.residential,
      })
    ).json()) as RiskAssessmentOutput;
    for (let i = 0; i < 2; i++) {
      const res = await apiRequest(app, "DELETE", `/v1/risk/users/${encodeURIComponent("u 42")}`, {
        key: tenant.liveKey,
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ object: "risk_user", id: "u 42", deleted: true });
    }
    const read = (await (
      await apiRequest(app, "GET", `/v1/risk/assessments/${created.id}`, { key: tenant.liveKey })
    ).json()) as RiskAssessmentOutput;
    expect(read).toMatchObject({ user: { id: null, email: null }, ip: null });
  });
});
