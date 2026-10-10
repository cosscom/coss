import { describe, expect, test } from "bun:test";
import { auth } from "@coss/auth";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { eq } from "drizzle-orm";
import {
  type AdminActor,
  getOrganizationForAdmin,
  getOrganizationSuspension,
  listAdminAuditEvents,
  listOrganizationApiKeysForAdmin,
  listOrganizationsForAdmin,
  listUserMembershipsForAdmin,
  recordAdminAction,
  revokeApiKeyAsAdmin,
  suspendOrganization,
  unsuspendOrganization,
} from "../src/admin.ts";
import {
  authenticateApiKey,
  createEnvironmentApiKey,
  getMembership,
  listOrganizationMembers,
  promoteToAdmin,
  TenancyError,
  type TenancyErrorCode,
} from "../src/index.ts";
import { addMember, createTestTenant, createTestUser } from "../src/testing.ts";

async function sessionHeaders(email: string, password: string): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

async function adminActor(): Promise<AdminActor & { password: string }> {
  const user = await createTestUser();
  await promoteToAdmin(user.email);
  return { userId: user.id, email: user.email, password: user.password };
}

async function expectTenancyError(promise: Promise<unknown>, code: TenancyErrorCode) {
  const error: TenancyError = await promise.then(
    () => {
      throw new Error("expected a TenancyError");
    },
    (e: unknown) => e as TenancyError,
  );
  expect(error).toBeInstanceOf(TenancyError);
  expect(error.code).toBe(code);
  return error;
}

describe("promoteToAdmin", () => {
  test("sets the platform admin role, matching email case-insensitively", async () => {
    const user = await createTestUser();
    expect(await promoteToAdmin(`  ${user.email.toUpperCase()} `)).toEqual({
      id: user.id,
      email: user.email,
    });
    const [row] = await db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.id, user.id));
    expect(row?.role).toBe("admin");
  });

  test("unknown email is not_found", async () => {
    await expectTenancyError(promoteToAdmin(`nobody-${uniqueSuffix()}@coss.test`), "not_found");
  });
});

