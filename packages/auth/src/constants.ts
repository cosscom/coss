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
