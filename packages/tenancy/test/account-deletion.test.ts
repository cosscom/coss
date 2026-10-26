import { describe, expect, test } from "bun:test";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { eq } from "drizzle-orm";
import { suspendOrganization } from "../src/admin.ts";
import {
  authenticateApiKey,
  createEnvironmentApiKey,
  deleteUserAccount,
  getOrganizationDeletion,
  planAccountDeletion,
  promoteToAdmin,
  TenancyError,
} from "../src/index.ts";
import { addMember, createTestTenant, createTestUser } from "../src/testing.ts";

async function userExists(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  return rows.length > 0;
}

describe("planAccountDeletion", () => {
  test("deletes organizations the user is alone in and leaves shared ones", async () => {
    const solo = await createTestTenant();
    const shared = await createTestTenant();
    await addMember({
      organizationId: shared.organization.id,
      userId: solo.owner.id,
      role: "admin",
    });

    const plan = await planAccountDeletion(solo.owner.id);
    expect(plan.blockers).toEqual([]);
    expect(plan.deleteOrganizations.map((org) => org.id)).toEqual([solo.organization.id]);
    expect(plan.leaveOrganizations.map((org) => org.id)).toEqual([shared.organization.id]);
  });

  test("blocks the last owner of an organization with other members", async () => {
    const tenant = await createTestTenant();
    const member = await createTestUser();
    await addMember({ organizationId: tenant.organization.id, userId: member.id, role: "member" });

    const plan = await planAccountDeletion(tenant.owner.id);
    expect(plan.blockers).toEqual([
      { kind: "sole_owner", organization: expect.objectContaining({ id: tenant.organization.id }) },
    ]);
    // The member can still leave: the owner stays.
    expect((await planAccountDeletion(member.id)).blockers).toEqual([]);
  });

  test("blocks members of suspended organizations and platform admins", async () => {
    const tenant = await createTestTenant();
    const admin = await createTestUser();
    await promoteToAdmin(admin.email);
    await suspendOrganization({
      organizationId: tenant.organization.id,
      reason: "test",
      actor: { userId: admin.id, email: admin.email },
    });

    expect((await planAccountDeletion(tenant.owner.id)).blockers).toEqual([
      {
        kind: "organization_suspended",
        organization: expect.objectContaining({ id: tenant.organization.id }),
      },
    ]);
    expect((await planAccountDeletion(admin.id)).blockers).toEqual([{ kind: "platform_admin" }]);
  });
});

describe("deleteUserAccount", () => {
  test("deletes the user, their solo organizations and their personal keys", async () => {
    const solo = await createTestTenant();
    const shared = await createTestTenant();
    await addMember({
      organizationId: shared.organization.id,
      userId: solo.owner.id,
      role: "member",
    });
    const personal = await createEnvironmentApiKey({
      organizationId: shared.organization.id,
      environmentId: shared.development.id,
      name: "personal",
      userId: solo.owner.id,
      ownerUserId: solo.owner.id,
      permissions: "full",
    });

    const result = await deleteUserAccount({ userId: solo.owner.id, email: solo.owner.email });

    expect(result.deletedOrganizations.map((org) => org.id)).toEqual([solo.organization.id]);
    expect(result.leftOrganizations.map((org) => org.id)).toEqual([shared.organization.id]);
    expect(result.revokedKeys).toEqual([
      { organizationId: shared.organization.id, id: personal.id, name: "personal" },
    ]);
    expect(await userExists(solo.owner.id)).toBe(false);
    expect((await getOrganizationDeletion(solo.organization.id))?.status).toBe("pending");
    expect(await authenticateApiKey(personal.key)).toMatchObject({ ok: false });
    // The shared organization and its own keys are untouched.
    expect(await authenticateApiKey(shared.liveKey)).toMatchObject({ ok: true });
    const members = await db
      .select({ userId: schema.member.userId })
      .from(schema.member)
      .where(eq(schema.member.organizationId, shared.organization.id));
    expect(members.map((row) => row.userId)).toEqual([shared.owner.id]);
  });

  test("hands the SSO provider the user registered to another owner", async () => {
    const tenant = await createTestTenant();
    const admin = await createTestUser();
    await addMember({ organizationId: tenant.organization.id, userId: admin.id, role: "admin" });
    const providerId = `sso_${uniqueSuffix()}`;
    await db.insert(schema.ssoProvider).values({
      id: providerId,
      issuer: "https://idp.example.test",
      userId: admin.id,
      providerId,
      organizationId: tenant.organization.id,
      domain: "example.test",
    });

    await deleteUserAccount({ userId: admin.id, email: admin.email });

    const [provider] = await db
      .select({ userId: schema.ssoProvider.userId })
      .from(schema.ssoProvider)
      .where(eq(schema.ssoProvider.id, providerId));
    expect(provider?.userId).toBe(tenant.owner.id);
  });

  test("refuses while something blocks it, changing nothing", async () => {
    const tenant = await createTestTenant();
    const member = await createTestUser();
    await addMember({ organizationId: tenant.organization.id, userId: member.id, role: "member" });

    const attempt = deleteUserAccount({ userId: tenant.owner.id, email: tenant.owner.email });
    await expect(attempt).rejects.toBeInstanceOf(TenancyError);
    expect(await userExists(tenant.owner.id)).toBe(true);
    expect(await authenticateApiKey(tenant.liveKey)).toMatchObject({ ok: true });
  });

  test("refuses banned users", async () => {
    const user = await createTestUser();
    await db.update(schema.user).set({ banned: true }).where(eq(schema.user.id, user.id));

    await expect(deleteUserAccount({ userId: user.id, email: user.email })).rejects.toThrow(
      "can't be deleted",
    );
    expect(await userExists(user.id)).toBe(true);
  });
});
