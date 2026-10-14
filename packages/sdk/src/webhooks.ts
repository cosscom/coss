/**
 * Verifies COSS webhook and log drain requests (Standard Webhooks signatures). Uses only Web
 * Crypto, so it runs unchanged on Node, Bun, Deno and Workers.
 */
import type { LogDrainLine } from "./types/log-drain.ts";
import type { WebhookEvent } from "./types/webhook.ts";

/** A webhook request failed verification: reject it (e.g. respond 400). */
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

/** Request headers as a `Headers` object or a plain (Node-style) record. */
export type WebhookHeaders = Headers | Record<string, string | string[] | undefined>;

export interface VerifyWebhookOptions {
  /** Maximum age (and clock skew) of the `webhook-timestamp`, in seconds. Default 300. */
  toleranceSeconds?: number;
  /** The current time; for tests. */
  now?: Date;
}

const SECRET_PREFIX = "whsec_";
const DEFAULT_TOLERANCE_SECONDS = 300;

function header(headers: WebhookHeaders, name: string): string | null {
  if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name);
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (key.toLowerCase() !== name) continue;
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === "string" ? first : null;
  }
  return null;
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Throws unless one of the request's signatures matches and its timestamp is recent. */
async function verifySignature(
  payload: string,
  headers: WebhookHeaders,
  secret: string,
  options: VerifyWebhookOptions,
): Promise<void> {
  const id = header(headers, "webhook-id");
  const timestamp = header(headers, "webhook-timestamp");
  const signatures = header(headers, "webhook-signature");
  if (!id || !timestamp || !signatures) {
    throw new WebhookVerificationError(
      "Missing webhook-id, webhook-timestamp or webhook-signature.",
    );
  }
  const sentAt = Number(timestamp);
  const now = Math.floor((options.now ?? new Date()).getTime() / 1000);
  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (!/^\d+$/.test(timestamp) || Math.abs(now - sentAt) > tolerance) {
    throw new WebhookVerificationError("The webhook timestamp is too old or in the future.");
  }

  const keyBytes = decodeBase64(
    secret.startsWith(SECRET_PREFIX) ? secret.slice(SECRET_PREFIX.length) : secret,
  );
  if (!keyBytes || keyBytes.length === 0) {
    throw new WebhookVerificationError("The signing secret is not a valid whsec_… secret.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signed = new TextEncoder().encode(`${id}.${timestamp}.${payload}`);
  // Several space-separated signatures are sent while a secret is being rotated.
  for (const candidate of signatures.split(" ")) {
    const [version, value] = candidate.split(",", 2);
    if (version !== "v1" || !value) continue;
    const signature = decodeBase64(value);
    // `subtle.verify` compares in constant time.
    if (signature && (await crypto.subtle.verify("HMAC", key, signature, signed))) return;
  }
  throw new WebhookVerificationError("No webhook signature matches.");
}

/**
 * Checks the request's signature and age, then returns the parsed event. Pass the raw request
 * body exactly as received (not re-serialized JSON) and the endpoint's `whsec_…` signing secret.
 * Throws `WebhookVerificationError` when the request must be rejected.
 *
 * ```ts
 * const event = await verifyWebhook(await request.text(), request.headers, process.env.COSS_WEBHOOK_SECRET);
 * ```
 *
 * The same check verifies messages your own users receive from COSS Hooks (`coss.hooks`): pass
 * the endpoint's secret and name your payload type, e.g. `verifyWebhook<InvoicePaid>(…)`.
 */
export async function verifyWebhook<T = WebhookEvent>(
  payload: string,
  headers: WebhookHeaders,
  secret: string,
  options: VerifyWebhookOptions = {},
): Promise<T> {
  await verifySignature(payload, headers, secret, options);
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new WebhookVerificationError("The webhook body is not valid JSON.");
  }
}

/**
 * Checks a log drain request's signature and age, then returns its lines (NDJSON: one log line or
 * audit event per line). Pass the raw request body exactly as received and the drain's `whsec_…`
 * signing secret. The `webhook-id` header is the batch id, the same on every retry of a batch:
 * use it (or each line's `id`) to skip a batch you already stored. Throws
 * `WebhookVerificationError` when the request must be rejected.
 *
 * ```ts
 * const lines = await verifyLogDrainBatch(await request.text(), request.headers, process.env.COSS_LOG_DRAIN_SECRET);
 * ```
 */
export async function verifyLogDrainBatch(
  payload: string,
  headers: WebhookHeaders,
  secret: string,
  options: VerifyWebhookOptions = {},
): Promise<LogDrainLine[]> {
  await verifySignature(payload, headers, secret, options);
  try {
    return payload
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as LogDrainLine);
  } catch {
    throw new WebhookVerificationError("The log drain body is not valid NDJSON.");
  }
}
