/**
 * Standard Webhooks signatures (https://www.standardwebhooks.com), as COSS signs the requests it
 * sends endpoints: `v1,<base64 HMAC-SHA256 of "<id>.<timestamp>.<body>">` keyed by the secret's
 * base64 part. The SDK's `verifyWebhook` checks them.
 */
import { createHmac, randomBytes } from "node:crypto";

const SECRET = /^whsec_[A-Za-z0-9+/]{43}=$/;

export function generateSecret(): string {
  return `whsec_${randomBytes(32).toString("base64")}`;
}

export function isSecret(value: unknown): value is string {
  return typeof value === "string" && SECRET.test(value);
}

export function sign(secret: string, id: string, timestamp: number, body: string): string {
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const digest = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return `v1,${digest}`;
}

/** The three headers a COSS webhook carries. */
export function signatureHeaders(input: {
  secret: string;
  id: string;
  timestamp: number;
  body: string;
}): Record<string, string> {
  return {
    "webhook-id": input.id,
    "webhook-timestamp": String(input.timestamp),
    "webhook-signature": sign(input.secret, input.id, input.timestamp, input.body),
  };
}
