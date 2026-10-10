import { describe, expect, test } from "bun:test";
import { auth } from "@coss/auth";
import { db, schema } from "@coss/db";
import { eq } from "drizzle-orm";
import { listAdminAuditEvents, resetUserTwoFactor } from "../src/admin.ts";
import {
  getMembership,
  listOrganizationMembers,
  listOrganizationsRequiringTwoFactor,
  promoteToAdmin,
  setOrganizationTwoFactorRequired,
} from "../src/index.ts";
import { createTestTenant, createTestUser, type TestUser } from "../src/testing.ts";

/** The `name=value` pairs of a response's Set-Cookie headers, as a request Cookie header. */
function cookiesOf(headers: Headers): Headers {
  const cookie = headers
    .getSetCookie()
    .filter((c) => !/max-age=0/i.test(c))
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

async function signIn(user: TestUser) {
  const { headers, response } = await auth.api.signInEmail({
    body: { email: user.email, password: user.password },
    returnHeaders: true,
  });
  return { headers: cookiesOf(headers), response };
}

/** RFC 4648 base32 (the encoding of the `secret` in an otpauth:// URI). */
function decodeBase32(input: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of input.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g)?.map((byte) => Number.parseInt(byte, 2)) ?? [];
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** The current TOTP code for a raw (decoded) secret. */
async function currentCode(secret: string): Promise<string> {
  return (await auth.api.generateTOTP({ body: { secret } })).code;
}

/** Enables TOTP the way the dashboard does (password, then a code); returns the secret. */
async function enableTotp(user: TestUser): Promise<{ secret: string; backupCodes: string[] }> {
  const { headers } = await signIn(user);
  const enabled = await auth.api.enableTwoFactor({ headers, body: { password: user.password } });
  if (enabled.method !== "totp") throw new Error("expected a TOTP setup");
  const encoded = new URL(enabled.totpURI).searchParams.get("secret");
  if (!encoded) throw new Error("TOTP URI has no secret");
  const secret = decodeBase32(encoded);
  await auth.api.verifyTOTP({ headers, body: { code: await currentCode(secret) } });
  return { secret, backupCodes: enabled.backupCodes };
}

async function twoFactorEnabled(userId: string): Promise<boolean | null> {
  const [row] = await db
    .select({ enabled: schema.user.twoFactorEnabled })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  return row?.enabled ?? null;
}

describe("TOTP two-factor authentication", () => {
  test("enabling needs the password and stays off until a code is verified", async () => {
    const user = await createTestUser();
    const { headers } = await signIn(user);
    await expect(
      auth.api.enableTwoFactor({ headers, body: { password: "wrong-password" } }),
    ).rejects.toThrow();

    const enabled = await auth.api.enableTwoFactor({ headers, body: { password: user.password } });
    expect(enabled.method).toBe("totp");
    expect(await twoFactorEnabled(user.id)).toBe(false);
    // An unverified setup doesn't challenge sign-ins.
    expect((await signIn(user)).response).not.toHaveProperty("twoFactorRedirect");
  });

  test("password sign-in is challenged and only a valid code creates a session", async () => {
    const user = await createTestUser();
    const { secret } = await enableTotp(user);
    expect(await twoFactorEnabled(user.id)).toBe(true);

    const { headers, response } = await signIn(user);
    expect(response).toMatchObject({ twoFactorRedirect: true, twoFactorMethods: ["totp"] });
    // The challenge cookie alone is not a session.
    expect(await auth.api.getSession({ headers })).toBeNull();

    await expect(auth.api.verifyTOTP({ headers, body: { code: "000000" } })).rejects.toThrow();
    const verified = await auth.api.verifyTOTP({
      headers,
      body: { code: await currentCode(secret) },
      returnHeaders: true,
    });
    const session = await auth.api.getSession({ headers: cookiesOf(verified.headers) });
    expect(session?.user.id).toBe(user.id);
  });

  test("a backup code completes the challenge once", async () => {
    const user = await createTestUser();
    const { backupCodes } = await enableTotp(user);
    const [code] = backupCodes;
    if (!code) throw new Error("no backup codes");

    const first = await signIn(user);
    await auth.api.verifyBackupCode({ headers: first.headers, body: { code } });

    const second = await signIn(user);
    await expect(
      auth.api.verifyBackupCode({ headers: second.headers, body: { code } }),
    ).rejects.toThrow();
  });

  test("resetUserTwoFactor removes the secret and the challenge, and is audited", async () => {
    const user = await createTestUser();
    const admin = await createTestUser();
    const actor = { userId: admin.id, email: admin.email };
    await enableTotp(user);

    await expect(resetUserTwoFactor({ userId: user.id, reason: " ", actor })).rejects.toThrow();
    await resetUserTwoFactor({ userId: user.id, reason: "Lost phone", actor });
    expect(await twoFactorEnabled(user.id)).toBe(false);
    const rows = await db
      .select()
      .from(schema.twoFactor)
      .where(eq(schema.twoFactor.userId, user.id));
    expect(rows).toHaveLength(0);
    expect((await signIn(user)).response).not.toHaveProperty("twoFactorRedirect");

    const { events } = await listAdminAuditEvents({ target: { type: "user", id: user.id } });
    expect(events.map((e) => [e.action, e.reason])).toEqual([
      ["user.reset_two_factor", "Lost phone"],
    ]);
    // Nothing to reset any more.
    await expect(resetUserTwoFactor({ userId: user.id, reason: "Again", actor })).rejects.toThrow();
  });
});

describe("factor management while impersonating", () => {
  test("an impersonating admin can't enroll or remove sign-in factors", async () => {
    const admin = await createTestUser();
    await promoteToAdmin(admin.email);
    const target = await createTestUser();

    const { headers: adminHeaders } = await signIn(admin);
    const impersonation = await auth.api.impersonateUser({
      headers: adminHeaders,
      body: { userId: target.id },
      returnHeaders: true,
    });
    const headers = cookiesOf(impersonation.headers);
    expect((await auth.api.getSession({ headers }))?.user.id).toBe(target.id);

    await expect(
      auth.api.enableTwoFactor({ headers, body: { password: target.password } }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(
      auth.api.disableTwoFactor({ headers, body: { password: target.password } }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
    await expect(
      auth.api.deletePasskey({ headers, body: { id: "passkey_x" } }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
    // Listing is still allowed.
    expect(await auth.api.listPasskeys({ headers })).toEqual([]);
  });
});

describe("organization two-factor requirement", () => {
  test("is off by default and is visible through memberships", async () => {
    const tenant = await createTestTenant();
    const membership = () =>
      getMembership({ userId: tenant.owner.id, organizationSlug: tenant.organization.slug });

    expect((await membership())?.organization.requireTwoFactor).toBe(false);
    expect(await listOrganizationsRequiringTwoFactor({ userId: tenant.owner.id })).toEqual([]);

    await setOrganizationTwoFactorRequired({
      organizationId: tenant.organization.id,
      required: true,
    });
    expect((await membership())?.organization.requireTwoFactor).toBe(true);
    expect(await listOrganizationsRequiringTwoFactor({ userId: tenant.owner.id })).toEqual([
      { name: tenant.organization.name, slug: tenant.organization.slug },
    ]);

    await setOrganizationTwoFactorRequired({
      organizationId: tenant.organization.id,
      required: false,
    });
    expect((await membership())?.organization.requireTwoFactor).toBe(false);
  });

  test("organization members report whether they have two-factor enabled", async () => {
    const tenant = await createTestTenant();
    const [before] = await listOrganizationMembers({ organizationId: tenant.organization.id });
    expect(before?.user.twoFactorEnabled).toBe(false);

    await enableTotp(tenant.owner);
    const [after] = await listOrganizationMembers({ organizationId: tenant.organization.id });
    expect(after?.user.twoFactorEnabled).toBe(true);
  });

  test("the requirement can't be set through Better Auth's organization endpoints", async () => {
    const owner = await createTestUser();
    const { headers } = await signIn(owner);
    const created = await auth.api.createOrganization({
      headers,
      body: {
        name: "Sneaky",
        slug: `sneaky-${owner.id.slice(-8)}`,
        requireTwoFactor: true,
      } as never,
    });
    const [row] = await db
      .select({ required: schema.organization.requireTwoFactor })
      .from(schema.organization)
      .where(eq(schema.organization.id, created?.id ?? ""));
    expect(row?.required).toBe(false);
  });
});