describe("organization suspension", () => {
  test("suspends and lifts once each, recording both in the audit log", async () => {
    const tenant = await createTestTenant();
    const actor = await adminActor();
    const organizationId = tenant.organization.id;

    await expectTenancyError(
      suspendOrganization({ organizationId, reason: "  ", actor }),
      "invalid",
    );
    await expectTenancyError(
      suspendOrganization({ organizationId: `org_missing_${uniqueSuffix()}`, reason: "x", actor }),
      "not_found",
    );

    await suspendOrganization({ organizationId, reason: " Phishing reports ", actor });
    expect(await getOrganizationSuspension(organizationId)).toMatchObject({
      reason: "Phishing reports",
      suspendedByUserId: actor.userId,
    });
    expect((await getOrganizationForAdmin(organizationId))?.suspension).toMatchObject({
      reason: "Phishing reports",
      suspendedByEmail: actor.email,
    });
    await expectTenancyError(
      suspendOrganization({ organizationId, reason: "x", actor }),
      "conflict",
    );

    await unsuspendOrganization({ organizationId, reason: "Resolved with the customer", actor });
    expect(await getOrganizationSuspension(organizationId)).toBeNull();
    await expectTenancyError(unsuspendOrganization({ organizationId, actor }), "conflict");

    const { events } = await listAdminAuditEvents({ organizationId });
    expect(events.map((e) => [e.action, e.reason, e.actorEmail])).toEqual([
      ["organization.unsuspend", "Resolved with the customer", actor.email],
      ["organization.suspend", "Phishing reports", actor.email],
    ]);
    expect(events[0]?.metadata).toEqual({
      slug: tenant.organization.slug,
      suspensionReason: "Phishing reports",
    });
  });

  test("refuses the organization's API keys (only once proven valid) and new keys", async () => {
    const tenant = await createTestTenant();
    const actor = await adminActor();
    const organizationId = tenant.organization.id;
    await suspendOrganization({ organizationId, reason: "Abuse", actor });

    expect(await authenticateApiKey(tenant.sandboxKey, { email: ["send"] })).toEqual({
      ok: false,
      reason: "suspended",
    });
    expect(await authenticateApiKey(tenant.liveKey)).toEqual({ ok: false, reason: "suspended" });
    const tampered = `${tenant.sandboxKey.slice(0, -1)}${tenant.sandboxKey.endsWith("a") ? "b" : "a"}`;
    expect(await authenticateApiKey(tampered)).toEqual({ ok: false, reason: "invalid" });

    const error = await expectTenancyError(
      createEnvironmentApiKey({
        organizationId,
        environmentId: tenant.development.id,
        name: "New",
        userId: tenant.owner.id,
      }),
      "forbidden",
    );
    expect(error.message).toBe("This organization is suspended.");

    const membership = await getMembership({
      userId: tenant.owner.id,
      organizationSlug: tenant.organization.slug,
    });
    expect(membership?.suspended).toBe(true);

    await unsuspendOrganization({ organizationId, actor });
    expect((await authenticateApiKey(tenant.sandboxKey)).ok).toBe(true);
    expect(
      (await getMembership({ userId: tenant.owner.id, organizationSlug: tenant.organization.slug }))
        ?.suspended,
    ).toBe(false);
  });

  test.each(["owner", "admin"] as const)(
    "blocks invitation cancellation over HTTP for a suspended org's %s",
    async (role) => {
      const tenant = await createTestTenant();
      const actor = await adminActor();
      const organizationId = tenant.organization.id;
      const caller = role === "owner" ? tenant.owner : await createTestUser();
      if (role === "admin") await addMember({ organizationId, userId: caller.id, role });
      const headers = await sessionHeaders(caller.email, caller.password);
      const invitation = await auth.api.createInvitation({
        headers,
        body: { email: `invite-${uniqueSuffix()}@coss.test`, role: "member", organizationId },
      });
      const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      headers.set("origin", base);
      headers.set("content-type", "application/json");
      const cancel = () =>
        auth.handler(
          new Request(`${base}/api/auth/organization/cancel-invitation`, {
            method: "POST",
            headers,
            body: JSON.stringify({ invitationId: invitation.id }),
          }),
        );
      await suspendOrganization({ organizationId, reason: "Abuse", actor });
      const response = await cancel();
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ message: "This organization is suspended." });
      const [pending] = await db
        .select()
        .from(schema.invitation)
        .where(eq(schema.invitation.id, invitation.id));
      expect(pending?.status).toBe("pending");
      await unsuspendOrganization({ organizationId, actor });
      expect((await cancel()).status).toBe(200);
      const [canceled] = await db
        .select()
        .from(schema.invitation)
        .where(eq(schema.invitation.id, invitation.id));
      expect(canceled?.status).toBe("canceled");
    },
  );

  test("freezes invitations, accepting them and role changes in Better Auth", async () => {
    const tenant = await createTestTenant();
    const actor = await adminActor();
    const organizationId = tenant.organization.id;
    const invitee = await createTestUser();
    const colleague = await createTestUser();
    await addMember({ organizationId, userId: colleague.id, role: "member" });
    const colleagueMember = (await listOrganizationMembers({ organizationId })).find(
      (row) => row.user.id === colleague.id,
    );
    if (!colleagueMember) throw new Error("member row missing");
    const ownerHeaders = await sessionHeaders(tenant.owner.email, tenant.owner.password);
    const invitation = await auth.api.createInvitation({
      headers: ownerHeaders,
      body: { email: invitee.email, role: "member", organizationId },
    });

    await suspendOrganization({ organizationId, reason: "Abuse", actor });
    const inviteeHeaders = await sessionHeaders(invitee.email, invitee.password);
    const refused = [
      () =>
        auth.api.createInvitation({
          headers: ownerHeaders,
          body: { email: `x-${uniqueSuffix()}@coss.test`, role: "member", organizationId },
        }),
      () =>
        auth.api.acceptInvitation({
          headers: inviteeHeaders,
          body: { invitationId: invitation.id },
        }),
      () =>
        auth.api.updateMemberRole({
          headers: ownerHeaders,
          body: { memberId: colleagueMember.id, role: "admin", organizationId },
        }),
    ];
    for (const attempt of refused) {
      await expect(attempt()).rejects.toMatchObject({ message: "This organization is suspended." });
    }

    await unsuspendOrganization({ organizationId, actor });
    await auth.api.updateMemberRole({
      headers: ownerHeaders,
      body: { memberId: colleagueMember.id, role: "admin", organizationId },
    });
  });
});

