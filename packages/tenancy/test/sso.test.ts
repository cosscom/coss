/**
 * Organization SSO end to end: Better Auth's SSO plugin with our options, against a local OpenID
 * Connect provider (oauth2-mock-server). The IdP runs on 127.0.0.1, which Better Auth only
 * fetches when its origin is trusted, so these tests use an instance that trusts it.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { ssoProviderIdFor } from "@coss/auth/sso";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { eq } from "drizzle-orm";
import {
  disableOrganizationSso,
  disableOrganizationSsoRequirement,
  listAdminAuditEvents,
  listUserSsoAccountsForAdmin,
  suspendOrganization,
  unlinkUserSso,
} from "../src/admin.ts";
import {
  getMembership,
  getOrganizationSsoProvider,
  listOrganizationsRequiringSso,
  listOwnersWithoutPassword,
  setOrganizationSsoRequired,
  syncSsoDomainVerification,
  userHasPassword,
} from "../src/index.ts";
import { createTestOrganization } from "./helpers.ts";
import {
  adminActor,
  BASE_URL,
  createSsoTenant,
  insertVerifiedDomain,
  memberRole,
  passwordSession,
  sessionOf,
  ssoSignIn,
  testAuth,
  userByEmail,
  useSsoTestIdp,
} from "./sso-helpers.ts";

useSsoTestIdp();

describe("SSO sign-in", () => {
  test("a provider stays inactive until its domains are verified email domains", async () => {
    const tenant = await createSsoTenant({ verifyDomain: false });
    expect(
      (await getOrganizationSsoProvider({ organizationId: tenant.organization.id }))?.active,
    ).toBe(false);
    const refused = await ssoSignIn(`ada@${tenant.domain}`);
    expect(refused.status).toBe(401);

    await insertVerifiedDomain(tenant.organization.id, tenant.domain);
    expect(
      await syncSsoDomainVerification({
        organizationId: tenant.organization.id,
        providerId: tenant.providerId,
      }),
    ).toEqual({ unverifiedDomains: [] });
    const provider = await getOrganizationSsoProvider({ organizationId: tenant.organization.id });
    expect(provider).toMatchObject({ active: true, type: "oidc", domains: [tenant.domain] });
    expect((await ssoSignIn(`ada@${tenant.domain}`)).location).toBe("/dashboard");
  });

  test("a new user joins the organization as a verified member with an SSO session", async () => {
    const tenant = await createSsoTenant();
    const email = `new-${uniqueSuffix()}@${tenant.domain}`;
    const result = await ssoSignIn(email);
    expect(result.location).toBe("/dashboard");

    const session = await sessionOf(result.cookies);
    expect(session?.session.ssoProviderId).toBe(tenant.providerId);
    const user = await userByEmail(email);
    expect(user?.emailVerified).toBe(true);
    expect(await memberRole(tenant.organization.id, user?.id ?? "")).toBe("member");
    const membership = await getMembership({
      userId: user?.id ?? "",
      organizationSlug: tenant.organization.slug,
    });
    expect(membership?.ssoProviderId).toBe(tenant.providerId);
  });

  test("password sessions are not SSO sessions", async () => {
    const tenant = await createSsoTenant();
    const session = await sessionOf(await passwordSession(tenant.owner));
    expect(session?.session.ssoProviderId).toBeNull();
  });

  test("links an existing account with a verified email", async () => {
    const tenant = await createSsoTenant();
    const email = `existing-${uniqueSuffix()}@${tenant.domain}`;
    const { user } = await testAuth.api.createUser({
      body: {
        email,
        password: "pw-not-secret-123",
        name: "Existing",
        data: { emailVerified: true },
      },
    });
    const result = await ssoSignIn(email);
    expect(result.location).toBe("/dashboard");
    expect((await sessionOf(result.cookies))?.user.id).toBe(user.id);
    expect(
      (await listUserSsoAccountsForAdmin({ userId: user.id })).map((a) => a.providerId),
    ).toEqual([tenant.providerId]);
  });

  test("does not link an existing account whose email is unverified", async () => {
    const tenant = await createSsoTenant();
    const email = `unverified-${uniqueSuffix()}@${tenant.domain}`;
    const { user } = await testAuth.api.createUser({
      body: {
        email,
        password: "pw-not-secret-123",
        name: "Squatter",
        data: { emailVerified: false },
      },
    });
    const result = await ssoSignIn(email);
    expect(result.location).toContain("error=account");
    expect(await sessionOf(result.cookies)).toBeNull();
    expect(await listUserSsoAccountsForAdmin({ userId: user.id })).toEqual([]);
  });

  test("refuses addresses outside the organization's verified domains", async () => {
    const tenant = await createSsoTenant();
    const outsider = `ceo-${uniqueSuffix()}@elsewhere.test`;
    const result = await ssoSignIn(`ada@${tenant.domain}`, { email: outsider });
    expect(result.location).toContain("error=email_domain_not_allowed");
    expect(await userByEmail(outsider)).toBeNull();
  });

  test("a subdomain verified by another organization belongs to that organization", async () => {
    const tenant = await createSsoTenant();
    const other = await createTestOrganization();
    const subdomain = `team.${tenant.domain}`;
    await insertVerifiedDomain(other.organization.id, subdomain);
    const email = `bob-${uniqueSuffix()}@${subdomain}`;
    const result = await ssoSignIn(`ada@${tenant.domain}`, { email });
    expect(result.location).toContain("error=email_domain_not_allowed");
    expect(await userByEmail(email)).toBeNull();
  });

  test("users with two-factor get no TOTP challenge: the IdP handles MFA", async () => {
    const tenant = await createSsoTenant();
    const email = `mfa-${uniqueSuffix()}@${tenant.domain}`;
    const { user } = await testAuth.api.createUser({
      body: { email, password: "pw-not-secret-123", name: "MFA", data: { emailVerified: true } },
    });
    await db.update(schema.user).set({ twoFactorEnabled: true }).where(eq(schema.user.id, user.id));
    const result = await ssoSignIn(email);
    expect(result.location).toBe("/dashboard");
    expect((await sessionOf(result.cookies))?.session.ssoProviderId).toBe(tenant.providerId);
  });

  test("a suspended organization keeps its members' SSO but takes no new members", async () => {
    const tenant = await createSsoTenant();
    const memberEmail = `member-${uniqueSuffix()}@${tenant.domain}`;
    expect((await ssoSignIn(memberEmail)).location).toBe("/dashboard");
    await suspendOrganization({
      organizationId: tenant.organization.id,
      reason: "Test",
      actor: await adminActor(),
    });

    expect((await ssoSignIn(memberEmail)).location).toBe("/dashboard");
    const newcomer = `newcomer-${uniqueSuffix()}@${tenant.domain}`;
    expect((await ssoSignIn(newcomer)).location).toContain("error=organization_suspended");
    expect(await userByEmail(newcomer)).toBeNull();
  });

  test("provider management is closed over HTTP", async () => {
    const tenant = await createSsoTenant();
    const headers = await passwordSession(tenant.owner);
    for (const path of [
      "/sso/register",
      "/sso/update-provider",
      "/sso/delete-provider",
      "/sso/verify-domain",
    ]) {
      const response = await testAuth.handler(
        new Request(`${BASE_URL}/api/auth${path}`, {
          method: "POST",
          headers: {
            ...Object.fromEntries(headers),
            "content-type": "application/json",
            origin: BASE_URL,
          },
          body: JSON.stringify({ providerId: tenant.providerId }),
        }),
      );
      expect({ path, status: response.status }).toEqual({ path, status: 404 });
    }
  });
});

describe("SSO requirement and recovery", () => {
  test("the requirement is listed per user and read through the membership", async () => {
    const tenant = await createSsoTenant();
    await setOrganizationSsoRequired({ organizationId: tenant.organization.id, required: true });
    const membership = await getMembership({
      userId: tenant.owner.id,
      organizationSlug: tenant.organization.slug,
    });
    expect(membership?.organization.requireSso).toBe(true);
    expect(await listOrganizationsRequiringSso({ userId: tenant.owner.id })).toEqual([
      { name: expect.any(String), slug: tenant.organization.slug },
    ]);
  });

  test("break-glass checks: owners with and without a password", async () => {
    const tenant = await createSsoTenant();
    expect(await userHasPassword({ userId: tenant.owner.id })).toBe(true);
    expect(await listOwnersWithoutPassword({ organizationId: tenant.organization.id })).toEqual([]);

    const email = `sso-owner-${uniqueSuffix()}@${tenant.domain}`;
    await ssoSignIn(email);
    const userId = (await userByEmail(email))?.id ?? "";
    await db.update(schema.member).set({ role: "owner" }).where(eq(schema.member.userId, userId));
    expect(await userHasPassword({ userId })).toBe(false);
    expect(await listOwnersWithoutPassword({ organizationId: tenant.organization.id })).toEqual([
      { userId, email },
    ]);
  });

  test("an admin unlinks a user's SSO accounts and ends their SSO sessions", async () => {
    const tenant = await createSsoTenant();
    const email = `broken-${uniqueSuffix()}@${tenant.domain}`;
    const first = await ssoSignIn(email);
    const user = await userByEmail(email);
    const userId = user?.id ?? "";
    const actor = await adminActor();

    await expect(unlinkUserSso({ userId, reason: " ", actor })).rejects.toThrow("Enter a reason.");
    await unlinkUserSso({ userId, reason: "IdP account recreated", actor });
    expect(await listUserSsoAccountsForAdmin({ userId })).toEqual([]);
    expect(await sessionOf(first.cookies)).toBeNull();
    const { events } = await listAdminAuditEvents({ target: { type: "user", id: userId } });
    expect(events.map((event) => [event.action, event.reason])).toEqual([
      ["user.unlink_sso", "IdP account recreated"],
    ]);
    await expect(unlinkUserSso({ userId, reason: "Again", actor })).rejects.toThrow(
      "This user has no SSO accounts.",
    );

    // The IdP now reports a new subject: the next sign-in links again by verified email.
    const again = await ssoSignIn(email, { sub: `new-sub-${uniqueSuffix()}` });
    expect(again.location).toBe("/dashboard");
    expect((await sessionOf(again.cookies))?.user.id).toBe(userId);
  });

  test("an admin turns off the requirement, or disables the provider", async () => {
    const tenant = await createSsoTenant();
    const organizationId = tenant.organization.id;
    const actor = await adminActor();
    await setOrganizationSsoRequired({ organizationId, required: true });

    await disableOrganizationSsoRequirement({ organizationId, reason: "IdP outage", actor });
    expect(
      (await getMembership({ userId: tenant.owner.id, organizationSlug: tenant.organization.slug }))
        ?.organization.requireSso,
    ).toBe(false);
    await expect(
      disableOrganizationSsoRequirement({ organizationId, reason: "Again", actor }),
    ).rejects.toThrow("This organization doesn't require SSO.");

    await setOrganizationSsoRequired({ organizationId, required: true });
    await disableOrganizationSso({ organizationId, reason: "IdP compromised", actor });
    expect((await getOrganizationSsoProvider({ organizationId }))?.active).toBe(false);
    expect((await ssoSignIn(`ada@${tenant.domain}`)).status).toBe(401);
    const { events } = await listAdminAuditEvents({ organizationId });
    expect(events.map((event) => event.action)).toEqual([
      "organization.disable_sso",
      "organization.disable_sso_requirement",
    ]);

    // Saving the provider again (the dashboard re-syncs) turns it back on.
    await syncSsoDomainVerification({ organizationId, providerId: tenant.providerId });
    expect((await ssoSignIn(`ada@${tenant.domain}`)).location).toBe("/dashboard");
  });

  test("a domain that stops being verified stops SSO at once", async () => {
    const tenant = await createSsoTenant();
    const email = `lapsed-${uniqueSuffix()}@${tenant.domain}`;
    expect((await ssoSignIn(email)).location).toBe("/dashboard");
    await db
      .update(schema.domain)
      .set({ status: "temporary_failure" })
      .where(eq(schema.domain.name, tenant.domain));
    expect((await ssoSignIn(email)).location).toContain("error=email_domain_not_allowed");
    expect(
      (await getOrganizationSsoProvider({ organizationId: tenant.organization.id }))?.active,
    ).toBe(false);
  });
});

describe("SAML providers", () => {
  // A self-signed certificate, only parsed: no SAML response is signed in these tests.
  const cert = readFileSync(new URL("./fixtures/saml-idp-cert.pem", import.meta.url), "utf8");

  test("register with the dashboard's manual configuration and start an SP-initiated sign-in", async () => {
    const { owner, organization } = await createTestOrganization();
    const domain = `saml-${uniqueSuffix()}.test`;
    await insertVerifiedDomain(organization.id, domain);
    const providerId = ssoProviderIdFor(organization.id);
    const auth = `${BASE_URL}/api/auth`;
    const entityId = `${auth}/sso/saml2/sp/metadata?providerId=${providerId}`;
    // The body `saveSsoProviderAction` builds without metadata XML.
    await testAuth.api.registerSSOProvider({
      headers: await passwordSession(owner),
      body: {
        providerId,
        organizationId: organization.id,
        issuer: entityId,
        domain,
        samlConfig: {
          issuer: entityId,
          callbackUrl: `${auth}/sso/saml2/sp/acs/${providerId}`,
          wantAssertionsSigned: true,
          entryPoint: "https://idp.example.com/sso/saml",
          cert,
          idpMetadata: { entityID: "https://idp.example.com/entity", cert },
        },
      },
    });
    await syncSsoDomainVerification({ organizationId: organization.id, providerId });
    expect(await getOrganizationSsoProvider({ organizationId: organization.id })).toMatchObject({
      type: "saml",
      active: true,
      saml: { entryPoint: "https://idp.example.com/sso/saml", usesMetadata: false },
    });

    const start = await testAuth.handler(
      new Request(`${auth}/sign-in/sso`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: BASE_URL },
        body: JSON.stringify({ email: `ada@${domain}`, callbackURL: "/dashboard" }),
      }),
    );
    expect(start.status).toBe(200);
    const { url } = (await start.json()) as { url: string };
    expect(url.startsWith("https://idp.example.com/sso/saml?")).toBe(true);
    expect(new URL(url).searchParams.has("SAMLRequest")).toBe(true);

    const metadata = await testAuth.handler(
      new Request(`${auth}/sso/saml2/sp/metadata?providerId=${providerId}`),
    );
    expect(metadata.status).toBe(200);
    const xml = await metadata.text();
    expect(xml).toContain(`/sso/saml2/sp/acs/${providerId}`);
    expect(xml).toContain('WantAssertionsSigned="true"');
  });
});
