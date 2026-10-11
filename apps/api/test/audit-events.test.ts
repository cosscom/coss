import { describe, expect, test } from "bun:test";
import { recordOrgAuditEvent } from "@coss/logs";
import { memoryLogWriter } from "@coss/logs/testing";
import { createTestTenant } from "@coss/tenancy/testing";
import {
  apiKeyIdForEnvironment,
  apiRequest,
  createTestApp,
  errorOf,
  setKeyPermissions,
} from "./helpers.ts";

type AuditEventBody = { object: string; id: string; action: string; actor_type: string };
type AuditListBody = { object: "list"; data: AuditEventBody[]; has_more: boolean };

async function listAudit(app: ReturnType<typeof createTestApp>["app"], key: string, query = "") {
  const res = await apiRequest(app, "GET", `/v1/audit_events${query}`, { key });
  expect(res.status).toBe(200);
  return (await res.json()) as AuditListBody;
}

describe("GET /v1/audit_events", () => {
  test("lists the organization's events newest first, from any environment's key", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const organizationId = tenant.organization.id;
    const member = { type: "user" as const, id: tenant.owner.id, label: tenant.owner.email };
    await recordOrgAuditEvent({
      organizationId,
      actor: member,
      action: "domain.created",
      target: { type: "domain", id: "dom_1", label: "a.test" },
    });
    await recordOrgAuditEvent({
      organizationId,
      actor: member,
      action: "api_key.created",
      environmentId: tenant.production.id,
    });
    await recordOrgAuditEvent({
      organizationId,
      actor: { type: "system", id: null, label: "COSS support" },
      action: "organization.suspended",
    });
    await recordOrgAuditEvent({
      organizationId: other.organization.id,
      actor: member,
      action: "domain.created",
    });
    const { app } = createTestApp();

    const all = await listAudit(app, tenant.sandboxKey);
    expect(all.object).toBe("list");
    expect(all.has_more).toBe(false);
    expect(all.data.map((event) => event.action)).toEqual([
      "organization.suspended",
      "api_key.created",
      "domain.created",
    ]);
    expect(all.data[2]).toMatchObject({
      object: "audit_event",
      actor_type: "user",
      actor_id: tenant.owner.id,
      actor_label: tenant.owner.email,
      target_type: "domain",
      target_id: "dom_1",
      target_label: "a.test",
      project_id: null,
      environment_id: null,
      metadata: {},
    });
    // The live key reads the same organization-wide log.
    expect((await listAudit(app, tenant.liveKey)).data).toEqual(all.data);

    const filtered = await listAudit(app, tenant.sandboxKey, "?action=domain.,api_key.created");
    expect(filtered.data.map((event) => event.action)).toEqual([
      "api_key.created",
      "domain.created",
    ]);
    const bySystem = await listAudit(app, tenant.sandboxKey, "?actor_type=system");
    expect(bySystem.data.map((event) => event.action)).toEqual(["organization.suspended"]);
    const byEnvironment = await listAudit(
      app,
      tenant.sandboxKey,
      `?environment_id=${tenant.production.id}`,
    );
    expect(byEnvironment.data.map((event) => event.action)).toEqual(["api_key.created"]);
    const byTarget = await listAudit(app, tenant.sandboxKey, "?target_id=dom_1");
    expect(byTarget.data).toHaveLength(1);
    const future = await listAudit(app, tenant.sandboxKey, "?from=2999-01-01T00:00:00Z");
    expect(future.data).toEqual([]);

    const first = await listAudit(app, tenant.sandboxKey, "?limit=2");
    expect(first.has_more).toBe(true);
    const rest = await listAudit(app, tenant.sandboxKey, `?after=${first.data[1]?.id}`);
    expect(rest).toMatchObject({ has_more: false, data: [all.data[2]] });
    expect((await listAudit(app, tenant.sandboxKey, "?after=nonsense")).data).toEqual([]);
  });

  test("a prefix's `_` is matched literally, not as a `LIKE` wildcard", async () => {
    const tenant = await createTestTenant();
    const actor = { type: "system" as const, id: null, label: "COSS support" };
    for (const action of ["api_key.created", "apixkey.created"]) {
      await recordOrgAuditEvent({ organizationId: tenant.organization.id, actor, action });
    }
    const { app } = createTestApp();
    const page = await listAudit(app, tenant.sandboxKey, "?action=api_key.");
    expect(page.data.map((event) => event.action)).toEqual(["api_key.created"]);
  });

  test("get returns one event of the organization only", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    await recordOrgAuditEvent({
      organizationId: tenant.organization.id,
      actor: { type: "user", id: tenant.owner.id, label: tenant.owner.email },
      action: "member.removed",
    });
    const { app } = createTestApp();
    const [event] = (await listAudit(app, tenant.sandboxKey)).data;
    if (!event) throw new Error("missing event");

    const got = await apiRequest(app, "GET", `/v1/audit_events/${event.id}`, {
      key: tenant.sandboxKey,
    });
    expect(got.status).toBe(200);
    expect(await got.json()).toEqual(event);
    for (const [key, id] of [
      [other.sandboxKey, event.id],
      [tenant.sandboxKey, "oaudit_01k7c8m4q2f3e9v6t5r1n0p8yz"],
      [tenant.sandboxKey, "nonsense"],
    ] as const) {
      const missing = await apiRequest(app, "GET", `/v1/audit_events/${id}`, { key });
      expect(missing.status).toBe(404);
      expect((await errorOf(missing)).code).toBe("not_found");
    }
  });

  test("invalid filters are 422; keys without audit:read get 403", async () => {
    const tenant = await createTestTenant();
    const { app } = createTestApp();
    for (const query of ["?limit=101", "?actor_type=robot", "?action=DOMAIN", "?from=yesterday"]) {
      const res = await apiRequest(app, "GET", `/v1/audit_events${query}`, {
        key: tenant.sandboxKey,
      });
      expect(res.status).toBe(422);
      expect((await errorOf(res)).code).toBe("validation_error");
    }

    await setKeyPermissions(await apiKeyIdForEnvironment(tenant.development.id), {
      email: ["send", "read"],
      log: ["read"],
    });
    const refused = await apiRequest(app, "GET", "/v1/audit_events", { key: tenant.sandboxKey });
    expect(refused.status).toBe(403);
  });

  test("reading the audit log is never copied into the environment log", async () => {
    const tenant = await createTestTenant();
    await recordOrgAuditEvent({
      organizationId: tenant.organization.id,
      actor: { type: "user", id: tenant.owner.id, label: tenant.owner.email },
      action: "member.removed",
    });
    const writer = memoryLogWriter();
    const { app } = createTestApp({ logWriter: writer });
    const [event] = (await listAudit(app, tenant.sandboxKey)).data;
    await apiRequest(app, "GET", `/v1/audit_events/${event?.id}`, { key: tenant.sandboxKey });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(writer.entries).toEqual([]);
  });
});
