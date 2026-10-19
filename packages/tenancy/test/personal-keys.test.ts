import { describe, expect, test } from "bun:test";
import { auth } from "@coss/auth";
import { API_KEY_PERMISSIONS } from "@coss/auth/constants";
import { revokeDepartedMemberKeys } from "@coss/auth/member-keys";
import { db, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";
import {
  apiKeyHasPermissions,
  authenticateApiKey,
  createEnvironmentApiKey,
  getKeyBinding,
  keyCreationAllowed,
  listEnvironmentApiKeys,
  revokePersonalApiKey,
  setEnvironmentPersonalKeys,
  TenancyError,
} from "../src/index.ts";
import { addMember, createTestTenant, createTestUser, type TestTenant } from "../src/testing.ts";

async function expectTenancyError(promise: Promise<unknown>, code: TenancyError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(TenancyError);
  expect((error as TenancyError).code).toBe(code);
}

async function tenantWithMembers() {
  const tenant = await createTestTenant();
  const member = await createTestUser();
  const admin = await createTestUser();
  await addMember({ organizationId: tenant.organization.id, userId: member.id, role: "member" });
  await addMember({ organizationId: tenant.organization.id, userId: admin.id, role: "admin" });
  return { tenant, member, admin };
}

function personalKey(
  tenant: TestTenant,
  input: {
    environmentId?: string;
    userId: string;
    ownerUserId?: string | null;
    permissions?: "full" | Record<string, string[]>;
  },
) {
  return createEnvironmentApiKey({
    organizationId: tenant.organization.id,
    environmentId: input.environmentId ?? tenant.development.id,
    name: "personal",
    userId: input.userId,
    ownerUserId: input.ownerUserId === undefined ? input.userId : input.ownerUserId,
    permissions: input.permissions ?? "full",
  });
}

async function removeMembership(organizationId: string, userId: string) {
  await db
    .delete(schema.member)
    .where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, userId)));
}

describe("keyCreationAllowed", () => {
  const open = { personalKeys: true };
  const closed = { personalKeys: false };

  test("owners and admins create any key anywhere", () => {
    for (const role of ["owner", "admin"]) {
      for (const environment of [open, closed]) {
        expect(
          keyCreationAllowed({ role, environment, ownerUserId: null, creatorUserId: "u1" }),
        ).toBe(true);
        expect(
          keyCreationAllowed({ role, environment, ownerUserId: "u2", creatorUserId: "u1" }),
        ).toBe(true);
      }
    }
  });

  test("members create only their own personal keys, where the environment allows them", () => {
    const base = { role: "member", creatorUserId: "u1" };
    expect(keyCreationAllowed({ ...base, environment: open, ownerUserId: "u1" })).toBe(true);
    expect(keyCreationAllowed({ ...base, environment: closed, ownerUserId: "u1" })).toBe(false);
    expect(keyCreationAllowed({ ...base, environment: open, ownerUserId: null })).toBe(false);
    expect(keyCreationAllowed({ ...base, environment: open, ownerUserId: "u2" })).toBe(false);
    expect(
      keyCreationAllowed({ role: null, environment: open, ownerUserId: "u1", creatorUserId: "u1" }),
    ).toBe(false);
  });
});

