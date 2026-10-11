import { describe, expect, test } from "bun:test";
import { pool } from "@coss/db";
import { createTestTenant, type TestTenant } from "@coss/tenancy/testing";
import { LATEST_API_VERSION } from "@coss/versioning";
import { TEST_NEXT_VERSION, testVersioning } from "@coss/versioning/testing";
import {
  apiRequest,
  createTestApp,
  emailBody,
  errorOf,
  sendEmail,
  type TestApp,
} from "./helpers.ts";

// With `testVersioning()`, handlers' output counts as TEST_NEXT_VERSION and LATEST_API_VERSION (which
// organizations are pinned to on first use) is the version before it: `email` loses `tracking`, `email_event`
// renames `recipient` to `address`, `webhook_endpoint` loses `api_version`, and `POST /v1/webhook_endpoints`
// takes `note` for `description`.
const versioned = () => createTestApp({ versioning: testVersioning() });

const at = (version: string) => ({ "Coss-Version": version });

async function sendOne(app: TestApp, tenant: TestTenant, headers: Record<string, string> = {}) {
  const res = await sendEmail(app, tenant.sandboxKey, emailBody(), headers);
  expect(res.status).toBe(202);
  return (await res.json()) as { id: string };
}

async function setPin(organizationId: string, version: string) {
  await pool.query(
    "update organization_api_version set api_version = $1 where organization_id = $2",
    [version, organizationId],
  );
}

