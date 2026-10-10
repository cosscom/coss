import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  createTestApp,
  errorOf,
  setKeyPermissions,
  type TestApp,
} from "./helpers.ts";

function call(app: TestApp, key: string, method: string, path: string, body?: unknown) {
  return Promise.resolve(
    app.request(path, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

describe("/v1/suppressions", () => {
  test("POST creates (201) and then returns the existing entry (200)", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    const created = await call(app, tenant.sandboxKey, "POST", "/v1/suppressions", {
      address: "Jane@Example.com",
    });
    expect(created.status).toBe(201);
    const body = (await created.json()) as { id: string };
    expect(body).toMatchObject({ object: "suppression", address: "jane@example.com", scope: "*" });

    const again = await call(app, tenant.sandboxKey, "POST", "/v1/suppressions", {
      address: "jane@example.com",
      scope: "*",
    });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual(body);
  });

  test("validation errors are 422 with the offending param", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    for (const [body, param] of [
      [{ address: "not-an-address" }, "address"],
      [{ address: "a@b.co", scope: "has space" }, "scope"],
      [{ address: "a@b.co", reason: "bounce" }, undefined],
    ] as const) {
      const res = await call(app, tenant.sandboxKey, "POST", "/v1/suppressions", body);
      expect(res.status).toBe(422);
      const error = await errorOf(res);
      expect(error.code).toBe("validation_error");
      if (param) expect(error.param).toBe(param);
    }
    const badLimit = await call(app, tenant.sandboxKey, "GET", "/v1/suppressions?limit=500");
    expect(badLimit.status).toBe(422);
    const noAddress = await call(app, tenant.sandboxKey, "GET", "/v1/suppressions/check");
    expect(noAddress.status).toBe(422);
  });

  test("entries are scoped to the API key's environment", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const { app } = createTestApp();
    const created = await call(app, tenant.sandboxKey, "POST", "/v1/suppressions", {
      address: "jane@example.com",
    });
    const { id } = (await created.json()) as { id: string };

    // The same project's live key and another organization's key see nothing.
    for (const key of [tenant.liveKey, other.sandboxKey]) {
      expect((await call(app, key, "GET", `/v1/suppressions/${id}`)).status).toBe(404);
      const deleted = await call(app, key, "DELETE", `/v1/suppressions/${id}`);
      expect(deleted.status).toBe(404);
      expect(await errorOf(deleted)).toMatchObject({ type: "not_found_error", code: "not_found" });
      const list = await call(app, key, "GET", "/v1/suppressions");
      expect(await list.json()).toEqual({ object: "list", data: [], has_more: false });
      const check = await call(app, key, "GET", "/v1/suppressions/check?address=jane@example.com");
      expect(await check.json()).toMatchObject({ suppressed: false, suppressions: [] });
    }

    const check = await call(
      app,
      tenant.sandboxKey,
      "GET",
      "/v1/suppressions/check?address=JANE%40example.com&category=news",
    );
    expect(await check.json()).toMatchObject({
      object: "suppression_check",
      address: "jane@example.com",
      suppressed: true,
    });
    const deleted = await call(app, tenant.sandboxKey, "DELETE", `/v1/suppressions/${id}`);
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ object: "suppression", id, deleted: true });
    expect((await call(app, tenant.sandboxKey, "GET", "/v1/suppressions/garbage")).status).toBe(
      404,
    );
  });

  test("POST /import imports valid entries and reports invalid ones", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const res = await call(app, tenant.sandboxKey, "POST", "/v1/suppressions/import", {
      suppressions: [
        { address: "jane@example.com" },
        { address: "jane@example.com", scope: "marketing" },
        { address: "nope" },
      ],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      object: "suppression_import",
      created: 2,
      existing: 0,
      invalid: [{ index: 2, address: "nope", message: expect.stringContaining("Invalid address") }],
    });

    for (const body of [
      { suppressions: [] },
      { suppressions: Array.from({ length: 1001 }, (_, i) => ({ address: `u${i}@example.com` })) },
      { suppressions: [{ address: "a@b.co", reason: "bounce" }] },
      [{ address: "a@b.co" }],
    ]) {
      const invalid = await call(app, tenant.sandboxKey, "POST", "/v1/suppressions/import", body);
      expect(invalid.status).toBe(422);
    }
  });

  test("GET /export streams the environment's list as CSV, optionally filtered", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await call(app, tenant.sandboxKey, "POST", "/v1/suppressions/import", {
      suppressions: [{ address: "a@example.com" }, { address: "b@example.com", scope: "news" }],
    });
    // Another environment's entries never appear.
    await call(app, tenant.liveKey, "POST", "/v1/suppressions", { address: "live@example.com" });

    const res = await call(app, tenant.sandboxKey, "GET", "/v1/suppressions/export");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename="suppressions-${tenant.development.id}.csv"`,
    );
    expect(res.headers.get("x-request-id")).toStartWith("req_");
    const lines = (await res.text()).trimEnd().split("\r\n");
    expect(lines[0]).toBe("address,scope,reason,created_at,email_id,id");
    // One import: the two entries share a millisecond, so their id order is arbitrary.
    expect(
      lines
        .slice(1)
        .map((line) => line.split(",").slice(0, 3))
        .sort(),
    ).toEqual([
      ["a@example.com", "*", "import"],
      ["b@example.com", "news", "import"],
    ]);

    const news = await call(app, tenant.sandboxKey, "GET", "/v1/suppressions/export?scope=news");
    expect((await news.text()).trimEnd().split("\r\n")).toHaveLength(2);
    const bad = await call(app, tenant.sandboxKey, "GET", "/v1/suppressions/export?reason=x");
    expect(bad.status).toBe(422);
  });

  test("needs the suppression permissions", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["send", "read"],
      suppression: ["read"],
    });

    expect((await call(app, tenant.sandboxKey, "GET", "/v1/suppressions")).status).toBe(200);
    const created = await call(app, tenant.sandboxKey, "POST", "/v1/suppressions", {
      address: "jane@example.com",
    });
    expect(created.status).toBe(403);
    expect(await errorOf(created)).toMatchObject({
      type: "permission_error",
      code: "insufficient_permissions",
    });
    const deleted = await call(
      app,
      tenant.sandboxKey,
      "DELETE",
      "/v1/suppressions/sup_01k7c8m4q2f3e9v6t5r1n0p8yz",
    );
    expect(deleted.status).toBe(403);
    const imported = await call(app, tenant.sandboxKey, "POST", "/v1/suppressions/import", {
      suppressions: [{ address: "jane@example.com" }],
    });
    expect(imported.status).toBe(403);
    expect((await call(app, tenant.sandboxKey, "GET", "/v1/suppressions/export")).status).toBe(200);
    const unauthenticated = await Promise.resolve(app.request("/v1/suppressions"));
    expect(unauthenticated.status).toBe(401);
  });
});
