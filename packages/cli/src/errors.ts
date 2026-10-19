import type { CossError } from "coss";

/** A failure to report to the user: printed as is (no stack), with an exit code. */
export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

/** Wrong flags or arguments (exit code 2, like most CLIs). */
export class UsageError extends CliError {
  constructor(message: string) {
    super(message, 2);
    this.name = "UsageError";
  }
}

const HINTS: Partial<Record<CossError["type"], string>> = {
  authentication_error: "Run `coss login` to sign in again.",
  permission_error: "This API key isn't allowed to do that.",
  rate_limit_error: "Slow down and try again shortly.",
  connection_error: "Check your connection (and COSS_BASE_URL, if you set it).",
};

/**
 * Failures worth retrying unchanged: the network, a timeout, a rate limit or the API itself (5xx).
 * Anything else (a bad filter, a revoked key, …) fails the same way every time.
 */
export function isTransient(error: CossError): boolean {
  return (
    error.type === "connection_error" ||
    error.type === "timeout_error" ||
    error.type === "rate_limit_error" ||
    error.type === "api_error"
  );
}

/** An API failure as one readable message: what failed, why, and the request id for support. */
export function apiError(doing: string, error: CossError): CliError {
  const details = [
    error.message,
    ...(error.issues ?? []).map((issue) => `  ${issue.path}: ${issue.message}`),
  ].join("\n");
  const request = error.request_id ? ` (request ${error.request_id})` : "";
  const hint =
    error.code === "insufficient_permissions"
      ? "This API key is restricted: `coss whoami` lists what it may do. Use a key with that permission."
      : HINTS[error.type];
  return new CliError(`${doing}: ${details}${request}${hint ? `\n${hint}` : ""}`);
}
