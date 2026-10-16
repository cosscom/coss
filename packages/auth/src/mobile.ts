// iOS app sign-in: PKCE (S256) codes from /app/authorize, exchanged for /api/mobile sessions.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db, schema } from "@coss/db";
import { ID_PREFIXES, newId } from "@coss/db/id";
import { and, eq, gt } from "drizzle-orm";
import { auth } from "./auth.ts";

const { session: sessionTable, user: userTable, verification } = schema;

export const MOBILE_REDIRECT_URI = "coss://auth/callback";
export const MOBILE_CODE_TTL_MS = 60 * 1000;

const IDENTIFIER_PREFIX = "mobile-auth:";
const CODE_VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;
const CODE_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
const STATE = /^[A-Za-z0-9\-._~]{16,128}$/;
const CODE = /^[A-Za-z0-9_-]{43}$/;
// The app's credential: `cm1.` + the session token + "." + a mobile-only HMAC. Never Better
// Auth's signed cookie value, which would also sign in to the whole dashboard from a browser.
const MOBILE_TOKEN = /^cm1\.([A-Za-z0-9]{32})\.([A-Za-z0-9_-]{43})$/;
const MOBILE_SIGNATURE_CONTEXT = "coss-mobile-session:";

type CodePayload = { userId: string; codeChallenge: string; ssoProviderId: string | null };

export function isCodeChallenge(value: unknown): value is string {
  return typeof value === "string" && CODE_CHALLENGE.test(value);
}

export function isAuthorizationState(value: unknown): value is string {
  return typeof value === "string" && STATE.test(value);
}

export function codeChallengeFor(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

function identifierFor(code: string): string {
  return `${IDENTIFIER_PREFIX}${createHash("sha256").update(code).digest("base64url")}`;
}

export function mobileCallbackUrl(code: string, state: string): string {
  return `${MOBILE_REDIRECT_URI}?${new URLSearchParams({ code, state })}`;
}

export async function createMobileAuthorizationCode(
  payload: CodePayload,
  now = new Date(),
): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  await db.insert(verification).values({
    id: newId(ID_PREFIXES.verification),
    identifier: identifierFor(code),
    value: JSON.stringify(payload),
    expiresAt: new Date(now.getTime() + MOBILE_CODE_TTL_MS),
  });
  return code;
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function parsePayload(value: string): CodePayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<CodePayload>;
    if (typeof parsed.userId !== "string" || typeof parsed.codeChallenge !== "string") return null;
    const ssoProviderId = typeof parsed.ssoProviderId === "string" ? parsed.ssoProviderId : null;
    return { userId: parsed.userId, codeChallenge: parsed.codeChallenge, ssoProviderId };
  } catch {
    return null;
  }
}

async function mobileCredential(token: string): Promise<string> {
  const { secret } = await auth.$context;
  const signature = createHmac("sha256", secret)
    .update(MOBILE_SIGNATURE_CONTEXT + token)
    .digest("base64url");
  return `cm1.${token}.${signature}`;
}

/** Better Auth's signed session cookie value; built only server-side, never handed out. */
async function cookieValue(token: string): Promise<string> {
  const { secret } = await auth.$context;
  return `${token}.${createHmac("sha256", secret).update(token).digest("base64")}`;
}

async function verifiedToken(bearer: string): Promise<string | null> {
  const match = MOBILE_TOKEN.exec(bearer);
  if (!match?.[1]) return null;
  return sameString(await mobileCredential(match[1]), bearer) ? match[1] : null;
}

export type MobileExchangeInput = {
  code: string;
  codeVerifier: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export async function exchangeMobileAuthorizationCode(
  input: MobileExchangeInput,
  now = new Date(),
): Promise<{ token: string; userId: string } | null> {
  if (!CODE.test(input.code) || !CODE_VERIFIER.test(input.codeVerifier)) return null;
  const [row] = await db
    .delete(verification)
    .where(
      and(eq(verification.identifier, identifierFor(input.code)), gt(verification.expiresAt, now)),
    )
    .returning({ value: verification.value });
  const payload = row ? parsePayload(row.value) : null;
  if (!payload || !sameString(codeChallengeFor(input.codeVerifier), payload.codeChallenge)) {
    return null;
  }

  // Better Auth's ban check runs only inside its endpoints, not for this direct session.
  const [account] = await db
    .select({ banned: userTable.banned, banExpires: userTable.banExpires })
    .from(userTable)
    .where(eq(userTable.id, payload.userId))
    .limit(1);
  if (!account) return null;
  if (account.banned && (!account.banExpires || account.banExpires > now)) return null;

  const context = await auth.$context;
  const created = await context.internalAdapter.createSession(payload.userId, false, {
    ipAddress: input.ipAddress ?? "",
    userAgent: input.userAgent ?? "",
  });
  // The session hook derives `ssoProviderId` from SSO callback paths only.
  if (payload.ssoProviderId) {
    await db
      .update(sessionTable)
      .set({ ssoProviderId: payload.ssoProviderId })
      .where(eq(sessionTable.id, created.id));
  }
  return { token: await mobileCredential(created.token), userId: payload.userId };
}

// Only the rebuilt session cookie: the caller's own cookies must never authenticate the app API.
export async function mobileSessionHeaders(
  bearer: string,
  userAgent: string | null,
): Promise<Headers | null> {
  const token = await verifiedToken(bearer);
  if (!token) return null;
  const { authCookies } = await auth.$context;
  const headers = new Headers({
    cookie: `${authCookies.sessionToken.name}=${encodeURIComponent(await cookieValue(token))}`,
  });
  if (userAgent) headers.set("user-agent", userAgent);
  return headers;
}

export async function revokeMobileSession(bearer: string): Promise<boolean> {
  const token = await verifiedToken(bearer);
  if (!token) return false;
  const context = await auth.$context;
  await context.internalAdapter.deleteSession(token);
  return true;
}