describe("personal keys", () => {
  test("new projects open the sandbox environment only", async () => {
    const tenant = await createTestTenant();
    expect(tenant.development.personalKeys).toBe(true);
    expect(tenant.production.personalKeys).toBe(false);
  });

  test("members create personal keys in open environments only", async () => {
    const { tenant, member } = await tenantWithMembers();
    const created = await personalKey(tenant, { userId: member.id });
    const binding = await getKeyBinding({
      organizationId: tenant.organization.id,
      keyId: created.id,
    });
    expect(binding?.ownerUserId).toBe(member.id);

    await expectTenancyError(
      personalKey(tenant, { userId: member.id, environmentId: tenant.production.id }),
      "forbidden",
    );
    await expectTenancyError(
      personalKey(tenant, { userId: member.id, ownerUserId: null }),
      "forbidden",
    );

    await setEnvironmentPersonalKeys({
      organizationId: tenant.organization.id,
      environmentId: tenant.production.id,
      enabled: true,
    });
    const live = await personalKey(tenant, {
      userId: member.id,
      environmentId: tenant.production.id,
    });
    expect(live.key).toStartWith("coss_live_");
  });

  test("admins assign keys to members, never to outsiders", async () => {
    const { tenant, member, admin } = await tenantWithMembers();
    const outsider = await createTestUser();
    const assigned = await personalKey(tenant, {
      userId: admin.id,
      ownerUserId: member.id,
      environmentId: tenant.production.id,
    });
    const [listed] = (
      await listEnvironmentApiKeys({
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
      })
    ).filter((key) => key.id === assigned.id);
    expect(listed?.owner).toMatchObject({ id: member.id, email: member.email, role: "member" });
    expect(listed?.createdByUserId).toBe(admin.id);

    await expectTenancyError(
      personalKey(tenant, { userId: admin.id, ownerUserId: outsider.id }),
      "invalid",
    );
    // Members can't assign keys to anyone else.
    await expectTenancyError(
      personalKey(tenant, { userId: member.id, ownerUserId: admin.id }),
      "forbidden",
    );
  });

  test("organization-wide permissions follow the owner's role", async () => {
    const { tenant, member, admin } = await tenantWithMembers();
    const memberKey = await personalKey(tenant, { userId: member.id });
    const adminKey = await personalKey(tenant, { userId: admin.id });

    expect(memberKey.permissions.domain).toEqual(["read"]);
    expect(memberKey.permissions.audit).toBeUndefined();
    expect(memberKey.permissions.billing).toBeUndefined();
    expect(memberKey.permissions.email).toEqual(API_KEY_PERMISSIONS.email);
    expect(adminKey.permissions).toEqual(API_KEY_PERMISSIONS);

    expect(await apiKeyHasPermissions(memberKey.id, { email: ["send"] })).toBe(true);
    expect(await apiKeyHasPermissions(memberKey.id, { domain: ["delete"] })).toBe(false);
    expect(await apiKeyHasPermissions(adminKey.id, { domain: ["delete"] })).toBe(true);
    const refused = await authenticateApiKey(memberKey.key, { billing: ["read"] });
    expect(refused).toMatchObject({ ok: false, reason: "forbidden" });

    // Promoted: the same key gains them, as its owner did.
    await db
      .update(schema.member)
      .set({ role: "admin" })
      .where(
        and(
          eq(schema.member.organizationId, tenant.organization.id),
          eq(schema.member.userId, member.id),
        ),
      );
    expect(await apiKeyHasPermissions(memberKey.id, { domain: ["delete"] })).toBe(true);
  });

  test("restricted personal keys can't ask for what the owner's role lacks", async () => {
    const { tenant, member } = await tenantWithMembers();
    await expectTenancyError(
      personalKey(tenant, { userId: member.id, permissions: { domain: ["delete"] } }),
      "invalid",
    );
    const sending = await personalKey(tenant, {
      userId: member.id,
      permissions: { email: ["send"], domain: ["read"] },
    });
    expect(sending.permissions).toEqual({ email: ["send"], domain: ["read"] });
  });

  test("authentication carries the owner and refuses departed or banned owners", async () => {
    const { tenant, member, admin } = await tenantWithMembers();
    const memberKey = await personalKey(tenant, { userId: member.id });
    const adminKey = await personalKey(tenant, { userId: admin.id });

    const authenticated = await authenticateApiKey(memberKey.key);
    expect(authenticated.ok && authenticated.context.ownerUserId).toBe(member.id);
    const orgKey = await authenticateApiKey(tenant.sandboxKey);
    expect(orgKey.ok && orgKey.context.ownerUserId).toBeNull();

    await removeMembership(tenant.organization.id, member.id);
    expect(await authenticateApiKey(memberKey.key)).toEqual({ ok: false, reason: "invalid" });

    await db
      .update(schema.user)
      .set({ banned: true, banExpires: null })
      .where(eq(schema.user.id, admin.id));
    expect(await authenticateApiKey(adminKey.key)).toEqual({ ok: false, reason: "invalid" });
    await db
      .update(schema.user)
      .set({ banExpires: new Date(Date.now() - 1000) })
      .where(eq(schema.user.id, admin.id));
    expect((await authenticateApiKey(adminKey.key)).ok).toBe(true);
  });

  test("departed members' keys are deleted; other keys stay", async () => {
    const { tenant, member, admin } = await tenantWithMembers();
    const memberKey = await personalKey(tenant, { userId: member.id });
    const adminKey = await personalKey(tenant, { userId: admin.id });

    expect(await revokeDepartedMemberKeys(tenant.organization.id)).toBe(0);
    await removeMembership(tenant.organization.id, member.id);
    expect(await revokeDepartedMemberKeys(tenant.organization.id)).toBe(1);

    const remaining = await listEnvironmentApiKeys({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
    });
    const ids = remaining.map((key) => key.id);
    expect(ids).not.toContain(memberKey.id);
    expect(ids).toContain(adminKey.id);
    expect(ids).toHaveLength(2);
  });

  test("removing a member through Better Auth deletes their personal keys", async () => {
    const { tenant, member } = await tenantWithMembers();
    const memberKey = await personalKey(tenant, { userId: member.id });
    await auth.api.removeMember({
      body: { organizationId: tenant.organization.id, memberIdOrEmail: member.email },
      headers: await signedInHeaders(tenant.owner),
    });
    expect(
      await getKeyBinding({ organizationId: tenant.organization.id, keyId: memberKey.id }),
    ).toBeNull();
  });

  test("members revoke only their own personal keys", async () => {
    const { tenant, member, admin } = await tenantWithMembers();
    const memberKey = await personalKey(tenant, { userId: member.id });
    const adminKey = await personalKey(tenant, { userId: admin.id });
    const revoke = (apiKeyId: string) =>
      revokePersonalApiKey({
        organizationId: tenant.organization.id,
        apiKeyId,
        ownerUserId: member.id,
      });
    expect(await revoke(adminKey.id)).toBeNull();
    expect(await revoke(memberKey.id)).toMatchObject({ id: memberKey.id });
    expect(await revoke(memberKey.id)).toBeNull();
  });

  test("environments are opened and closed per organization", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    expect(
      await setEnvironmentPersonalKeys({
        organizationId: other.organization.id,
        environmentId: tenant.production.id,
        enabled: true,
      }),
    ).toBeNull();
    expect(
      await setEnvironmentPersonalKeys({
        organizationId: tenant.organization.id,
        environmentId: tenant.development.id,
        enabled: false,
      }),
    ).toEqual({ id: tenant.development.id, personalKeys: false });
  });
});

async function signedInHeaders(user: { email: string; password: string }): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({
    body: { email: user.email, password: user.password },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}
