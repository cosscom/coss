/**
 * Sign-in with GitHub (Google takes the same paths) through Better Auth's real callback, with
 * GitHub's token and user endpoints stubbed: sign-up, linking by address, refusals and the TOTP
 * challenge (`@coss/auth` `./social.ts`).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { authOptions } from "@coss/auth/options";
import { socialProvidersFromEnv } from "@coss/auth/social";
import { db, schema } from "@coss/db";
import { uniqueSuffix } from "@coss/db/testing";
import { betterAuth } from "better-auth";
import { and, eq } from "drizzle-orm";
import { createTestUser } from "../src/testing.ts";

const BASE_URL = "http://localhost:3000";
const testAuth = betterAuth({
  ...authOptions,
  baseURL: BASE_URL,
  trustedOrigins: [BASE_URL],
  socialProviders: socialProvidersFromEnv({
    GITHUB_CLIENT_ID: "coss-test",
    GITHUB_CLIENT_SECRET: "coss-test-secret",
  }),
});

type GitHubIdentity = { id: number; email: string; verified: boolean };
/** What GitHub says about the next user who signs in. */
let identity: GitHubIdentity = { id: 0, email: "", verified: true };
let nextGitHubId = Date.now();

function githubIdentity(email: string, verified = true): GitHubIdentity {
  nextGitHubId += 1;
  return { id: nextGitHubId, email, verified };
}

const realFetch = globalThis.fetch;
beforeAll(() => {
  const stub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === "https://github.com/login/oauth/access_token") {
      return Response.json({ access_token: "gho_test", token_type: "bearer", scope: "user:email" });
    }
    if (url === "https://api.github.com/user") {
      return Response.json({
        id: identity.id,
        login: `octo${identity.id}`,
        name: "Octo",
        email: null,
      });
    }
    if (url === "https://api.github.com/user/emails") {
      return Response.json([{ email: identity.email, primary: true, verified: identity.verified }]);
    }
    return realFetch(input, init);
  };
  globalThis.fetch = Object.assign(stub, { preconnect: realFetch.preconnect });
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

