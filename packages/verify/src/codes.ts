/**
 * One-time codes: digits derived from the deployment's code key for each send of a verification
 * (all zeros in sandbox environments), so a send that never went out can go again with the same
 * code and nothing stores it; checked against an HMAC bound to the verification, in constant time.
 */
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

/** The code key, derived from `RISK_HASH_KEY` (at least 32 bytes): no variable of its own. */
export function verifyCodeKey(riskHashKey: Uint8Array): Uint8Array {
  if (riskHashKey.length < 32) throw new Error("The Verify code key needs at least 32 bytes.");
  return new Uint8Array(hkdfSync("sha256", riskHashKey, new Uint8Array(0), "coss-verify-code", 32));
}

/**
 * The code of send `sequence` of a verification, `length` digits: a keyed PRF of the
 * verification and the send (uniform digits: bytes from 250 up are skipped). Without the key it
 * is as unpredictable as a random code; with it, as exposed as the stored HMAC already is.
 * Sandbox environments always get zeros (tests can know it).
 */
export function deriveCode(
  key: Uint8Array,
  verificationId: string,
  sequence: number,
  length: number,
  sandbox: boolean,
): string {
  if (sandbox) return "0".repeat(length);
  let code = "";
  for (let block = 0; code.length < length; block++) {
    const bytes = createHmac("sha256", key)
      .update(`code\0${verificationId}\0${sequence}\0${block}`)
      .digest();
    for (const byte of bytes) {
      if (byte < 250 && code.length < length) code += String(byte % 10);
    }
  }
  return code;
}

export function hashCode(key: Uint8Array, verificationId: string, code: string): string {
  return createHmac("sha256", key).update(`${verificationId}\0${code}`).digest("base64url");
}

/** Whether `code` is the one `hash` was made from, in constant time. */
export function codeMatches(
  key: Uint8Array,
  verificationId: string,
  code: string,
  hash: string | null,
): boolean {
  if (!hash) return false;
  const expected = Buffer.from(hash);
  const actual = Buffer.from(hashCode(key, verificationId, code));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
