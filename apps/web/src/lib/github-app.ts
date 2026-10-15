import "server-only";
import { createPrivateKey, type KeyObject, sign } from "node:crypto";

/**
 * Signing in as a GitHub App: a short JWT signed with the app's private key, exchanged for an
 * installation token (`deploys.ts`).
 */

/**
 * The private key GitHub generates for an app (a PEM file). Environment files often hold it on one
 * line with `\n` escapes; both forms are read.
 */
export function githubAppPrivateKey(pem: string): KeyObject {
  return createPrivateKey(pem.includes("\\n") ? pem.replaceAll("\\n", "\n") : pem);
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

/**
 * The app's JWT: RS256, issued a minute in the past (clock drift) and valid for nine minutes
 * (GitHub accepts at most ten).
 */
export function githubAppJwt(appId: string, key: KeyObject, now: number = Date.now()): string {
  const issuedAt = Math.floor(now / 1000) - 60;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: issuedAt, exp: issuedAt + 600, iss: appId }));
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), key);
  return `${header}.${payload}.${base64url(signature)}`;
}