describe("Coss-Version", () => {
  test("without the header, responses use the organization's pin and say so", async () => {
    const tenant = await createTestTenant();
    const { app } = versioned();
    const sent = await sendOne(app, tenant);

    const res = await apiRequest(app, "GET", `/v1/emails/${sent.id}`, { key: tenant.sandboxKey });
    expect(res.status).toBe(200);
    expect(res.headers.get("coss-version")).toBe(LATEST_API_VERSION);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ object: "email", id: sent.id });
    expect(body).not.toHaveProperty("tracking");
  });

  test("the header overrides the pin for one request", async () => {
    const tenant = await createTestTenant();
    const { app } = versioned();
    const sent = await sendOne(app, tenant);

    const res = await apiRequest(app, "GET", `/v1/emails/${sent.id}`, {
      key: tenant.sandboxKey,
      headers: at(TEST_NEXT_VERSION),
    });
    expect(res.headers.get("coss-version")).toBe(TEST_NEXT_VERSION);
    expect(await res.json()).toHaveProperty("tracking");
  });

  test("a pin the API doesn't know resolves to the newest version before it", async () => {
    const tenant = await createTestTenant();
    const { app } = versioned();
    const sent = await sendOne(app, tenant);
    await setPin(tenant.organization.id, "2050-06-01");

    const res = await apiRequest(app, "GET", `/v1/emails/${sent.id}`, { key: tenant.sandboxKey });
    expect(res.headers.get("coss-version")).toBe(LATEST_API_VERSION);
    expect(await res.json()).not.toHaveProperty("tracking");
  });

  test("an unknown or malformed version is a 400, before authentication", async () => {
    const tenant = await createTestTenant();
    const { app } = versioned();
    for (const [key, version] of [
      [tenant.sandboxKey, "2000-01-01"],
      [tenant.sandboxKey, "latest"],
      [null, "2026-02-30"],
    ] as const) {
      const res = await apiRequest(app, "GET", "/v1/domains", { key, headers: at(version) });
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toMatchObject({
        type: "invalid_request_error",
        code: "invalid_api_version",
        param: "Coss-Version",
      });
    }
  });

  test("idempotent replays are rendered in the replaying request's version", async () => {
    const tenant = await createTestTenant();
    const { app } = versioned();
    const key = { "Idempotency-Key": `k-${crypto.randomUUID()}` };

    const first = await sendEmail(app, tenant.sandboxKey, emailBody(), {
      ...key,
      ...at(TEST_NEXT_VERSION),
    });
    expect(await first.json()).toHaveProperty("tracking");

    const replay = await sendEmail(app, tenant.sandboxKey, emailBody(), key);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect(replay.headers.get("coss-version")).toBe(LATEST_API_VERSION);
    expect(await replay.json()).not.toHaveProperty("tracking");
  });

  test("lists render every element", async () => {
    const tenant = await createTestTenant();
    const { app, dispatch } = versioned();
    const sent = await sendOne(app, tenant);
    await dispatch();

    const res = await apiRequest(app, "GET", `/v1/emails/${sent.id}/events`, {
      key: tenant.sandboxKey,
    });
    const list = (await res.json()) as { object: string; data: Record<string, unknown>[] };
    expect(list.object).toBe("list");
    expect(list.data.length).toBeGreaterThan(0);
    for (const event of list.data) {
      expect(event.object).toBe("email_event");
      expect(event).toHaveProperty("address");
      expect(event).not.toHaveProperty("recipient");
    }
  });

  test("errors, the health check and tracking routes are never versioned", async () => {
    const tenant = await createTestTenant();
    const { app } = versioned();

    const missing = await apiRequest(app, "GET", "/v1/emails/email_01k7c8m4q2f3e9v6t5r1n0p8yz", {
      key: tenant.sandboxKey,
    });
    expect(missing.status).toBe(404);
    expect(missing.headers.get("coss-version")).toBe(LATEST_API_VERSION);
    expect(Object.keys(await errorOf(missing))).toEqual(["type", "code", "message", "request_id"]);

    // No key: nothing is known about the organization, so no version is claimed.
    const unauthenticated = await apiRequest(app, "GET", "/v1/domains");
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("coss-version")).toBeNull();

    const health = await app.request("/health", { headers: at("garbage") });
    expect(health.status).toBe(200);
    expect(health.headers.get("coss-version")).toBeNull();
    const pixel = await app.request("/t/o/unknown", { headers: at("garbage") });
    expect(pixel.status).toBe(200);
    expect(pixel.headers.get("coss-version")).toBeNull();
  });

  test("request bodies written for an older version are upgraded before validation", async () => {
    const tenant = await createTestTenant();
    const { app } = versioned();
    const body = { url: "https://example.com/hook", note: "From an old integration" };

    const old = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body,
    });
    expect(old.status).toBe(200);
    const created = (await old.json()) as Record<string, unknown>;
    expect(created).toMatchObject({
      object: "webhook_endpoint",
      description: "From an old integration",
    });
    expect(created).not.toHaveProperty("api_version");

    const current = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body,
      headers: at(TEST_NEXT_VERSION),
    });
    expect(current.status).toBe(422);
    expect(await errorOf(current)).toMatchObject({ code: "validation_error" });
  });

  test("body limits still apply when a request is upgraded", async () => {
    const tenant = await createTestTenant();
    const { app } = versioned();
    const res = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body: { url: "https://example.com/hook", note: "x".repeat(6 * 1024 * 1024) },
    });
    expect(res.status).toBe(413);
  });
});

describe("webhook endpoint versions", () => {
  test("default to the request's version; can be set and changed; must be known", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    const url = "https://example.com/hook";

    const byDefault = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body: { url },
    });
    const endpoint = (await byDefault.json()) as { id: string; api_version: string };
    expect(endpoint.api_version).toBe(LATEST_API_VERSION);

    const explicit = await apiRequest(app, "POST", "/v1/webhook_endpoints", {
      key: tenant.sandboxKey,
      body: { url, api_version: LATEST_API_VERSION },
    });
    expect(explicit.status).toBe(200);

    for (const [method, path] of [
      ["POST", "/v1/webhook_endpoints"],
      ["PATCH", `/v1/webhook_endpoints/${endpoint.id}`],
    ] as const) {
      const res = await apiRequest(app, method, path, {
        key: tenant.sandboxKey,
        body: { url, api_version: "2000-01-01" },
      });
      expect(res.status).toBe(422);
      expect((await errorOf(res)).issues?.[0]?.path).toBe("api_version");
    }

    const updated = await apiRequest(app, "PATCH", `/v1/webhook_endpoints/${endpoint.id}`, {
      key: tenant.sandboxKey,
      body: { api_version: LATEST_API_VERSION },
    });
    expect(updated.status).toBe(200);
  });
});