/** The `name=value` pairs of a response's Set-Cookie headers, as a request Cookie header. */
function cookiesOf(headers: Headers): Headers {
  const cookie = headers
    .getSetCookie()
    .filter((c) => !/max-age=0/i.test(c))
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

/** Starts a GitHub sign-in as the dashboard does, then returns from GitHub as `as`. */
async function signInWithGitHub(as: GitHubIdentity) {
  const start = await testAuth.handler(
    new Request(`${BASE_URL}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE_URL },
      body: JSON.stringify({
        provider: "github",
        callbackURL: "/acme",
        errorCallbackURL: "/sign-in",
      }),
    }),
  );
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get("state");
  identity = as;
  const callback = await testAuth.handler(
    new Request(`${BASE_URL}/api/auth/callback/github?code=test-code&state=${state}`, {
      headers: cookiesOf(start.headers),
    }),
  );
  const location = new URL(callback.headers.get("location") ?? "", BASE_URL);
  const cookies = cookiesOf(callback.headers);
  const session = await testAuth.api.getSession({ headers: cookies });
  return { location, cookies, session };
}

async function githubAccountsOf(userId: string) {
  return db
    .select()
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "github")));
}

async function userByEmail(email: string) {
  const [user] = await db.select().from(schema.user).where(eq(schema.user.email, email));
  return user;
}

describe("sign-in with GitHub", () => {
  test("creates a verified account for a new verified address, without storing tokens", async () => {
    const email = `octo-${uniqueSuffix()}@coss.test`;
    const { location, session } = await signInWithGitHub(githubIdentity(email));
    expect(location.pathname).toBe("/acme");
    expect(session?.user.email).toBe(email);
    expect(session?.user.emailVerified).toBe(true);

    const user = await userByEmail(email);
    expect(user?.canonicalEmail).toBe(email);
    const [account] = await githubAccountsOf(session?.user.id ?? "");
    expect(account?.accessToken).toBeNull();
    expect(account?.refreshToken).toBeNull();

    // Signing in again finds the same account (and still stores no token).
    const again = await signInWithGitHub({ ...identity });
    expect(again.session?.user.id).toBe(session?.user.id);
    const [after] = await githubAccountsOf(session?.user.id ?? "");
    expect(after?.accessToken).toBeNull();
  });

  test("refuses a new account for an address GitHub hasn't verified", async () => {
    const email = `unverified-${uniqueSuffix()}@coss.test`;
    const { location, session } = await signInWithGitHub(githubIdentity(email, false));
    expect(session).toBeNull();
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("error")).toBe("SOCIAL_EMAIL_NOT_VERIFIED");
    expect(await userByEmail(email)).toBeUndefined();
  });

  test("applies the sign-up guard: disposable addresses and taken mailboxes", async () => {
    const disposable = await signInWithGitHub(
      githubIdentity(`burner-${uniqueSuffix()}@mailinator.com`),
    );
    expect(disposable.session).toBeNull();
    expect(disposable.location.searchParams.get("error")).toBe("DISPOSABLE_EMAIL");

    // Same Gmail mailbox, different spelling: Better Auth would create a second account.
    const local = `jane${uniqueSuffix()}`;
    await testAuth.api.createUser({
      body: {
        email: `${local.slice(0, 2)}.${local.slice(2)}@gmail.com`,
        name: "Jane",
        password: "a-long-password",
        data: { emailVerified: true },
      },
    });
    const taken = await signInWithGitHub(githubIdentity(`${local}@gmail.com`));
    expect(taken.session).toBeNull();
    expect(taken.location.searchParams.get("error")).toBe("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL");
  });

  test("links to an existing verified account with the same address", async () => {
    const user = await createTestUser();
    const { location, session } = await signInWithGitHub(githubIdentity(user.email));
    expect(location.pathname).toBe("/acme");
    expect(session?.user.id).toBe(user.id);
    expect(await githubAccountsOf(user.id)).toHaveLength(1);
  });

  test("never links to an unverified account (someone else may have registered it)", async () => {
    const user = await createTestUser({ emailVerified: false });
    const { location, session } = await signInWithGitHub(githubIdentity(user.email));
    expect(session).toBeNull();
    expect(location.searchParams.get("error")).toBe("account_not_linked");
    expect(await githubAccountsOf(user.id)).toHaveLength(0);
  });

  test("connecting from settings may use another address, which then signs in here", async () => {
    const user = await createTestUser();
    const signIn = await testAuth.api.signInEmail({
      body: { email: user.email, password: user.password },
      returnHeaders: true,
    });
    const link = await testAuth.api.linkSocialAccount({
      headers: cookiesOf(signIn.headers),
      body: { provider: "github", callbackURL: "/settings", disableRedirect: true },
      returnHeaders: true,
    });
    const state = new URL(link.response.url ?? "").searchParams.get("state");
    const other = githubIdentity(`other-${uniqueSuffix()}@coss.test`);
    identity = other;
    const callback = await testAuth.handler(
      new Request(`${BASE_URL}/api/auth/callback/github?code=test-code&state=${state}`, {
        headers: new Headers({
          cookie: [cookiesOf(signIn.headers), cookiesOf(link.headers)]
            .map((headers) => headers.get("cookie"))
            .filter(Boolean)
            .join("; "),
        }),
      }),
    );
    expect(new URL(callback.headers.get("location") ?? "", BASE_URL).pathname).toBe("/settings");
    expect(await githubAccountsOf(user.id)).toHaveLength(1);

    const { session } = await signInWithGitHub(other);
    expect(session?.user.id).toBe(user.id);
    expect(await userByEmail(other.email)).toBeUndefined();
  });

  test("two-factor users get the TOTP challenge instead of a session", async () => {
    const user = await createTestUser();
    const signIn = await testAuth.api.signInEmail({
      body: { email: user.email, password: user.password },
      returnHeaders: true,
    });
    const headers = cookiesOf(signIn.headers);
    const enabled = await testAuth.api.enableTwoFactor({
      headers,
      body: { password: user.password },
    });
    if (enabled.method !== "totp") throw new Error("expected a TOTP setup");
    const [secretRow] = await db
      .select()
      .from(schema.twoFactor)
      .where(eq(schema.twoFactor.userId, user.id));
    expect(secretRow).toBeDefined();
    // Turn it on directly; two-factor.test.ts covers enrollment.
    await db.update(schema.user).set({ twoFactorEnabled: true }).where(eq(schema.user.id, user.id));

    const sessionsBefore = await db
      .select({ id: schema.session.id })
      .from(schema.session)
      .where(eq(schema.session.userId, user.id));
    const { location, cookies, session } = await signInWithGitHub(githubIdentity(user.email));
    expect(session).toBeNull();
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("step")).toBe("two-factor");
    expect(location.searchParams.get("next")).toBe("/acme");
    // The callback's session was deleted, not just its cookie.
    const sessionsAfter = await db
      .select({ id: schema.session.id })
      .from(schema.session)
      .where(eq(schema.session.userId, user.id));
    expect(sessionsAfter).toHaveLength(sessionsBefore.length);

    // A backup code from enrollment finishes the challenge like after a password.
    const backupCode = enabled.backupCodes[0] ?? "";
    const verified = await testAuth.api.verifyBackupCode({
      headers: cookies,
      body: { code: backupCode },
      returnHeaders: true,
    });
    const finished = await testAuth.api.getSession({ headers: cookiesOf(verified.headers) });
    expect(finished?.user.id).toBe(user.id);
  });
});
