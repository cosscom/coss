/**
 * Twilio's request signature (`X-Twilio-Signature`): base64 HMAC-SHA1, keyed with the auth token
 * of the account the request is about, of the full URL Twilio called followed by every POST
 * parameter name and value, sorted by name. The URL must be the public one Twilio was given (the
 * API's `API_PUBLIC_URL`, never the request's own: it arrives through CloudFront and the ALB).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function twilioSignature(
  authToken: string,
  url: string,
  params: Readonly<Record<string, string | readonly string[]>>,
): string {
  let data = url;
  for (const name of Object.keys(params).sort()) {
    const value = params[name];
    const values = typeof value === "string" ? [value] : [...(value ?? [])].sort();
    for (const item of values) data += name + item;
  }
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function verifyTwilioSignature(input: {
  authToken: string;
  url: string;
  params: Readonly<Record<string, string | readonly string[]>>;
  signature: string | null | undefined;
}): boolean {
  if (!input.signature) return false;
  const expected = Buffer.from(twilioSignature(input.authToken, input.url, input.params));
  const given = Buffer.from(input.signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
