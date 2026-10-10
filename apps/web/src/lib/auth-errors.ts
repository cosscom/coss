/** A Better Auth client error (`{ code, message }`), as returned in `{ data, error }`. */
type AuthClientError = { code?: string | undefined; message?: string | undefined } | null;

/** Messages for Better Auth error codes whose default text isn't meant for end users. */
const MESSAGES: Record<string, string> = {
  INVALID_PASSWORD: "Incorrect password.",
  SESSION_NOT_FRESH: "For your security, sign out and sign in again, then retry.",
  INVALID_TWO_FACTOR_COOKIE: "Your sign-in attempt expired. Sign in again.",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "Too many incorrect codes. Sign in again.",
  INVALID_CODE: "That code is incorrect or expired.",
  INVALID_BACKUP_CODE: "That backup code is incorrect or was already used.",
};

/** A user-facing message for a failed Better Auth client call. */
export function authErrorMessage(error: AuthClientError, fallback: string): string {
  if (!error) return fallback;
  return (error.code && MESSAGES[error.code]) || error.message || fallback;
}
