/**
 * A local OpenID Connect provider (oauth2-mock-server) and a Better Auth instance that trusts it,
 * shared by the SSO and SCIM suites. Call `useSsoTestIdp()` at the top of a test file.
 */
import { afterAll, beforeAll } from "bun:test";
import { authOptions } from "@coss/auth/options";
import { ssoProviderIdFor } from "@coss/auth/sso";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { betterAuth } from "better-auth";
import { and, eq } from "drizzle-orm";
import { OAuth2Server } from "oauth2-mock-server";
import { syncSsoDomainVerification } from "../src/index.ts";
import { createTestUser, type TestUser } from "../src/testing.ts";
import { createTestOrganization } from "./helpers.ts";

export const BASE_URL = "http://localhost:3000";
const idp = new OAuth2Server();
export let testAuth: ReturnType<typeof createTestAuth>;

function createTestAuth(issuer: string) {
  return betterAuth({ ...authOptions, baseURL: BASE_URL, trustedOrigins: [BASE_URL, issuer] });
}

/** What the IdP says about the next user who signs in. */
let identity = { sub: "", email: "", name: "" };

/** Starts the IdP (and `testAuth`) before the file's tests, stops it after. */
export function useSsoTestIdp(): void {
  beforeAll(async () => {
    await idp.issuer.keys.generate("RS256");
    await idp.start(0, "127.0.0.1");
    idp.service.on("beforeTokenSigning", (token) => {
      Object.assign(token.payload, { ...identity, email_verified: true });
    });
    idp.service.on("beforeUserinfo", (response) => {
      response.body = { ...identity, email_verified: true };
    });
    testAuth = createTestAuth(issuer());
  });

  afterAll(async () => {
    await idp.stop();
  });
}

export function issuer(): string {
  const url = idp.issuer.url;
  if (!url) throw new Error("the IdP is not running");
  return url;
}

/** The `name=value` pairs of a response's Set-Cookie headers, as a request Cookie header. */
export function cookiesOf(headers: Headers): Headers {
  const cookie = headers
    .getSetCookie()
    .filter((c) => !/max-age=0/i.test(c))
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

export async function passwordSession(user: { email: string; password: string }): Promise<Headers> {
  const { headers } = await testAuth.api.signInEmail({
    body: { email: user.email, password: user.password },
    returnHeaders: true,
  });
  return cookiesOf(headers);
}

export async function insertVerifiedDomain(organizationId: string, name: string): Promise<void> {
  await db.insert(schema.domain).values({
    organizationId,
    name,
    status: "verified",
    canSend: true,
    provider: "fake",
    mailFromDomain: `send.${name}`,
  });
}

export type SsoTenant = {
  owner: TestUser;
  organization: { id: string; slug: string };
  domain: string;
  providerId: string;
};

/** An organization with a verified email domain and an OIDC provider for it. */
export async function createSsoTenant(opts: { verifyDomain?: boolean } = {}): Promise<SsoTenant> {
  const { owner, organization } = await createTestOrganization();
  const domain = `sso-${uniqueSuffix()}.test`;
  if (opts.verifyDomain !== false) await insertVerifiedDomain(organization.id, domain);
  const providerId = ssoProviderIdFor(organization.id);
  const base = issuer();
  await testAuth.api.registerSSOProvider({
    headers: await passwordSession(owner),
    body: {
      providerId,
      organizationId: organization.id,
      issuer: base,
      domain,
      oidcConfig: {
        clientId: "coss-test",
        clientSecret: "coss-test-secret",
        skipDiscovery: true,
        discoveryEndpoint: `${base}/.well-known/openid-configuration`,
        authorizationEndpoint: `${base}/authorize`,
        tokenEndpoint: `${base}/token`,
        jwksEndpoint: `${base}/jwks`,
        userInfoEndpoint: `${base}/userinfo`,
        scopes: ["openid", "email", "profile"],
        pkce: true,
      },
    },
  });
  await syncSsoDomainVerification({ organizationId: organization.id, providerId });
  return { owner, organization, domain, providerId };
}

/**
 * Runs an SSO sign-in through the browser redirects: start, the IdP's authorize endpoint, then
 * the callback. Returns the final redirect and the session cookie (if any).
 */
export async function ssoSignIn(email: string, as: { sub?: string; email?: string } = {}) {
  identity = { sub: as.sub ?? `sub-${email}`, email: as.email ?? email, name: "SSO User" };
  const start = await testAuth.handler(
    new Request(`${BASE_URL}/api/auth/sign-in/sso`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE_URL },
      body: JSON.stringify({ email, callbackURL: "/dashboard", errorCallbackURL: "/sso" }),
    }),
  );
  if (start.status !== 200) {
    return { status: start.status, location: null, error: await start.json(), cookies: null };
  }
  const { url } = (await start.json()) as { url: string };
  const authorize = await fetch(url, { redirect: "manual" });
  const callbackUrl = authorize.headers.get("location");
  if (!callbackUrl) throw new Error("the IdP did not redirect back");
  const callback = await testAuth.handler(
    new Request(callbackUrl, { headers: cookiesOf(start.headers) }),
  );
  const location = callback.headers.get("location");
  const cookies = cookiesOf(callback.headers);
  return { status: callback.status, location, error: null, cookies };
}

export async function sessionOf(cookies: Headers | null) {
  if (!cookies) return null;
  return testAuth.api.getSession({ headers: cookies });
}

export async function userByEmail(email: string) {
  const [row] = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
  return row ?? null;
}

export async function memberRole(organizationId: string, userId: string): Promise<string | null> {
  const [row] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

export async function adminActor() {
  const admin = await createTestUser();
  return { userId: admin.id, email: admin.email };
}
