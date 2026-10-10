export type TenancyErrorCode = "not_found" | "conflict" | "forbidden" | "invalid";

/** Expected, user-facing failures from tenancy services. Anything else is a bug or an outage. */
export class TenancyError extends Error {
  readonly code: TenancyErrorCode;

  constructor(code: TenancyErrorCode, message: string) {
    super(message);
    this.name = "TenancyError";
    this.code = code;
  }
}

/** SQLSTATE of a pg error, also when drizzle wraps it in `DrizzleQueryError.cause`. */
export function pgErrorCode(error: unknown): string | undefined {
  for (let current = error, depth = 0; current && depth < 3; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export const PG_FOREIGN_KEY_VIOLATION = "23503";
