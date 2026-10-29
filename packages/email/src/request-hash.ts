import { canonicalJson, requestHash } from "@coss/db/idempotency";
import type { SendEmailRequestOutput } from "./schemas.ts";

export { canonicalJson };

/** Fingerprint of a parsed send request, compared when an idempotency key is reused. */
export function hashSendRequest(
  params: SendEmailRequestOutput,
  opts: { discardBody?: boolean } = {},
): string {
  if (opts.discardBody) {
    // The body is a secret (a one-time code, a sign-in link): a plain hash of it would let the
    // stored fingerprint confirm guesses. The caller's key names the message on its own.
    const { html: _html, text: _text, ...rest } = params;
    return requestHash(rest);
  }
  return requestHash(params);
}

/** Fingerprint of a parsed batch send request (the emails, in order). */
export function hashSendBatchRequest(emails: readonly SendEmailRequestOutput[]): string {
  return requestHash(emails);
}
