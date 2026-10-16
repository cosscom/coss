import { describe, expect, test } from "bun:test";
import {
  CLI_CODE_TTL_MS,
  type CliAuthorization,
  cliCallbackUrl,
  cliVerificationCode,
  createCliAuthorizationCode,
  isLoopbackPort,
} from "@coss/auth/cli";
import { codeChallengeFor, createMobileAuthorizationCode } from "@coss/auth/mobile";
import { db, schema } from "@coss/db";
import { eq } from "drizzle-orm";
import { suspendOrganization } from "../src/admin.ts";
import { revokeEnvironmentApiKey } from "../src/api-keys.ts";
import { redeemCliAuthorization } from "../src/cli-auth.ts";
import { addMember, createTestTenant, createTestUser, type TestTenant } from "../src/testing.ts";

const VERIFIER = "dBjftJeZ4CVP-mJ92K9b4b2rZ9d3tZu9E6Y7lQ1aWxk_cli-verifier";

function approve(tenant: TestTenant, overrides: Partial<CliAuthorization> = {}, now?: Date) {
  return createCliAuthorizationCode(
    {
      userId: tenant.owner.id,
      organizationId: tenant.organization.id,
      organizationSlug: tenant.organization.slug,
      environmentId: tenant.development.id,
      name: "coss CLI · laptop",
      codeChallenge: codeChallengeFor(VERIFIER),
      ssoProviderId: null,
      ...overrides,
    },
    { ttlMs: CLI_CODE_TTL_MS, now },
  );
}

describe("CLI sign-in", () => {
  test("loopback URLs, ports and verification codes", () => {
    expect(cliCallbackUrl(53682, { code: "abc", state: "s" })).toBe(
      "http://127.0.0.1:53682/callback?code=abc&state=s",
    );
    expect([80, 1023, 1024, 65535, 65536, 3.5, "3000"].map(isLoopbackPort)).toEqual([
      false,
      false,
      true,
      true,
      false,
      false,
      false,
    ]);
    const code = cliVerificationCode(codeChallengeFor(VERIFIER));
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(cliVerificationCode(codeChallengeFor(VERIFIER))).toBe(code);
    expect(cliVerificationCode(codeChallengeFor(`${VERIFIER}x`))).not.toBe(code);
  });

  test("a code is redeemed once, with its verifier, before it expires", async () => {
    const tenant = await createTestTenant();
    const code = await approve(tenant);
    expect(await redeemCliAuthorization({ code, codeVerifier: `${VERIFIER}-wrong` })).toMatchObject(
      {
        ok: false,
        error: "invalid_grant",
      },
    );
    // A wrong verifier burns the code.
    expect((await redeemCliAuthorization({ code, codeVerifier: VERIFIER })).ok).toBe(false);

    const fresh = await approve(tenant);
    const redeemed = await redeemCliAuthorization({ code: fresh, codeVerifier: VERIFIER });
    expect(redeemed).toEqual({
      ok: true,
      grant: {
        user: { id: tenant.owner.id, email: tenant.owner.email },
        organizationId: tenant.organization.id,
        environment: expect.objectContaining({ id: tenant.development.id, mode: "sandbox" }),
        name: "coss CLI · laptop",
      },
    });
    expect((await redeemCliAuthorization({ code: fresh, codeVerifier: VERIFIER })).ok).toBe(false);

    const old = await approve(tenant, {}, new Date(Date.now() - CLI_CODE_TTL_MS - 1));
    expect((await redeemCliAuthorization({ code: old, codeVerifier: VERIFIER })).ok).toBe(false);
  });

  test("mobile codes are not CLI codes", async () => {
    const tenant = await createTestTenant();
    const code = await createMobileAuthorizationCode({
      userId: tenant.owner.id,
      codeChallenge: codeChallengeFor(VERIFIER),
      ssoProviderId: null,
    });
    expect(await redeemCliAuthorization({ code, codeVerifier: VERIFIER })).toMatchObject({
      error: "invalid_grant",
    });
  });

  test("access is re-checked at exchange time", async () => {
    const tenant = await createTestTenant();
    const member = await createTestUser();
    await addMember({ organizationId: tenant.organization.id, userId: member.id, role: "member" });
    const asMember = await approve(tenant, { userId: member.id });
    expect(await redeemCliAuthorization({ code: asMember, codeVerifier: VERIFIER })).toMatchObject({
      ok: false,
      error: "access_denied",
      message: expect.stringContaining("can't create API keys"),
    });

    const stranger = await createTestUser();
    const asStranger = await approve(tenant, { userId: stranger.id });
    expect((await redeemCliAuthorization({ code: asStranger, codeVerifier: VERIFIER })).ok).toBe(
      false,
    );

    const foreign = await createTestTenant();
    const otherEnvironment = await approve(tenant, { environmentId: foreign.development.id });
    expect(
      await redeemCliAuthorization({ code: otherEnvironment, codeVerifier: VERIFIER }),
    ).toMatchObject({ error: "access_denied" });

    await db
      .update(schema.organization)
      .set({ requireTwoFactor: true })
      .where(eq(schema.organization.id, tenant.organization.id));
    const twoFactor = await approve(tenant);
    expect(await redeemCliAuthorization({ code: twoFactor, codeVerifier: VERIFIER })).toMatchObject(
      {
        message: expect.stringContaining("two-factor"),
      },
    );
  });

  test("live keys need a verified email, and suspended organizations get none", async () => {
    const tenant = await createTestTenant({ emailVerified: false });
    const live = await approve(tenant, { environmentId: tenant.production.id });
    expect(await redeemCliAuthorization({ code: live, codeVerifier: VERIFIER })).toMatchObject({
      message: expect.stringContaining("Verify your email"),
    });
    const sandbox = await approve(tenant);
    expect((await redeemCliAuthorization({ code: sandbox, codeVerifier: VERIFIER })).ok).toBe(true);

    const admin = await createTestUser();
    await suspendOrganization({
      organizationId: tenant.organization.id,
      reason: "test",
      actor: { userId: admin.id, email: admin.email },
    });
    const suspended = await approve(tenant);
    expect(await redeemCliAuthorization({ code: suspended, codeVerifier: VERIFIER })).toMatchObject(
      {
        message: expect.stringContaining("suspended"),
      },
    );
  });

  test("a key can revoke itself", async () => {
    const tenant = await createTestTenant();
    const [binding] = await db
      .select({ apiKeyId: schema.environmentApiKey.apiKeyId })
      .from(schema.environmentApiKey)
      .where(eq(schema.environmentApiKey.environmentId, tenant.development.id));
    const keyId = binding?.apiKeyId ?? "";
    const other = await createTestTenant();
    expect(
      await revokeEnvironmentApiKey({ organizationId: other.organization.id, apiKeyId: keyId }),
    ).toBeNull();
    expect(
      await revokeEnvironmentApiKey({ organizationId: tenant.organization.id, apiKeyId: keyId }),
    ).toEqual({ id: keyId, name: "Test sandbox key" });
    expect(
      await revokeEnvironmentApiKey({ organizationId: tenant.organization.id, apiKeyId: keyId }),
    ).toBeNull();
  });
});
