import { describe, expect, test } from "bun:test";
import { auth } from "@coss/auth";
import { db, pool, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { uniqueSuffix } from "@coss/db/testing";
import { eq } from "drizzle-orm";
import {
  authenticateApiKey,
  getOrganizationMember,
  listOrganizationMembers,
} from "../src/index.ts";
import { addMember, createTestTenant, createTestUser, type TestUser } from "../src/testing.ts";

/** Signs the owner in and returns request headers carrying the session cookie. */
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

describe("authenticateApiKey", () => {
  test("an internal failure inside Better Auth's verify is thrown (503), not reported as invalid", async () => {
    const tenant = await createTestTenant();
    const original = pool.query.bind(pool);
    // Fail only Better Auth's usage-tracking UPDATE; the initial lookup still succeeds.
    pool.query = ((text: unknown, ...rest: unknown[]) => {
      const sql = typeof text === "string" ? text : (text as { text?: string })?.text;
      if (sql?.startsWith('update "apikey"')) return Promise.reject(new Error("simulated outage"));
      return (original as (...args: unknown[]) => unknown)(text, ...rest);
    }) as typeof pool.query;
    try {
      await expect(authenticateApiKey(tenant.sandboxKey)).rejects.toThrow();
    } finally {
      pool.query = original;
    }
    expect((await authenticateApiKey(tenant.sandboxKey)).ok).toBe(true);
  });
});

describe("organization role hooks", () => {
  test("invitations only accept canonical invitable roles", async () => {
    const tenant = await createTestTenant();
    const headers = await sessionHeaders(tenant.owner.email, tenant.owner.password);
    const invite = (role: string) =>
      auth.api.createInvitation({
        headers,
        body: {
          email: `invitee+${uniqueSuffix()}@coss.test`,
          role: role as "member",
          organizationId: tenant.organization.id,
        },
      });

    for (const role of [" owner", "owner", "admin ", "superuser"]) {
      await expect(invite(role)).rejects.toThrow();
    }
    expect((await invite("admin"))?.role).toBe("admin");
    expect((await invite("member"))?.role).toBe("member");
  });
});

describe("canceling invitations", () => {
  async function invitationStatus(id: string) {
    const [row] = await db
      .select({ status: schema.invitation.status })
      .from(schema.invitation)
      .where(eq(schema.invitation.id, id));
    return row?.status;
  }

  test("only pending invitations can be canceled", async () => {
    const tenant = await createTestTenant();
    const headers = await sessionHeaders(tenant.owner.email, tenant.owner.password);
    const invitation = await auth.api.createInvitation({
      headers,
      body: {
        email: `invitee+${uniqueSuffix()}@coss.test`,
        role: "member",
        organizationId: tenant.organization.id,
      },
    });
    if (!invitation) throw new Error("invitation was not created");

    await auth.api.cancelInvitation({ headers, body: { invitationId: invitation.id } });
    expect(await invitationStatus(invitation.id)).toBe("canceled");
    await expect(
      auth.api.cancelInvitation({ headers, body: { invitationId: invitation.id } }),
    ).rejects.toThrow("no longer pending");

    const accepted = {
      id: newId("invite"),
      organizationId: tenant.organization.id,
      email: `invitee-${uniqueSuffix()}@coss.test`,
      role: "member",
      status: "accepted",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      inviterId: tenant.owner.id,
    };
    await db.insert(schema.invitation).values(accepted);
    await expect(
      auth.api.cancelInvitation({ headers, body: { invitationId: accepted.id } }),
    ).rejects.toThrow("no longer pending");
    expect(await invitationStatus(accepted.id)).toBe("accepted");
  });

  test("members cannot cancel invitations", async () => {
    const tenant = await createTestTenant();
    const owner = await sessionHeaders(tenant.owner.email, tenant.owner.password);
    const member = await createTestUser();
    await addMember({ organizationId: tenant.organization.id, userId: member.id, role: "member" });
    const invitation = await auth.api.createInvitation({
      headers: owner,
      body: {
        email: `invitee+${uniqueSuffix()}@coss.test`,
        role: "member",
        organizationId: tenant.organization.id,
      },
    });
    if (!invitation) throw new Error("invitation was not created");

    await expect(
      auth.api.cancelInvitation({
        headers: await sessionHeaders(member.email, member.password),
        body: { invitationId: invitation.id },
      }),
    ).rejects.toThrow();
    expect(await invitationStatus(invitation.id)).toBe("pending");
  });
});

describe("changing member roles", () => {
  /** A tenant whose owner, admin and member each have a member row and a signed-in session. */
  async function roleFixture() {
    const tenant = await createTestTenant();
    const organizationId = tenant.organization.id;
    const admin = await createTestUser();
    const member = await createTestUser();
    await addMember({ organizationId, userId: admin.id, role: "admin" });
    await addMember({ organizationId, userId: member.id, role: "member" });
    const rows = await listOrganizationMembers({ organizationId });
    const memberId = (user: TestUser) => {
      const row = rows.find((r) => r.user.id === user.id);
      if (!row) throw new Error("member row missing");
      return row.id;
    };
    const as = async (user: TestUser) => {
      const headers = await sessionHeaders(user.email, user.password);
      return (target: TestUser, role: string) =>
        auth.api.updateMemberRole({
          headers,
          body: { memberId: memberId(target), role, organizationId },
        });
    };
    const roleOf = async (user: TestUser) =>
      (await getOrganizationMember({ organizationId, memberId: memberId(user) }))?.role;
    return { owner: tenant.owner, admin, member, as, roleOf };
  }

  test("admins can switch non-owners between member and admin, but not touch owners", async () => {
    const { owner, admin, member, as, roleOf } = await roleFixture();
    const asAdmin = await as(admin);

    await asAdmin(member, "admin");
    expect(await roleOf(member)).toBe("admin");
    await asAdmin(member, "member");
    expect(await roleOf(member)).toBe("member");

    await expect(asAdmin(member, "owner")).rejects.toThrow();
    await expect(asAdmin(owner, "member")).rejects.toThrow();
    await expect(asAdmin(member, "superuser")).rejects.toThrow();
    expect(await roleOf(member)).toBe("member");
    expect(await roleOf(owner)).toBe("owner");
  });

  test("members cannot change roles", async () => {
    const { admin, member, as, roleOf } = await roleFixture();
    await expect((await as(member))(admin, "member")).rejects.toThrow();
    await expect((await as(member))(member, "admin")).rejects.toThrow();
    expect(await roleOf(admin)).toBe("admin");
    expect(await roleOf(member)).toBe("member");
  });

  test("owners can grant owner, and the last owner cannot step down", async () => {
    const { owner, admin, as, roleOf } = await roleFixture();
    const asOwner = await as(owner);

    await expect(asOwner(owner, "admin")).rejects.toThrow();
    expect(await roleOf(owner)).toBe("owner");

    await asOwner(admin, "owner");
    expect(await roleOf(admin)).toBe("owner");
    await asOwner(owner, "admin");
    expect(await roleOf(owner)).toBe("admin");
  });
});
