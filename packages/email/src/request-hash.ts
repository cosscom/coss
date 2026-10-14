import { canonicalJson, requestHash } from "@coss/db/idempotency";
import type { SendEmailRequestOutput } from "./schemas.ts";

export { canonicalJson };

/** Fingerprint of a parsed send request, compared when an idempotency key is reused. */
export function hashSendRequest(params: SendEmailRequestOutput): string {
  return requestHash(params);
}

/** Fingerprint of a parsed batch send request (the emails, in order). */
export function hashSendBatchRequest(emails: readonly SendEmailRequestOutput[]): string {
  return requestHash(emails);
}
