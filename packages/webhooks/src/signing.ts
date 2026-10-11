/**
 * Standard Webhooks signatures (https://www.standardwebhooks.com): `webhook-id`,
 * `webhook-timestamp` and `webhook-signature: v1,<base64 HMAC-SHA256(id.timestamp.body)>`, keyed
 * with the base64 part of the endpoint's `whsec_…` secret.
 */
import { createHmac, randomBytes } from "node:crypto";

const SECRET_PREFIX = "whsec_";

/** A new endpoint signing secret: `whsec_` + 32 random bytes, base64. */
export function generateSigningSecret(): string {
  return `${SECRET_PREFIX}${randomBytes(32).toString("base64")}`;
}

export function signPayload(input: {
  secret: string;
  id: string;
  timestamp: number;
  body: string;
}): string {
  const key = Buffer.from(input.secret.slice(SECRET_PREFIX.length), "base64");
  const mac = createHmac("sha256", key)
    .update(`${input.id}.${input.timestamp}.${input.body}`)
    .digest("base64");
  return `v1,${mac}`;
}

/**
 * The headers of one signed request. Every secret signs: while an endpoint's secret is being
 * rolled, `webhook-signature` lists the current and the previous signature, space-separated, and
 * receivers accept the request when any of them matches.
 */
export function signatureHeaders(input: {
  secrets: readonly [string, ...string[]];
  id: string;
  timestamp: number;
  body: string;
}): Record<string, string> {
  return {
    "webhook-id": input.id,
    "webhook-timestamp": String(input.timestamp),
    "webhook-signature": input.secrets.map((secret) => signPayload({ ...input, secret })).join(" "),
  };
}
