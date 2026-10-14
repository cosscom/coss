import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import type { TrackingRuleOutput, TrackingSettingsOutput } from "@coss/email/schemas";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  emailBody,
  errorOf,
  sendEmail,
  setKeyPermissions,
} from "./helpers.ts";

async function auditEvents(tenant: TestTenant) {
  const { rows } = await pool.query<{ action: string; metadata: Record<string, unknown> }>(
    "select action, metadata from org_audit_event where organization_id = $1 and actor_type = 'api_key' order by id",
    [tenant.organization.id],
  );
  return rows;
}

describe("/v1/tracking_settings", () => {
  test("starts empty, then sets, patches and removes the default and category rules", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;

    const empty = await apiRequest(app, "GET", "/v1/tracking_settings", { key });
    expect(empty.status).toBe(200);
    expect(await empty.json()).toEqual({
      object: "tracking_settings",
      default: null,
      categories: [],
    });

    // A new rule starts with the fields left out off.
    const created = await apiRequest(app, "PATCH", "/v1/tracking_settings/default", {
      key,
      body: { opens: true },
    });
    expect(created.status).toBe(200);
    const defaultRule = (await created.json()) as TrackingRuleOutput;
    expect(defaultRule).toMatchObject({
      object: "tracking_rule",
      category: null,
      opens: true,
      clicks: false,
    });
    expect(defaultRule.id).toStartWith("etr_");

    // Fields left out of an existing rule keep their value.
    const patched = await apiRequest(app, "PATCH", "/v1/tracking_settings/default", {
      key,
      body: { clicks: true },
    });
    expect(await patched.json()).toMatchObject({ id: defaultRule.id, opens: true, clicks: true });

    const marketing = await apiRequest(app, "PATCH", "/v1/tracking_settings/categories/marketing", {
      key,
      body: { opens: true, clicks: true },
    });
    expect(marketing.status).toBe(200);
    const reset = await apiRequest(
      app,
      "PATCH",
      "/v1/tracking_settings/categories/password-reset",
      { key, body: { opens: false } },
    );
    const resetRule = (await reset.json()) as TrackingRuleOutput;
    expect(resetRule).toMatchObject({ category: "password-reset", opens: false, clicks: false });

    const settings = (await (
      await apiRequest(app, "GET", "/v1/tracking_settings", { key })
    ).json()) as TrackingSettingsOutput;
    expect(settings.default).toMatchObject({ id: defaultRule.id, opens: true, clicks: true });
    expect(settings.categories.map((rule) => rule.category)).toEqual([
      "marketing",
      "password-reset",
    ]);

    const deleted = await apiRequest(
      app,
      "DELETE",
      "/v1/tracking_settings/categories/password-reset",
      { key },
    );
    expect(await deleted.json()).toEqual({
      object: "tracking_rule",
      id: resetRule.id,
      category: "password-reset",
      deleted: true,
    });
    const again = await apiRequest(
      app,
      "DELETE",
      "/v1/tracking_settings/categories/password-reset",
      { key },
    );
    expect(again.status).toBe(404);
    expect(await errorOf(again)).toMatchObject({ code: "not_found" });

    const deletedDefault = await apiRequest(app, "DELETE", "/v1/tracking_settings/default", {
      key,
    });
    expect(await deletedDefault.json()).toEqual({
      object: "tracking_rule",
      id: defaultRule.id,
      category: null,
      deleted: true,
    });
    expect((await apiRequest(app, "DELETE", "/v1/tracking_settings/default", { key })).status).toBe(
      404,
    );

    const events = await auditEvents(tenant);
    expect(events.map((event) => event.action)).toEqual([
      "tracking_rule.saved",
      "tracking_rule.saved",
      "tracking_rule.saved",
      "tracking_rule.saved",
      "tracking_rule.deleted",
      "tracking_rule.deleted",
    ]);
    expect(events[2]?.metadata).toMatchObject({
      category: "marketing",
      opens: true,
      clicks: true,
    });
  });

  test("rules decide what later sends track", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    await apiRequest(app, "PATCH", "/v1/tracking_settings/default", {
      key,
      body: { opens: true, clicks: true },
    });
    await apiRequest(app, "PATCH", "/v1/tracking_settings/categories/password-reset", {
      key,
      body: { opens: false, clicks: false },
    });

    async function trackingOf(overrides: Parameters<typeof emailBody>[0]) {
      const res = await sendEmail(app, key, emailBody({ html: "<p>Hi</p>", ...overrides }));
      expect(res.status).toBe(202);
      return ((await res.json()) as { tracking: { opens: boolean; clicks: boolean } }).tracking;
    }
    expect(await trackingOf({})).toMatchObject({ opens: true, clicks: true });
    expect(await trackingOf({ category: "password-reset" })).toMatchObject({
      opens: false,
      clicks: false,
    });
    expect(
      await trackingOf({ category: "password-reset", tracking: { clicks: true } }),
    ).toMatchObject({ opens: false, clicks: true });
  });

  test("settings are per environment", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { app } = createTestApp();
    await apiRequest(app, "PATCH", "/v1/tracking_settings/categories/news", {
      key: tenant.sandboxKey,
      body: { opens: true },
    });

    for (const key of [tenant.liveKey, other.sandboxKey]) {
      const res = await apiRequest(app, "GET", "/v1/tracking_settings", { key });
      expect(await res.json()).toEqual({
        object: "tracking_settings",
        default: null,
        categories: [],
      });
      const deleted = await apiRequest(app, "DELETE", "/v1/tracking_settings/categories/news", {
        key,
      });
      expect(deleted.status).toBe(404);
    }
  });

  test("validates the category and the body", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;

    const badCategory = await apiRequest(
      app,
      "PATCH",
      "/v1/tracking_settings/categories/has%20space",
      { key, body: { opens: true } },
    );
    expect(badCategory.status).toBe(422);
    expect(await errorOf(badCategory)).toMatchObject({
      code: "validation_error",
      param: "category",
    });

    for (const body of [{}, { opens: "yes" }, { opens: true, category: "news" }]) {
      const res = await apiRequest(app, "PATCH", "/v1/tracking_settings/default", { key, body });
      expect(res.status).toBe(422);
      expect(await errorOf(res)).toMatchObject({ code: "validation_error" });
    }
    const settings = await apiRequest(app, "GET", "/v1/tracking_settings", { key });
    expect(((await settings.json()) as TrackingSettingsOutput).default).toBeNull();
  });

  test("reads need email:read, changes email:send", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const key = tenant.sandboxKey;
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["read"],
    });

    expect((await apiRequest(app, "GET", "/v1/tracking_settings", { key })).status).toBe(200);
    for (const [method, path] of [
      ["PATCH", "/v1/tracking_settings/default"],
      ["DELETE", "/v1/tracking_settings/default"],
      ["PATCH", "/v1/tracking_settings/categories/news"],
      ["DELETE", "/v1/tracking_settings/categories/news"],
    ] as const) {
      const res = await apiRequest(app, method, path, {
        key,
        body: method === "PATCH" ? { opens: true } : undefined,
      });
      expect(res.status).toBe(403);
      expect(await errorOf(res)).toMatchObject({ code: "insufficient_permissions" });
    }

    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      suppression: ["read"],
    });
    expect((await apiRequest(app, "GET", "/v1/tracking_settings", { key })).status).toBe(403);
    expect((await apiRequest(app, "GET", "/v1/tracking_settings", { key: null })).status).toBe(401);
  });
});
