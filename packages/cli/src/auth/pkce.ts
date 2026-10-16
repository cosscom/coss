/** PKCE (RFC 7636, S256) for `coss login`, and the verification code the dashboard shows too. */
import { createHash, randomBytes } from "node:crypto";

export function createVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createState(): string {
  return randomBytes(16).toString("base64url");
}

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ0123456789";

/**
 * `XXXX-XXXX`, derived from the challenge exactly as the approval page derives it: the user checks
 * that both show the same code before approving.
 */
export function verificationCode(challenge: string): string {
  const digest = createHash("sha256").update(`coss-cli-verification:${challenge}`).digest();
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[(digest[i] ?? 0) % ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}
