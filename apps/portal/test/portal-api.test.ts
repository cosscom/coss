import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { createHookApplication, createHookPortalSession, setHookPortalSettings } from "@coss/hooks";
import { testHookDeps } from "@coss/hooks/testing";
import { memoryLimiter } from "@coss/ratelimit/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import { and, eq } from "drizzle-orm";
import { handlePortalRequest, type PortalApiDeps } from "../src/lib/portal-api.ts";
import { contentSecurityPolicy } from "../src/lib/security-headers.ts";

async function setup(opts: { readOnly?: boolean } = {}) {
  const tenant = await createTestTenant();
  const application = await createHookApplication({
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    name: "Acme",
    uid: "customer_1",
  });
  const { session, token } = await createHookPortalSession({
    application,
    readOnly: opts.readOnly,
    apiKeyId: "key_test",
  });
  const deps: PortalApiDeps = { hooks: testHookDeps, limiter: memoryLimiter(), clientIp: null };
  const call = (
    method: string,
    path: string[] = [],
    init: { body?: unknown; token?: string; sessionId?: string } = {},
  ) =>
    handlePortalRequest(
      new Request(`http://portal.test/api/sessions/${session.id}/${path.join("/")}`, {
        method,
        headers: {
          authorization: `Bearer ${init.token ?? token}`,
          ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      }),
      init.sessionId ?? session.id,
      path,
      deps,
    );
  return { tenant, application, session, token, call, deps };
}

describe("portal API", () => {
  test("answers every bad session or token the same way", async () => {
    const { call, token } = await setup();
    for (const response of [
      await call("GET", [], { token: `${token}x` }),
      await call("GET", [], { token: "nope" }),
      await call("GET", [], { sessionId: "hps_01m4xppzm8fp2b8nf8asd2zr0q" }),
    ]) {
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: { code: "not_found", message: "This portal link is invalid or has expired." },
      });
    }
  });

  test("manages the application's endpoints and records who did it", async () => {
    const { tenant, application, call } = await setup();
    const overview = await (await call("GET")).json();
    expect(overview).toMatchObject({
      application: { id: application.id, uid: "customer_1", name: "Acme" },
      read_only: false,
      endpoints: [],
    });

    const created = await call("POST", ["endpoints"], {
      body: { url: "https://example.com/hook" },
    });
    expect(created.status).toBe(200);
    const endpoint = await created.json();
    expect(endpoint.secret).toStartWith("whsec_");

    const secret = await (await call("GET", ["endpoints", endpoint.id, "secret"])).json();
    expect(secret.secret).toBe(endpoint.secret);
    const disabled = await call("PATCH", ["endpoints", endpoint.id], { body: { enabled: false } });
    expect(await disabled.json()).toMatchObject({ enabled: false, disabled_reason: "manual" });
    const invalid = await call("POST", ["endpoints"], { body: { url: "ftp://nope" } });
    expect(invalid.status).toBe(422);

    const [audit] = await db
      .select()
      .from(schema.orgAuditEvent)
      .where(
        and(
          eq(schema.orgAuditEvent.organizationId, tenant.organization.id),
          eq(schema.orgAuditEvent.action, "hook_endpoint.created"),
        ),
      );
    expect(audit).toMatchObject({
      actorType: "api_key",
      actorId: "key_test",
      actorLabel: "Portal · application customer_1",
    });
  });

  test("a read-only session changes nothing, and other applications' endpoints are not found", async () => {
    const { call } = await setup({ readOnly: true });
    const refused = await call("POST", ["endpoints"], { body: { url: "https://example.com/x" } });
    expect(refused.status).toBe(403);
    const other = await setup();
    const created = await (
      await other.call("POST", ["endpoints"], { body: { url: "https://example.com/y" } })
    ).json();
    expect((await call("GET", ["endpoints", created.id])).status).toBe(404);
  });

  test("each session is rate limited before its token is checked", async () => {
    const { call, token } = await setup();
    let last = 0;
    for (let i = 0; i < 70; i++) last = (await call("GET", [], { token: `${token}x` })).status;
    expect(last).toBe(429);
  });
});

describe("security headers", () => {
  test("frame-ancestors lists the allowed origins, else none", async () => {
    expect(contentSecurityPolicy({ dev: false, frameAncestors: [] })).toContain(
      "frame-ancestors 'none'",
    );
    expect(
      contentSecurityPolicy({ dev: false, frameAncestors: ["https://app.example.com"] }),
    ).toContain("frame-ancestors https://app.example.com;");
    // The settings it reads are validated origins.
    const tenant = await createTestTenant();
    await expect(
      setHookPortalSettings({
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
        settings: {
          allowedOrigins: ["https://a.example.com'; script-src *"],
          displayName: null,
          accentColor: null,
          theme: "system",
        },
      }),
    ).rejects.toThrow();
  });
});
