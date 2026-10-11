export type ReputationErrorCode = "not_suspended" | "already_suspended" | "invalid_policy";

/** Expected failures of the admin operations; messages are safe to show to the user. */
export class ReputationError extends Error {
  readonly code: ReputationErrorCode;

  constructor(code: ReputationErrorCode, message: string) {
    super(message);
    this.name = "ReputationError";
    this.code = code;
  }
}
