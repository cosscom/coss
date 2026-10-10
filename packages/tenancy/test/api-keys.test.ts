import { describe, expect, test } from "bun:test";
import { defaultKeyHasher } from "@better-auth/api-key";
import { auth } from "@coss/auth";
import {
  API_KEY_PERMISSIONS,
  API_KEY_PREFIX,
  API_KEY_VISIBLE_CHARACTERS,
} from "@coss/auth/constants";
import { db, schema } from "@coss/db";
import { newId } from "@coss/db/id";
import { eq } from "drizzle-orm";
import {
  authenticateApiKey,
  createEnvironmentApiKey,
  getKeyBinding,
  listEnvironmentApiKeys,
  TenancyError,
} from "../src/index.ts";
import { addMember, createTestTenant, createTestUser } from "../src/testing.ts";

const KEY_FORMAT = /^coss_(live|test)_[A-Za-z]{64}$/;

async function keyIdOf(rawKey: string): Promise<string> {
  const [row] = await db
    .select({ id: schema.apikey.id })
    .from(schema.apikey)
    .where(eq(schema.apikey.key, await defaultKeyHasher(rawKey)));
  if (!row) throw new Error("key not found");
  return row.id;
}

/** A key minted straight through Better Auth, i.e. without an environment binding. */
async function createUnboundKey(organizationId: string, userId: string, prefix: string) {
  return auth.api.createApiKey({ body: { organizationId, userId, name: "unbound", prefix } });
}

async function expectTenancyError(promise: Promise<unknown>, code: TenancyError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(TenancyError);
  expect((error as TenancyError).code).toBe(code);
}

describe("createEnvironmentApiKey", () => {
  test("prefixes keys by environment mode", async () => {
    const tenant = await createTestTenant();
    expect(tenant.liveKey).toMatch(KEY_FORMAT);
    expect(tenant.liveKey).toStartWith(API_KEY_PREFIX.live);
    expect(tenant.sandboxKey).toMatch(KEY_FORMAT);
    expect(tenant.sandboxKey).toStartWith(API_KEY_PREFIX.sandbox);

    const created = await createEnvironmentApiKey({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      name: "  CI  ",
      userId: tenant.owner.id,
    });
    expect(created.id).toStartWith("key_");
    expect(created.name).toBe("CI");
    expect(created.start).toBe(created.key.slice(0, API_KEY_VISIBLE_CHARACTERS));
    expect(
      await getKeyBinding({ organizationId: tenant.organization.id, keyId: created.id }),
    ).toEqual({
      apiKeyId: created.id,
      environmentId: tenant.development.id,
      projectId: tenant.project.id,
    });
  });

  test("environment of another organization is not_found", async () => {
    const a = await createTestTenant();
    const b = await createTestTenant();
    await expectTenancyError(
      createEnvironmentApiKey({
        organizationId: a.organization.id,
        environmentId: b.production.id,
        name: "steal",
        userId: a.owner.id,
      }),
      "not_found",
    );
  });

  test("validates the name", async () => {
    const tenant = await createTestTenant();
    for (const name of ["x".repeat(33), "   "]) {
      await expectTenancyError(
        createEnvironmentApiKey({
          organizationId: tenant.organization.id,
          environmentId: tenant.development.id,
          name,
          userId: tenant.owner.id,
        }),
        "invalid",
      );
    }
  });

  test("members and outsiders are forbidden; admins are allowed", async () => {
    const tenant = await createTestTenant();
    const member = await createTestUser();
    const admin = await createTestUser();
    const outsider = await createTestUser();
    await addMember({ organizationId: tenant.organization.id, userId: member.id, role: "member" });
    await addMember({ organizationId: tenant.organization.id, userId: admin.id, role: "admin" });

    const create = (userId: string) =>
      createEnvironmentApiKey({
        organizationId: tenant.organization.id,
        environmentId: tenant.production.id,
        name: "role check",
        userId,
      });

    await expectTenancyError(create(member.id), "forbidden");
    await expectTenancyError(create(outsider.id), "forbidden");
    const created = await create(admin.id);
    expect(created.key).toStartWith(API_KEY_PREFIX.live);
  });
});

