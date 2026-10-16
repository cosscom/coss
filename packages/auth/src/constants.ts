/** Client-safe constants shared by the dashboard and server code. */

/** Better Auth api-key plugin enforces `maximumNameLength` (we set it explicitly). */
export const API_KEY_NAME_MAX_LENGTH = 32;

/** Key prefix by environment mode. Secret scanners can match `coss_(live|test)_[A-Za-z]{64}`. */
export const API_KEY_PREFIX = {
  live: "coss_live_",
  sandbox: "coss_test_",
} as const;

/** Prefix + this many characters are stored/displayed (`coss_live_AbCd`). */
export const API_KEY_VISIBLE_CHARACTERS = 14;

/**
 * Permissions every API key is created with: one key covers every product the organization uses.
 * Stored on the key row at creation time, so changing this only affects new keys — existing ones
 * need an `apikey.permissions` backfill.
 */
export const API_KEY_PERMISSIONS: Record<string, string[]> = {
  email: ["send", "read"],
  emailTemplate: ["create", "read", "update", "delete", "publish"],
  receivedEmail: ["delete"],
  domain: ["create", "read", "verify", "delete"],
  webhook: ["create", "read", "update", "delete"],
  suppression: ["create", "read", "delete"],
  contact: ["create", "read", "update", "delete"],
  reputation: ["read"],
  log: ["read"],
  // The organization's audit log. Only owners and admins create keys, and they can read it.
  audit: ["read"],
  logDrain: ["create", "read", "update", "delete"],
  risk: ["assess", "read", "feedback", "update"],
  riskList: ["create", "read", "delete"],
  riskRule: ["create", "read", "update", "delete"],
  // The organization's plan, usage, invoices and credits (read only; changes need the dashboard).
  billing: ["read"],
  hook: ["create", "read", "update", "delete", "send"],
};

/** The header the dashboard's sign-up form carries `coss/device`'s token in (coss.com Risk). */
export const DEVICE_TOKEN_HEADER = "x-coss-device";

/** Social sign-in providers coss.com supports (each enabled only when its client id + secret are set). */
export const SOCIAL_PROVIDERS = ["google", "github"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: "Google",
  github: "GitHub",
};

export function isSocialProvider(value: unknown): value is SocialProvider {
  return (SOCIAL_PROVIDERS as readonly unknown[]).includes(value);
}
