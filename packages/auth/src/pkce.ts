// PKCE (RFC 7636, S256) pieces shared by the iOS app's and the CLI's browser sign-ins.
import { createHash, timingSafeEqual } from "node:crypto";

export const CODE_VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;
const CODE_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
const STATE = /^[A-Za-z0-9\-._~]{16,128}$/;
/** One-time codes: 32 random bytes, base64url. */
export const AUTHORIZATION_CODE = /^[A-Za-z0-9_-]{43}$/;

export function isCodeChallenge(value: unknown): value is string {
  return typeof value === "string" && CODE_CHALLENGE.test(value);
}

export function isAuthorizationState(value: unknown): value is string {
  return typeof value === "string" && STATE.test(value);
}

export function codeChallengeFor(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** How a code is stored in `verification`: its hash, never the code. */
export function codeIdentifier(prefix: string, code: string): string {
  return `${prefix}${createHash("sha256").update(code).digest("base64url")}`;
}
