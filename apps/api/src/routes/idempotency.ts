import { z } from "zod";
import { ApiError } from "../errors.ts";
import { type ValidationResult, validationHook } from "../validation.ts";

export const IDEMPOTENCY_KEY_MAX_LENGTH = 256;

/** The `Idempotency-Key` request header of a create that isn't naturally idempotent. */
export function idempotencyHeaders(description: string) {
  // Header keys are matched case-insensitively by the validator; this spelling is what docs show.
  return z.object({
    "Idempotency-Key": z
      .string()
      .min(1)
      .max(IDEMPOTENCY_KEY_MAX_LENGTH)
      .optional()
      .meta({
        description: `${description} 1-${IDEMPOTENCY_KEY_MAX_LENGTH} characters.`,
        examples: ["welcome-user-123"],
      }),
  });
}

export const idempotentReplayedHeader = {
  description:
    "`true` when this response replays an earlier request with the same `Idempotency-Key`.",
  schema: { type: "string" as const, enum: ["true"] },
};

export function invalidIdempotencyKey(): ApiError {
  return new ApiError(400, {
    type: "invalid_request_error",
    code: "invalid_idempotency_key",
    message: `The Idempotency-Key header must be 1-${IDEMPOTENCY_KEY_MAX_LENGTH} characters.`,
    param: "Idempotency-Key",
  });
}

/**
 * A route's validation hook: a bad `Idempotency-Key` is a 400, not a 422. Pass it as
 * `(result) => { idempotencyHook(result); }` so Hono infers the route's types.
 */
export function idempotencyHook(result: ValidationResult): void {
  if (!result.success && result.target === "header") throw invalidIdempotencyKey();
  validationHook(result);
}
