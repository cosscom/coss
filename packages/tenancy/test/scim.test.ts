/**
 * Directory sync end to end: real SCIM requests against Better Auth's SCIM plugin with our options
 * (`@coss/auth/scim`), connections managed through `@coss/tenancy`, and SSO sign-in through the
 * local OpenID Connect provider of `sso-helpers.ts`.
 */
import { describe, expect, test } from "bun:test";
import { auth } from "@coss/auth";
import { ssoProviderIdFor } from "@coss/auth/sso";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { eq } from "drizzle-orm";
import {
  disableOrganizationScim,
  listAdminAuditEvents,
  suspendOrganization,
  unsuspendOrganization,
} from "../src/admin.ts";
import {
  connectScim,
  createScimToken,
  disconnectScim,
  getOrganizationScim,
  listScimManagedUserIds,
  revokeScimToken,
  setScimGroupRoles,
  TenancyError,
} from "../src/index.ts";
import { createTestOrganization } from "./helpers.ts";
import {
  adminActor,
  BASE_URL,
  createSsoTenant,
  memberRole,
  passwordSession,
  type SsoTenant,
  sessionOf,
  ssoSignIn,
  userByEmail,
  useSsoTestIdp,
} from "./sso-helpers.ts";

useSsoTestIdp();

const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
const PATCH_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:PatchOp";

type ScimTenant = SsoTenant & { token: string };

/** An organization with an active SSO provider and a connected directory. */
async function createScimTenant(): Promise<ScimTenant> {
  const tenant = await createSsoTenant();
  const { token } = await connectScim({
    organizationId: tenant.organization.id,
    actorId: tenant.owner.id,
    lifetimeDays: 90,
  });
  return { ...tenant, token };
}