describe("admin HTTP routes", () => {
  test("mutations are closed over HTTP (the dashboard's audited actions use auth.api)", async () => {
    const actor = await adminActor();
    const target = await createTestUser();
    const headers = await sessionHeaders(actor.email, actor.password);
    headers.set("content-type", "application/json");
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    headers.set("origin", base);

    for (const path of ["ban-user", "set-role", "impersonate-user", "revoke-user-sessions"]) {
      const response = await auth.handler(
        new Request(`${base}/api/auth/admin/${path}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ userId: target.id, role: "admin" }),
        }),
      );
      expect(response.status).toBe(404);
    }
    const [row] = await db
      .select({ role: schema.user.role, banned: schema.user.banned })
      .from(schema.user)
      .where(eq(schema.user.id, target.id));
    expect(row).toEqual({ role: "user", banned: false });

    // Reads stay available, and the server-side API still works.
    const list = await auth.handler(
      new Request(`${base}/api/auth/admin/list-users?limit=1`, { headers }),
    );
    expect(list.status).toBe(200);
    await auth.api.banUser({ headers, body: { userId: target.id, banReason: "test" } });
  });
});

describe("admin reads and key revocation", () => {
  test("lists organizations by search with member counts and suspension", async () => {
    const tenant = await createTestTenant();
    const actor = await adminActor();
    const extra = await createTestUser();
    await addMember({ organizationId: tenant.organization.id, userId: extra.id, role: "member" });

    const bySlug = await listOrganizationsForAdmin({ search: tenant.organization.slug });
    expect(bySlug.total).toBe(1);
    expect(bySlug.organizations[0]).toMatchObject({
      id: tenant.organization.id,
      memberCount: 2,
      suspendedAt: null,
    });
    expect((await listOrganizationsForAdmin({ search: tenant.organization.id })).total).toBe(1);
    // LIKE wildcards are literal.
    expect((await listOrganizationsForAdmin({ search: `%${uniqueSuffix()}` })).total).toBe(0);

    await suspendOrganization({ organizationId: tenant.organization.id, reason: "x", actor });
    const suspended = await listOrganizationsForAdmin({
      search: tenant.organization.slug,
      suspendedOnly: true,
    });
    expect(suspended.organizations[0]?.suspendedAt).toBeInstanceOf(Date);

    expect(await listUserMembershipsForAdmin(extra.id)).toMatchObject([
      { role: "member", organization: { id: tenant.organization.id }, suspended: true },
    ]);
  });

  test("revokes one of the organization's keys with a reason, and only its own", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const actor = await adminActor();
    const keys = await listOrganizationApiKeysForAdmin(tenant.organization.id);
    expect(keys).toHaveLength(2);
    const sandbox = keys.find((key) => key.environment.mode === "sandbox");
    if (!sandbox) throw new Error("no sandbox key");
    expect(sandbox.project.id).toBe(tenant.project.id);

    await expectTenancyError(
      revokeApiKeyAsAdmin({
        organizationId: other.organization.id,
        keyId: sandbox.id,
        reason: "Leaked",
        actor,
      }),
      "not_found",
    );
    await expectTenancyError(
      revokeApiKeyAsAdmin({
        organizationId: tenant.organization.id,
        keyId: sandbox.id,
        reason: "",
        actor,
      }),
      "invalid",
    );
    await revokeApiKeyAsAdmin({
      organizationId: tenant.organization.id,
      keyId: sandbox.id,
      reason: "Leaked on GitHub",
      actor,
    });

    expect(await authenticateApiKey(tenant.sandboxKey)).toEqual({ ok: false, reason: "invalid" });
    expect((await authenticateApiKey(tenant.liveKey)).ok).toBe(true);
    const { events } = await listAdminAuditEvents({ target: { type: "api_key", id: sandbox.id } });
    expect(events).toMatchObject([
      {
        action: "api_key.revoke",
        organizationId: tenant.organization.id,
        reason: "Leaked on GitHub",
        metadata: { name: sandbox.name, start: sandbox.start },
      },
    ]);
  });

  test("pages through audit entries newest first", async () => {
    const actor = await adminActor();
    const target = { type: "user" as const, id: `user_${uniqueSuffix()}` };
    for (const action of ["user.ban", "user.unban", "user.set_role"] as const) {
      await recordAdminAction({ actor, action, target });
    }
    const first = await listAdminAuditEvents({ target, limit: 2 });
    expect(first.events.map((e) => e.action)).toEqual(["user.set_role", "user.unban"]);
    expect(first.nextBefore).toBe(first.events[1]?.id ?? "");
    const second = await listAdminAuditEvents({
      target,
      limit: 2,
      before: first.nextBefore ?? undefined,
    });
    expect(second.events.map((e) => e.action)).toEqual(["user.ban"]);
    expect(second.nextBefore).toBeNull();
  });
});
