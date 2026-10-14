/**
 * Sign-in with Google and GitHub (Better Auth's social providers, `/api/auth/callback/<provider>`).
 * Server-only.
 *
 * - A provider is on only when both of its env vars are set (`socialProvidersFromEnv`).
 * - New accounts get the sign-up guard of `/sign-up/email` and need an address the provider
 *   verified (`options.ts`, `databaseHooks.user.create`).
 * - An existing account is linked by address only when the provider verified it and the local
 *   account is verified too (`account.accountLinking` in `options.ts`).
 * - Two-factor users still get the TOTP challenge (`socialTwoFactor`).
 * - Provider tokens are never stored (`withoutProviderTokens`): COSS calls neither API.
 */
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { deleteSessionCookie } from "better-auth/cookies";
import { generateRandomString } from "better-auth/crypto";
import { isSocialProvider } from "./constants.ts";

type Env = Record<string, string | undefined>;

/** The providers whose client id and secret are both set. */
export function socialProvidersFromEnv(
  env: Env = process.env,
): NonNullable<BetterAuthOptions["socialProviders"]> {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Only the redirect flow: `/sign-in/social` with an `idToken` would be one more way to
      // create sessions, and the dashboard never uses it.
      disableIdTokenSignIn: true,
      prompt: "select_account",
    };
  }
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }
  return providers;
}

/** Better Auth's OAuth callback (`/callback/:id`), where social sign-ins create users and sessions. */
export function isSocialCallbackPath(path: string | undefined): boolean {
  return path === "/callback/:id" || Boolean(path?.startsWith("/callback/"));
}

/** Clears the provider tokens of a social account being written (create or update). */
export function withoutProviderTokens<T extends { providerId?: string | undefined }>(
  account: T,
): { data: T } | undefined {
  if (!isSocialProvider(account.providerId)) return undefined;
  return {
    data: {
      ...account,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    },
  };
}

// Mirrors Better Auth's two-factor plugin (`TWO_FACTOR_COOKIE_NAME`, `twoFactorCookieMaxAge`
// default and its verification rows), which `/two-factor/verify-*` read back.
// `packages/tenancy/test/social.test.ts` runs the whole challenge.
const TWO_FACTOR_COOKIE_NAME = "two_factor";
const TWO_FACTOR_CHALLENGE_S = 600;

/** The path (with query) a redirect pointed to, if it stays on `origin`. */
function redirectPath(returned: unknown, origin: string): string | null {
  const headers = (returned as { headers?: unknown } | null)?.headers;
  const location = headers instanceof Headers ? headers.get("location") : null;
  if (!location) return null;
  const url = new URL(location, origin);
  return url.origin === origin ? `${url.pathname}${url.search}` : null;
}

/**
 * The two-factor plugin only challenges `/sign-in/email`: an OAuth callback would sign a TOTP
 * user in with their Google or GitHub account alone (and satisfy every organization's 2FA
 * requirement, which checks `user.twoFactorEnabled`). This swaps the new session for the
 * plugin's challenge cookie, as it does for passwords, and sends the browser to the dashboard's
 * code step, which finishes with `/two-factor/verify-totp` or `/verify-backup-code`.
 * Passkeys and SSO keep skipping the code (user verification; the IdP owns MFA).
 */
export function socialTwoFactor(): BetterAuthPlugin {
  return {
    id: "social-two-factor",
    hooks: {
      after: [
        {
          matcher: (ctx) => isSocialCallbackPath(ctx.path),
          handler: createAuthMiddleware(async (ctx) => {
            const data = ctx.context.newSession;
            if (!data?.user.twoFactorEnabled) return;
            const origin = new URL(ctx.context.baseURL).origin;
            const next = redirectPath(ctx.context.returned, origin);

            deleteSessionCookie(ctx, true);
            await ctx.context.internalAdapter.deleteSession(data.session.token);
            ctx.context.setNewSession(null);

            const cookie = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE_NAME, {
              maxAge: TWO_FACTOR_CHALLENGE_S,
            });
            const identifier = `2fa-${generateRandomString(20)}`;
            const expiresAt = new Date(Date.now() + TWO_FACTOR_CHALLENGE_S * 1000);
            await ctx.context.internalAdapter.createVerificationValue({
              value: data.user.id,
              identifier,
              expiresAt,
            });
            await ctx.context.internalAdapter.createVerificationValue({
              value: "0",
              identifier: `2fa-attempts-${identifier}`,
              expiresAt,
            });
            await ctx.setSignedCookie(
              cookie.name,
              identifier,
              ctx.context.secret,
              cookie.attributes,
            );

            const query = new URLSearchParams({ step: "two-factor" });
            if (next) query.set("next", next);
            throw ctx.redirect(`${origin}/sign-in?${query}`);
          }),
        },
      ],
    },
  };
}
