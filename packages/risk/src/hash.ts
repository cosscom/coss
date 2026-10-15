/**
 * Keyed hashes of identifiers (mailboxes, IPs, subnets, user ids, email domains, payment cards'
 * fingerprints, browsers' device ids) for everything
 * risk remembers: velocity counters, duplicate detection, fraud reports and the keys of customers'
 * rate limit buckets. HMAC-SHA256 with `RISK_HASH_KEY`, separated by environment and kind, so a
 * hash means nothing in another environment or without the key. Rotating the key resets that
 * memory.
 */
import { createHmac } from "node:crypto";

export type RiskHashKind =
  | "mailbox"
  | "ip"
  | "subnet"
  | "user"
  | "email_domain"
  | "limit_key"
  | "card"
  | "device";

export type RiskHasher = (environmentId: string, kind: RiskHashKind, value: string) => string;

/** A hasher keyed with `key` (at least 32 bytes). */
export function riskHasher(key: Uint8Array): RiskHasher {
  if (key.length < 32) throw new Error("RISK_HASH_KEY must be at least 32 bytes.");
  const secret = Buffer.from(key);
  return (environmentId, kind, value) =>
    createHmac("sha256", secret)
      .update(`${kind}\0${environmentId}\0${value}`)
      .digest("base64url")
      .slice(0, 32);
}

/** The development key: never used in production (`riskEnvShape` requires a real one there). */
export const DEVELOPMENT_HASH_KEY: Uint8Array = new TextEncoder().encode(
  "coss-risk-development-hash-key-not-for-production",
);
