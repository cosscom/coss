import { describe, expect, test } from "bun:test";
import { auth } from "@coss/auth";
import {
  codeChallengeFor,
  createMobileAuthorizationCode,
  exchangeMobileAuthorizationCode,
  MOBILE_CODE_TTL_MS,
  mobileCallbackUrl,
  mobileSessionHeaders,
  revokeMobileSession,
} from "@coss/auth/mobile";
import { db, schema } from "@coss/db";
import { eq } from "drizzle-orm";
import { createTestUser } from "../src/testing.ts";

const VERIFIER = "dBjftJeZ4CVP-mJ92K9b4b2rZ9d3tZu9E6Y7lQ1aWxk_test-verifier";

async function codeFor(userId: string, ssoProviderId: string | null = null, now?: Date) {
  return createMobileAuthorizationCode(
    { userId, codeChallenge: codeChallengeFor(VERIFIER), ssoProviderId },
    now,
  );
}

function exchange(code: string, codeVerifier = VERIFIER, now?: Date) {
  return exchangeMobileAuthorizationCode(
    { code, codeVerifier, ipAddress: "203.0.113.7", userAgent: "COSS-iOS/test" },
    now,
  );
}

async function sessionOf(token: string) {
  const headers = await mobileSessionHeaders(token, "COSS-iOS/test");
  return headers ? auth.api.getSession({ headers }) : null;
}

describe("mobile sign-in", () => {
  test("PKCE S256 matches RFC 7636's example", () => {
    expect(codeChallengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  test("a code opens a session once, readable through the bearer token", async () => {
    const user = await createTestUser();
    const code = await codeFor(user.id);
    expect(mobileCallbackUrl(code, "state-1234567890ab")).toStartWith("coss://auth/callback?code=");

    const result = await exchange(code);
    expect(result?.userId).toBe(user.id);
    const session = await sessionOf(result?.token ?? "");
    expect(session?.user.id).toBe(user.id);
    expect(session?.session.userAgent).toBe("COSS-iOS/test");
    expect(session?.session.ipAddress).toBe("203.0.113.7");

    expect(await exchange(code)).toBeNull();
  });

  test("concurrent exchanges of one code open one session", async () => {
    const user = await createTestUser();
    const code = await codeFor(user.id);
    const results = await Promise.all([exchange(code), exchange(code), exchange(code)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  test("a wrong verifier burns the code", async () => {
    const user = await createTestUser();
    const code = await codeFor(user.id);
    expect(await exchange(code, `${VERIFIER}-wrong`)).toBeNull();
    expect(await exchange(code)).toBeNull();
  });

  test("an expired code is refused", async () => {
    const user = await createTestUser();
    const issued = new Date(Date.now() - MOBILE_CODE_TTL_MS - 1000);
    const code = await codeFor(user.id, null, issued);
    expect(await exchange(code)).toBeNull();
  });

  test("the session keeps the approving session's SSO provider", async () => {
    const user = await createTestUser();
    const result = await exchange(await codeFor(user.id, "sso_mobile_test"));
    const session = await sessionOf(result?.token ?? "");
    expect(session?.session.ssoProviderId).toBe("sso_mobile_test");
  });

  test("banned users get no session", async () => {
    const user = await createTestUser();
    const code = await codeFor(user.id);
    await db.update(schema.user).set({ banned: true }).where(eq(schema.user.id, user.id));
    expect(await exchange(code)).toBeNull();
  });

  test("the app's credential is not a dashboard session cookie", async () => {
    const user = await createTestUser();
    const token = (await exchange(await codeFor(user.id)))?.token ?? "";
    expect(token).toStartWith("cm1.");
    expect(await sessionOf(token)).not.toBeNull();
    const { authCookies } = await auth.$context;
    // Replayed as a browser cookie, it authenticates nothing.
    const asCookie = new Headers({
      cookie: `${authCookies.sessionToken.name}=${encodeURIComponent(token)}`,
    });
    expect(await auth.api.getSession({ headers: asCookie })).toBeNull();
    const [, raw] = token.split(".");
    const rawCookie = new Headers({ cookie: `${authCookies.sessionToken.name}=${raw}` });
    expect(await auth.api.getSession({ headers: rawCookie })).toBeNull();
  });

  test("forged and unsigned tokens are refused; revoking ends the session", async () => {
    const user = await createTestUser();
    const result = await exchange(await codeFor(user.id));
    const token = result?.token ?? "";
    const [, raw] = token.split(".");

    expect(await mobileSessionHeaders(raw ?? "", null)).toBeNull();
    const forged = `cm1.${raw}.${"A".repeat(43)}`;
    expect(await mobileSessionHeaders(forged, null)).toBeNull();
    expect(await revokeMobileSession(forged)).toBe(false);

    expect(await revokeMobileSession(token)).toBe(true);
    expect(await sessionOf(token)).toBeNull();
  });
});