describe("authenticateApiKey", () => {
  test("accepts both keys with their environment context", async () => {
    const tenant = await createTestTenant();

    expect(await authenticateApiKey(tenant.liveKey)).toEqual({
      ok: true,
      context: {
        apiKeyId: await keyIdOf(tenant.liveKey),
        organizationId: tenant.organization.id,
        projectId: tenant.project.id,
        environmentId: tenant.production.id,
        mode: "live",
      },
    });
    expect(await authenticateApiKey(tenant.sandboxKey)).toEqual({
      ok: true,
      context: {
        apiKeyId: await keyIdOf(tenant.sandboxKey),
        organizationId: tenant.organization.id,
        projectId: tenant.project.id,
        environmentId: tenant.development.id,
        mode: "sandbox",
      },
    });
  });

  test("rejects malformed and unknown keys", async () => {
    const tenant = await createTestTenant();
    const malformed = [
      null,
      undefined,
      "",
      "garbage",
      `Bearer ${tenant.sandboxKey}`,
      tenant.sandboxKey.slice(0, -1),
      `${tenant.sandboxKey}a`,
      `coss_prod_${"a".repeat(64)}`,
      `coss_test_${"a".repeat(63)}1`,
    ];
    for (const key of malformed) {
      expect(await authenticateApiKey(key)).toEqual({ ok: false, reason: "invalid" });
    }
    // Well-formed but never issued.
    expect(await authenticateApiKey(`coss_test_${"A".repeat(64)}`)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  test("rejects deleted and disabled keys", async () => {
    const tenant = await createTestTenant();
    expect((await authenticateApiKey(tenant.liveKey)).ok).toBe(true);
    expect((await authenticateApiKey(tenant.sandboxKey)).ok).toBe(true);

    await db.delete(schema.apikey).where(eq(schema.apikey.id, await keyIdOf(tenant.liveKey)));
    expect(await authenticateApiKey(tenant.liveKey)).toEqual({ ok: false, reason: "invalid" });

    await db
      .update(schema.apikey)
      .set({ enabled: false })
      .where(eq(schema.apikey.id, await keyIdOf(tenant.sandboxKey)));
    expect(await authenticateApiKey(tenant.sandboxKey)).toEqual({ ok: false, reason: "invalid" });
  });

  test("rejects expired keys (enforced by Better Auth)", async () => {
    const tenant = await createTestTenant();
    const keyId = await keyIdOf(tenant.sandboxKey);
    await db
      .update(schema.apikey)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.apikey.id, keyId));
    expect(await authenticateApiKey(tenant.sandboxKey)).toEqual({ ok: false, reason: "invalid" });
  });

  test("records usage through Better Auth", async () => {
    const tenant = await createTestTenant();
    expect((await authenticateApiKey(tenant.sandboxKey)).ok).toBe(true);
    const [summary] = await listEnvironmentApiKeys({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
    });
    expect(summary?.lastRequest).toBeInstanceOf(Date);
  });

  test("rejects keys without an environment binding", async () => {
    const tenant = await createTestTenant();
    const unbound = await createUnboundKey(
      tenant.organization.id,
      tenant.owner.id,
      API_KEY_PREFIX.sandbox,
    );
    expect(unbound.key).toMatch(KEY_FORMAT);
    expect(await authenticateApiKey(unbound.key)).toEqual({ ok: false, reason: "invalid" });
  });

  test("rejects a key bound to an environment whose mode does not match its prefix", async () => {
    const tenant = await createTestTenant();
    const sandboxPrefixed = await createUnboundKey(
      tenant.organization.id,
      tenant.owner.id,
      API_KEY_PREFIX.sandbox,
    );
    await db
      .insert(schema.environmentApiKey)
      .values({ apiKeyId: sandboxPrefixed.id, environmentId: tenant.production.id });
    expect(await authenticateApiKey(sandboxPrefixed.key)).toEqual({ ok: false, reason: "invalid" });
  });

  test("rejects a key bound to another organization's environment", async () => {
    const a = await createTestTenant();
    const b = await createTestTenant();
    const key = await createUnboundKey(a.organization.id, a.owner.id, API_KEY_PREFIX.sandbox);
    await db
      .insert(schema.environmentApiKey)
      .values({ apiKeyId: key.id, environmentId: b.development.id });
    expect(await authenticateApiKey(key.key)).toEqual({ ok: false, reason: "invalid" });
  });

  test("checks required permissions", async () => {
    const tenant = await createTestTenant();
    expect((await authenticateApiKey(tenant.sandboxKey, { email: ["send"] })).ok).toBe(true);
    expect((await authenticateApiKey(tenant.sandboxKey, { email: ["send", "read"] })).ok).toBe(
      true,
    );
    expect(
      (await authenticateApiKey(tenant.sandboxKey, { suppression: ["create", "read", "delete"] }))
        .ok,
    ).toBe(true);
    expect(await authenticateApiKey(tenant.sandboxKey, { sms: ["send"] })).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(await authenticateApiKey(tenant.sandboxKey, { email: ["delete"] })).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  test("a new key carries every product's default permissions", async () => {
    const tenant = await createTestTenant();
    for (const [resource, actions] of Object.entries(API_KEY_PERMISSIONS)) {
      expect((await authenticateApiKey(tenant.liveKey, { [resource]: actions })).ok).toBe(true);
    }
  });
});

describe("listing and bindings are organization-scoped", () => {
  test("listEnvironmentApiKeys never exposes the hash", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const second = await createEnvironmentApiKey({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
      name: "Second",
      userId: tenant.owner.id,
    });

    const keys = await listEnvironmentApiKeys({
      organizationId: tenant.organization.id,
      environmentId: tenant.development.id,
    });
    expect(keys.map((k) => k.name)).toEqual(["Second", "Test sandbox key"]);
    expect(keys[0]).toEqual({
      id: second.id,
      name: "Second",
      start: second.start,
      enabled: true,
      lastRequest: null,
      createdAt: expect.any(Date),
      createdByUserId: tenant.owner.id,
    });
    const hash = await defaultKeyHasher(second.key);
    expect(JSON.stringify(keys)).not.toContain(hash);
    expect(JSON.stringify(keys)).not.toContain(second.key);

    expect(
      await listEnvironmentApiKeys({
        organizationId: other.organization.id,
        environmentId: tenant.development.id,
      }),
    ).toEqual([]);
  });

  test("getKeyBinding", async () => {
    const tenant = await createTestTenant();
    const other = await createTestTenant();
    const keyId = await keyIdOf(tenant.liveKey);

    expect(await getKeyBinding({ organizationId: tenant.organization.id, keyId })).toEqual({
      apiKeyId: keyId,
      environmentId: tenant.production.id,
      projectId: tenant.project.id,
    });
    expect(await getKeyBinding({ organizationId: other.organization.id, keyId })).toBeNull();
    expect(
      await getKeyBinding({ organizationId: tenant.organization.id, keyId: newId("key") }),
    ).toBeNull();
  });
});
