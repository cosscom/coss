import { describe, expect, test } from "bun:test";
import { createTestTenant } from "@coss/tenancy/testing";
import { API_VERSIONS, LATEST_API_VERSION } from "@coss/versioning";
import { EnvironmentObject } from "../src/routes/environment.ts";
import {
  apiKeyIdForEnvironment,
  createTestApp,
  errorOf,
  setKeyPermissions,
  type TestApp,
} from "./helpers.ts";

function getEnvironment(app: TestApp, key: string | null, headers: Record<string, string> = {}) {
  return Promise.resolve(
    app.request("/v1/environment", {
      headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...headers },
    }),
  );
}

describe("GET /v1/environment", () => {
  test("describes each key's own environment, project and organization", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();

    for (const [key, environment] of [
      [tenant.sandboxKey, tenant.development],
      [tenant.liveKey, tenant.production],
    ] as const) {
      const res = await getEnvironment(app, key);
      expect(res.status).toBe(200);
      const body = EnvironmentObject.parse(await res.json());
      expect(body).toEqual({
        object: "environment",
        id: environment.id,
        name: environment.name,
        slug: environment.slug,
        mode: environment.mode,
        project: { id: tenant.project.id, name: tenant.project.name, slug: tenant.project.slug },
        organization: {
          id: tenant.organization.id,
          name: tenant.organization.name,
          slug: tenant.organization.slug,
          api_version: LATEST_API_VERSION,
        },
        api_key: {
          id: await apiKeyIdForEnvironment(environment.id),
          name: environment.mode === "live" ? "Test live key" : "Test sandbox key",
          start: expect.stringMatching(/^coss_(live|test)_/),
        },
      });
      expect(key.startsWith(body.api_key.start ?? "-")).toBe(true);
    }
  });

  test("reports the organization's pin, not the requested version", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const older = API_VERSIONS[0];
    const res = await getEnvironment(app, tenant.sandboxKey, { "Coss-Version": older });
    expect(res.status).toBe(200);
    expect(res.headers.get("coss-version")).toBe(older);
    expect((await res.json()).organization.api_version).toBe(LATEST_API_VERSION);
  });

  test("needs no permission, only a valid key", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {});
    expect((await getEnvironment(app, tenant.sandboxKey)).status).toBe(200);

    const missing = await getEnvironment(app, null);
    expect(missing.status).toBe(401);
    expect(await errorOf(missing)).toMatchObject({ code: "missing_api_key" });
    const invalid = await getEnvironment(app, `coss_test_${"x".repeat(64)}`);
    expect(invalid.status).toBe(401);
    expect(await errorOf(invalid)).toMatchObject({ code: "invalid_api_key" });
  });
});
