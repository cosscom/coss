/**
 * `WEBHOOK_SECRETS_KEY`, for each app's t3-env schema. Imports only zod: app env modules (and
 * `next.config.ts`) load it before anything touches the database.
 */
import { z } from "zod";

const KEY_BYTES = 32;

/**
 * The keys of `WEBHOOK_SECRETS_KEY`: a comma-separated list of 32-byte base64 keys, newest first.
 * The first encrypts; every one decrypts (see `parseSecretsKeys`). Throws on a malformed list.
 */
export function decodeSecretsKeys(value: string): Buffer[] {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error("WEBHOOK_SECRETS_KEY is empty. Generate a key with `openssl rand -base64 32`.");
  }
  const keys = parts.map((part, index) => {
    const key = Buffer.from(part, "base64");
    if (key.length !== KEY_BYTES || key.toString("base64") !== part) {
      throw new Error(
        `WEBHOOK_SECRETS_KEY entry ${index + 1} must be ${KEY_BYTES} bytes, base64 (openssl rand -base64 32).`,
      );
    }
    return key;
  });
  if (new Set(parts).size !== parts.length) {
    throw new Error("WEBHOOK_SECRETS_KEY lists the same key twice.");
  }
  return keys;
}

export const webhookEnvShape = {
  // Encrypts webhook endpoint signing secrets at rest: comma-separated 32-byte base64 keys,
  // newest first (`openssl rand -base64 32`). The same list for the API, dashboard and worker.
  WEBHOOK_SECRETS_KEY: z.string().superRefine((value, ctx) => {
    try {
      decodeSecretsKeys(value);
    } catch (error) {
      ctx.addIssue({ code: "custom", message: (error as Error).message });
    }
  }),
};
