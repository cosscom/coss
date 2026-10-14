import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { requestOrganizationDeletion } from "@coss/tenancy";
import { suspendOrganization } from "@coss/tenancy/admin";
import { createTestTenant, createTestUser } from "@coss/tenancy/testing";
import { eq } from "drizzle-orm";
import { createHookApplication, deleteHookApplication } from "../src/applications.ts";
import { sendHookMessage } from "../src/messages.ts";
import {
  authenticateHookPortalSession,
  checkedPortalOrigin,
  createHookPortalSession,
  getHookPortalSettings,
  portalSessionUrl,
  purgeExpiredHookPortalSessions,
  setHookPortalSettings,
} from "../src/portal.ts";
import { purgeExpiredHookIdempotencyKeys } from "../src/retention.ts";

async function setup() {
  const tenant = await createTestTenant();
  const application = await createHookApplication({
    organizationId: tenant.organization.id,
    environmentId: tenant.development.id,
    name: "Acme",
  });
  return { tenant, application };
}

describe("portal sessions", () => {
  test("authenticate only with their token, until they expire", async () => {
    const { application } = await setup();
    const now = new Date();
    const { session, token } = await createHookPortalSession({
      application,
      expiresIn: 600,
      now,
    });
    expect(token).toStartWith("cossp_");
    expect(session.tokenHash).not.toContain(token);
    expect(portalSessionUrl("https://portal.test/", session.id, token)).toBe(
      `https://portal.test/s/${session.id}#${token}`,
    );

    const access = await authenticateHookPortalSession({ id: session.id, token, now });
    expect(access).toMatchObject({ readOnly: false });
    expect(access?.application.id).toBe(application.id);
    expect(
      await authenticateHookPortalSession({ id: session.id, token: `${token}x`, now }),
    ).toBeNull();
    expect(await authenticateHookPortalSession({ id: "hps_nope", token, now })).toBeNull();
    const later = new Date(now.getTime() + 601_000);
    expect(await authenticateHookPortalSession({ id: session.id, token, now: later })).toBeNull();
    await expect(createHookPortalSession({ application, expiresIn: 10 })).rejects.toThrow();
  });

  test("are read-only while the organization is suspended, and end with the application or organization", async () => {
    const { tenant, application } = await setup();
    const { session, token } = await createHookPortalSession({ application, readOnly: false });
    const admin = await createTestUser();
    await suspendOrganization({
      organizationId: tenant.organization.id,
      reason: "Test",
      actor: { userId: admin.id, email: admin.email },
    });
    expect(await authenticateHookPortalSession({ id: session.id, token })).toMatchObject({
      readOnly: true,
    });

    const other = await setup();
    const second = await createHookPortalSession({ application: other.application });
    await requestOrganizationDeletion({
      organizationId: other.tenant.organization.id,
      actor: { userId: other.tenant.owner.id, email: other.tenant.owner.email },
    });
    expect(
      await authenticateHookPortalSession({ id: second.session.id, token: second.token }),
    ).toBeNull();

    await deleteHookApplication({ organizationId: tenant.organization.id, id: application.id });
    expect(await authenticateHookPortalSession({ id: session.id, token })).toBeNull();
  });

  test("expired sessions are purged a day after they expire", async () => {
    const { tenant, application } = await setup();
    const { session } = await createHookPortalSession({ application, expiresIn: 60 });
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await purgeExpiredHookPortalSessions({ scope })).toBe(0);
    const later = new Date(Date.now() + 2 * 24 * 3_600_000);
    expect(await purgeExpiredHookPortalSessions({ scope, now: later })).toBe(1);
    const rows = await db
      .select()
      .from(schema.hookPortalSession)
      .where(eq(schema.hookPortalSession.id, session.id));
    expect(rows).toEqual([]);
  });
});

describe("portal settings", () => {
  test("only https origins (and localhost in sandbox) may embed the portal", async () => {
    expect(checkedPortalOrigin("https://app.example.com", "live")).toBe("https://app.example.com");
    expect(checkedPortalOrigin("https://app.example.com:8443/", "live")).toBe(
      "https://app.example.com:8443",
    );
    expect(checkedPortalOrigin("http://localhost:3000", "sandbox")).toBe("http://localhost:3000");
    for (const [origin, mode] of [
      ["http://localhost:3000", "live"],
      ["http://app.example.com", "sandbox"],
      ["https://app.example.com/path", "live"],
      ["javascript:alert(1)", "live"],
      ["not a url", "live"],
    ] as const) {
      expect(() => checkedPortalOrigin(origin, mode)).toThrow();
    }

    const { tenant } = await setup();
    const base = { organizationId: tenant.organization.id, environmentId: tenant.development.id };
    expect((await getHookPortalSettings(base)).allowedOrigins).toEqual([]);
    await setHookPortalSettings({
      ...base,
      settings: {
        allowedOrigins: ["https://app.example.com", "https://app.example.com/"],
        displayName: " Acme ",
        accentColor: "#2563EB",
        theme: "dark",
      },
    });
    expect(await getHookPortalSettings(base)).toEqual({
      allowedOrigins: ["https://app.example.com"],
      displayName: "Acme",
      accentColor: "#2563eb",
      theme: "dark",
    });
  });
});

describe("retention", () => {
  test("idempotency keys are purged after a day", async () => {
    const { tenant, application } = await setup();
    await sendHookMessage({
      application,
      eventType: "invoice.paid",
      payload: {},
      idempotencyKey: "old",
    });
    const scope = { organizationIds: [tenant.organization.id] };
    expect(await purgeExpiredHookIdempotencyKeys({ scope })).toBe(0);
    const later = new Date(Date.now() + 25 * 3_600_000);
    expect(await purgeExpiredHookIdempotencyKeys({ scope, now: later })).toBe(1);
  });
});
