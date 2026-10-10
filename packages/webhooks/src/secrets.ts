/**
 * Endpoint signing secrets are stored encrypted (AES-256-GCM): they must be reversible to sign
 * requests and to show them to the customer, so they cannot be hashed.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

/** Parses `WEBHOOK_SECRETS_KEY` (32 bytes, base64). */
export function parseSecretsKey(value: string): Buffer {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("WEBHOOK_SECRETS_KEY must be 32 bytes, base64 (openssl rand -base64 32).");
  }
  return key;
}

export function encryptSecret(secret: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [VERSION, iv, ciphertext, cipher.getAuthTag()]
    .map((part) => (typeof part === "string" ? part : part.toString("base64")))
    .join(":");
}

export function decryptSecret(stored: string, key: Buffer): string {
  const [version, iv, ciphertext, tag] = stored.split(":");
  if (version !== VERSION || !iv || !ciphertext || !tag) {
    throw new Error("Unsupported webhook secret format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