async function scim(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await auth.handler(
    new Request(`${BASE_URL}/api/auth/scim/v2${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/scim+json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : {} };
}

async function provision(
  tenant: ScimTenant,
  email: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const res = await scim(tenant.token, "POST", "/Users", {
    schemas: [USER_SCHEMA],
    userName: email,
    externalId: `ext-${email}`,
    name: { givenName: "Dir", familyName: "User" },
    emails: [{ value: email, primary: true, type: "work" }],
    active: true,
    ...extra,
  });
  if (res.status !== 201) throw new Error(`provision failed: ${JSON.stringify(res.body)}`);
  return res.body.id as string;
}

async function setActive(tenant: ScimTenant, scimUserId: string, active: boolean) {
  return scim(tenant.token, "PATCH", `/Users/${scimUserId}`, {
    schemas: [PATCH_SCHEMA],
    Operations: [{ op: "replace", value: { active } }],
  });
}

async function userIdOf(email: string): Promise<string> {
  const row = await userByEmail(email);
  if (!row) throw new Error(`no user ${email}`);
  return row.id;
}

/** A password account on the tenant's domain (an existing user the directory will link). */
async function createDomainUser(
  tenant: SsoTenant,
  opts: { name?: string; emailVerified?: boolean } = {},
) {
  const email = `pw-${uniqueSuffix()}@${tenant.domain}`;
  const password = `pw-${uniqueSuffix()}-not-secret`;
  const { user } = await auth.api.createUser({
    body: {
      email,
      password,
      name: opts.name ?? "Kept Name",
      data: { emailVerified: opts.emailVerified ?? true },
    },
  });
  return { id: user.id, email, password };
}

async function sessionsOf(userId: string) {
  return db
    .select({ id: schema.session.id, ssoProviderId: schema.session.ssoProviderId })
    .from(schema.session)
    .where(eq(schema.session.userId, userId));
}

describe("connecting a directory", () => {
  test("needs an active SSO provider", async () => {
    const { owner, organization } = await createTestOrganization();
    const refused = connectScim({
      organizationId: organization.id,
      actorId: owner.id,
      lifetimeDays: 90,
    });
    await expect(refused).rejects.toBeInstanceOf(TenancyError);
  });

  test("concurrent connects issue only one connection and token, and disconnect permits reconnect", async () => {
    const tenant = await createSsoTenant();
    const input = {
      organizationId: tenant.organization.id,
      actorId: tenant.owner.id,
      lifetimeDays: 90 as const,
    };
    const results = await Promise.allSettled([connectScim(input), connectScim(input)]);
    const successes = results.filter((result) => result.status === "fulfilled");
    const failures = results.filter((result) => result.status === "rejected");
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.reason).toBeInstanceOf(TenancyError);
    expect(failures[0]?.reason.code).toBe("conflict");

    const connections = await db
      .select()
      .from(schema.scimManagedConnection)
      .where(eq(schema.scimManagedConnection.provisioningDomainId, input.organizationId));
    expect(connections).toHaveLength(1);
    const state = await getOrganizationScim(input);
    expect(state?.credentials).toHaveLength(1);
    const first = successes[0];
    if (!first) throw new Error("missing successful connection");
    expect(state?.connectionId).toBe(first.value.connectionId);
    expect((await scim(first.value.token, "GET", "/Users")).status).toBe(200);

    // A partially disconnected directory must still occupy the organization's slot.
    await db
      .update(schema.scimManagedConnection)
      .set({ status: "decommissioning" })
      .where(eq(schema.scimManagedConnection.connectionId, first.value.connectionId));
    await expect(connectScim(input)).rejects.toThrow("already connected");
    await db
      .update(schema.scimManagedConnection)
      .set({ status: "active" })
      .where(eq(schema.scimManagedConnection.connectionId, first.value.connectionId));

    expect(await disconnectScim(input)).toEqual({ complete: true });
    const reconnected = await connectScim(input);
    expect(reconnected.connectionId).not.toBe(first.value.connectionId);
    expect((await scim(first.value.token, "GET", "/Users")).status).toBe(401);
    expect((await scim(reconnected.token, "GET", "/Users")).status).toBe(200);
  });

  test("one connection per organization; tokens are shown once and can be revoked", async () => {
    const tenant = await createScimTenant();
    await expect(
      connectScim({
        organizationId: tenant.organization.id,
        actorId: tenant.owner.id,
        lifetimeDays: 90,
      }),
    ).rejects.toThrow("already connected");
    expect((await scim(tenant.token, "GET", "/Users")).status).toBe(200);
    expect((await scim("not-a-token", "GET", "/Users")).status).toBe(401);

    const second = await createScimToken({
      organizationId: tenant.organization.id,
      actorId: tenant.owner.id,
      lifetimeDays: 365,
    });
    const state = await getOrganizationScim({ organizationId: tenant.organization.id });
    expect(state?.credentials.map((c) => c.status)).toEqual(["active", "active"]);
    const first = state?.credentials.find((c) => c.credentialId !== second.credentialId);
    if (!first) throw new Error("first credential missing");

    await revokeScimToken({
      organizationId: tenant.organization.id,
      actorId: tenant.owner.id,
      credentialId: first.credentialId,
    });
    expect((await scim(tenant.token, "GET", "/Users")).status).toBe(401);
    expect((await scim(second.token, "GET", "/Users")).status).toBe(200);
  });

  test("a token only reaches its own organization's directory", async () => {
    const a = await createScimTenant();
    const b = await createScimTenant();
    const id = await provision(a, `iso-${uniqueSuffix()}@${a.domain}`);
    expect((await scim(b.token, "GET", `/Users/${id}`)).status).toBe(404);
  });
});

describe("provisioning users", () => {
  test("a new user becomes a verified member, without a password", async () => {
    const tenant = await createScimTenant();
    const email = `new-${uniqueSuffix()}@${tenant.domain}`;
    await provision(tenant, email);
    const user = await userByEmail(email);
    expect(user?.emailVerified).toBe(true);
    expect(await memberRole(tenant.organization.id, await userIdOf(email))).toBe("member");

    const listed = await scim(
      tenant.token,
      "GET",
      `/Users?filter=${encodeURIComponent(`userName eq "${email}"`)}`,
    );
    expect(listed.body.totalResults).toBe(1);
    expect(await listScimManagedUserIds({ organizationId: tenant.organization.id })).toContain(
      await userIdOf(email),
    );
  });

  test("addresses outside the organization's SSO domains are refused", async () => {
    const tenant = await createScimTenant();
    const other = await createSsoTenant();
    for (const email of [
      `x-${uniqueSuffix()}@example.com`,
      `x-${uniqueSuffix()}@${other.domain}`,
    ]) {
      const res = await scim(tenant.token, "POST", "/Users", {
        schemas: [USER_SCHEMA],
        userName: email,
        emails: [{ value: email, primary: true }],
      });
      expect(res.status).toBe(400);
      expect(await userByEmail(email)).toBeNull();
    }
  });

  test("an existing account is linked without changing its name or email", async () => {
    const tenant = await createScimTenant();
    const existing = await createDomainUser(tenant);
    const scimUserId = await provision(tenant, existing.email, {
      name: { givenName: "Directory", familyName: "Name" },
    });
    const user = await userByEmail(existing.email);
    expect(user?.id).toBe(existing.id);
    expect(user?.name).toBe("Kept Name");
    expect(await memberRole(tenant.organization.id, existing.id)).toBe("member");

    // A linked (preserved) account: the directory can't rename it either.
    const renamed = `renamed-${uniqueSuffix()}@${tenant.domain}`;
    await scim(tenant.token, "PATCH", `/Users/${scimUserId}`, {
      schemas: [PATCH_SCHEMA],
      Operations: [{ op: "replace", path: "userName", value: renamed }],
    });
    expect((await userByEmail(existing.email))?.id).toBe(existing.id);
  });

  test("an unverified account with the address is not linked", async () => {
    const tenant = await createScimTenant();
    const squatter = await createDomainUser(tenant, { emailVerified: false });
    const res = await scim(tenant.token, "POST", "/Users", {
      schemas: [USER_SCHEMA],
      userName: squatter.email,
      emails: [{ value: squatter.email, primary: true }],
    });
    expect(res.status).toBe(409);
    expect(await memberRole(tenant.organization.id, squatter.id)).toBeNull();
  });

  test("a managed user's address can only move within the SSO domains", async () => {
    const tenant = await createScimTenant();
    const email = `mv-${uniqueSuffix()}@${tenant.domain}`;
    const scimUserId = await provision(tenant, email);
    const outside = `mv-${uniqueSuffix()}@example.com`;
    const refused = await scim(tenant.token, "PATCH", `/Users/${scimUserId}`, {
      schemas: [PATCH_SCHEMA],
      Operations: [{ op: "replace", path: "emails", value: [{ value: outside, primary: true }] }],
    });
    expect(refused.status).toBe(400);
    expect(await userByEmail(outside)).toBeNull();

    const moved = `moved-${uniqueSuffix()}@${tenant.domain}`;
    const ok = await scim(tenant.token, "PATCH", `/Users/${scimUserId}`, {
      schemas: [PATCH_SCHEMA],
      Operations: [{ op: "replace", path: "emails", value: [{ value: moved, primary: true }] }],
    });
    expect(ok.status).toBe(200);
    expect((await userByEmail(moved))?.emailVerified).toBe(true);
  });
});

describe("group → role mappings", () => {
  test("members of a group mapped to admin become admins, and go back when unmapped", async () => {
    const tenant = await createScimTenant();
    const email = `grp-${uniqueSuffix()}@${tenant.domain}`;
    const scimUserId = await provision(tenant, email);
    const userId = await userIdOf(email);
    await setScimGroupRoles({
      organizationId: tenant.organization.id,
      mappings: [{ groupName: " COSS Admins ", role: "admin" }],
    });

    const group = await scim(tenant.token, "POST", "/Groups", {
      schemas: [GROUP_SCHEMA],
      displayName: "COSS Admins",
      members: [{ value: scimUserId }],
    });
    expect(group.status).toBe(201);
    expect(await memberRole(tenant.organization.id, userId)).toBe("admin");

    await setScimGroupRoles({ organizationId: tenant.organization.id, mappings: [] });
    expect(await memberRole(tenant.organization.id, userId)).toBe("member");

    await setScimGroupRoles({
      organizationId: tenant.organization.id,
      mappings: [{ groupName: "coss admins", role: "admin" }],
    });
    expect(await memberRole(tenant.organization.id, userId)).toBe("admin");
    await scim(tenant.token, "PATCH", `/Groups/${group.body.id as string}`, {
      schemas: [PATCH_SCHEMA],
      Operations: [{ op: "remove", path: `members[value eq "${scimUserId}"]` }],
    });
    expect(await memberRole(tenant.organization.id, userId)).toBe("member");
  });

  test("owners are never changed by the directory", async () => {
    const tenant = await createScimTenant();
    const owner = await createDomainUser(tenant);
    await db.insert(schema.member).values({
      id: `member_${uniqueSuffix()}`,
      organizationId: tenant.organization.id,
      userId: owner.id,
      role: "owner",
      createdAt: new Date(),
    });
    const scimUserId = await provision(tenant, owner.email);
    expect(await memberRole(tenant.organization.id, owner.id)).toBe("owner");
    await setActive(tenant, scimUserId, false);
    expect(await memberRole(tenant.organization.id, owner.id)).toBe("owner");
    const state = await getOrganizationScim({ organizationId: tenant.organization.id });
    expect(state?.deactivatedOwners.map((o) => o.email)).toEqual([owner.email]);
  });
});

describe("deprovisioning", () => {
  test("deactivating removes the membership and this organization's SSO sessions only", async () => {
    const tenant = await createScimTenant();
    const other = await createTestOrganization();
    const existing = await createDomainUser(tenant);
    await auth.api.addMember({
      body: { organizationId: other.organization.id, userId: existing.id, role: "member" },
    });
    const scimUserId = await provision(tenant, existing.email);
    const sso = await ssoSignIn(existing.email);
    expect(sso.location).toBe("/dashboard");
    await passwordSession(existing);
    expect((await sessionsOf(existing.id)).length).toBe(2);

    const res = await setActive(tenant, scimUserId, false);
    expect(res.status).toBe(200);
    expect(await memberRole(tenant.organization.id, existing.id)).toBeNull();
    expect(await memberRole(other.organization.id, existing.id)).toBe("member");
    const left = await sessionsOf(existing.id);
    expect(left.map((s) => s.ssoProviderId)).toEqual([null]);
    expect(await sessionOf(sso.cookies)).toBeNull();

    // Reactivating restores the membership; SSO sign-in works again.
    await setActive(tenant, scimUserId, true);
    expect(await memberRole(tenant.organization.id, existing.id)).toBe("member");
  });

  test("Entra ID's PATCH form (capitalized op, string boolean) deactivates", async () => {
    const tenant = await createScimTenant();
    const email = `entra-${uniqueSuffix()}@${tenant.domain}`;
    const scimUserId = await provision(tenant, email);
    const res = await scim(tenant.token, "PATCH", `/Users/${scimUserId}`, {
      schemas: [PATCH_SCHEMA],
      Operations: [{ op: "Replace", path: "active", value: "False" }],
    });
    expect(res.status).toBe(200);
    expect(await memberRole(tenant.organization.id, await userIdOf(email))).toBeNull();
  });

  test("deleting the user removes the membership; the account stays", async () => {
    const tenant = await createScimTenant();
    const email = `del-${uniqueSuffix()}@${tenant.domain}`;
    const scimUserId = await provision(tenant, email);
    const userId = await userIdOf(email);
    expect((await scim(tenant.token, "DELETE", `/Users/${scimUserId}`)).status).toBe(204);
    expect(await memberRole(tenant.organization.id, userId)).toBeNull();
    expect(await userByEmail(email)).not.toBeNull();
  });

  test("a suspended organization gets no new or promoted members, but removals apply", async () => {
    const tenant = await createScimTenant();
    const kept = `kept-${uniqueSuffix()}@${tenant.domain}`;
    const keptId = await provision(tenant, kept);
    const actor = await adminActor();
    await suspendOrganization({ organizationId: tenant.organization.id, reason: "test", actor });

    const email = `susp-${uniqueSuffix()}@${tenant.domain}`;
    const refused = await scim(tenant.token, "POST", "/Users", {
      schemas: [USER_SCHEMA],
      userName: email,
      emails: [{ value: email, primary: true }],
    });
    expect(refused.status).toBe(403);
    expect(await userByEmail(email)).toBeNull();

    expect((await setActive(tenant, keptId, false)).status).toBe(200);
    expect(await memberRole(tenant.organization.id, await userIdOf(kept))).toBeNull();
    expect((await setActive(tenant, keptId, true)).status).toBe(403);

    await unsuspendOrganization({ organizationId: tenant.organization.id, reason: "test", actor });
    expect((await setActive(tenant, keptId, true)).status).toBe(200);
    expect(await memberRole(tenant.organization.id, await userIdOf(kept))).toBe("member");
  });
});

describe("SSO with a connected directory", () => {
  test("only active directory users (and owners) sign in until the directory is disconnected", async () => {
    const tenant = await createScimTenant();
    const listed = `listed-${uniqueSuffix()}@${tenant.domain}`;
    await provision(tenant, listed);
    const signedIn = await ssoSignIn(listed);
    expect(signedIn.location).toBe("/dashboard");

    const outsider = `outsider-${uniqueSuffix()}@${tenant.domain}`;
    const refused = await ssoSignIn(outsider);
    expect(refused.location).toContain("error=scim_user_not_active");
    expect(await userByEmail(outsider)).toBeNull();

    expect(
      await disconnectScim({ organizationId: tenant.organization.id, actorId: tenant.owner.id }),
    ).toEqual({ complete: true });
    // Disconnecting keeps the members the directory provisioned.
    expect(await memberRole(tenant.organization.id, await userIdOf(listed))).toBe("member");
    expect(await sessionOf(signedIn.cookies)).not.toBeNull();
    expect(await getOrganizationScim({ organizationId: tenant.organization.id })).toBeNull();
    expect((await scim(tenant.token, "GET", "/Users")).status).toBe(401);
    expect((await ssoSignIn(outsider)).location).toBe("/dashboard");
    expect(ssoProviderIdFor(tenant.organization.id)).toBe(tenant.providerId);
  });
});

describe("platform admin recovery", () => {
  test("disabling SCIM disconnects the directory and is audited", async () => {
    const tenant = await createScimTenant();
    const email = `adm-${uniqueSuffix()}@${tenant.domain}`;
    await provision(tenant, email);
    const actor = await adminActor();
    expect(
      await disableOrganizationScim({
        organizationId: tenant.organization.id,
        reason: "directory deprovisioned everyone",
        actor,
      }),
    ).toEqual({ complete: true });
    expect((await scim(tenant.token, "GET", "/Users")).status).toBe(401);
    expect(await memberRole(tenant.organization.id, await userIdOf(email))).toBe("member");
    const events = await listAdminAuditEvents({ organizationId: tenant.organization.id });
    expect(events.events.map((e) => e.action)).toContain("organization.disable_scim");
    await expect(
      disableOrganizationScim({ organizationId: tenant.organization.id, reason: "again", actor }),
    ).rejects.toBeInstanceOf(TenancyError);
  });
});
