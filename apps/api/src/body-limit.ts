import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { errorResponse, payloadTooLarge } from "./errors.ts";

/** Every route except `POST /v1/emails`. */
export const BODY_LIMIT_BYTES = 5 * 1024 * 1024;
/** `POST /v1/emails`: room for 25 MB of attachments once base64-encoded (4/3), plus the body. */
export const SEND_BODY_LIMIT_BYTES = 40 * 1024 * 1024;

export function limitBody(maxSize: number) {
  return bodyLimit({ maxSize, onError: (c) => errorResponse(c, payloadTooLarge(maxSize)) });
}

/** The send route enforces its own, larger limit after authenticating the caller. */
export function hasOwnBodyLimit(c: Context): boolean {
  return c.req.method === "POST" && c.req.path === "/v1/emails";
}
