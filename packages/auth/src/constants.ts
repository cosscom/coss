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
  domain: ["create", "read", "verify", "delete"],
  webhook: ["create", "read", "update", "delete"],
  suppression: ["create", "read", "delete"],
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
};
