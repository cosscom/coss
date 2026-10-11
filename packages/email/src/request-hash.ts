import { createHash } from "node:crypto";
import type { SendEmailRequestOutput } from "./schemas.ts";

/** JSON with object keys sorted (by code unit) at every level; `undefined` members are dropped. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const members = Object.entries(value)
      .filter(([, member]) => member !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, member]) => `${JSON.stringify(key)}:${canonicalJson(member)}`);
    return `{${members.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Fingerprint of a parsed send request, compared when an idempotency key is reused. */
export function hashSendRequest(params: SendEmailRequestOutput): string {
  return createHash("sha256").update(canonicalJson(params)).digest("hex");
}

/** Fingerprint of a parsed batch send request (the emails, in order). */
export function hashSendBatchRequest(emails: readonly SendEmailRequestOutput[]): string {
  return createHash("sha256").update(canonicalJson(emails)).digest("hex");
}
