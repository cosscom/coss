/**
 * W3C Trace Context (https://www.w3.org/TR/trace-context/): the `traceparent` a caller sends with
 * an API request is stored on what the request created (an email, a text message) and echoed in
 * its log lines and webhooks — `data.traceparent` and the delivery's own `traceparent` header — so
 * the asynchronous delivery joins the caller's trace. Pure functions: safe to load anywhere.
 */

/** A stored (normalized) `traceparent`: version 00, lowercase hex. */
export const TRACEPARENT_PATTERN = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;

const HEADER = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})(-.*)?$/;
const ZERO_TRACE_ID = "0".repeat(32);
const ZERO_PARENT_ID = "0".repeat(16);

/**
 * A request's `traceparent` header as stored, or `null` when it is absent or invalid (the spec has
 * a receiver ignore an invalid one, never refuse the request). Version 00 must be exactly its four
 * fields; a later version may carry more after them, and is read (and re-emitted) as version 00.
 * Of several (`Headers` joins them with commas) the last one counts: an instrumented `fetch`
 * appends its own span's after the one the SDK set, and both name the same trace.
 */
export function parseTraceparent(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = HEADER.exec(value.slice(value.lastIndexOf(",") + 1).trim());
  if (!match) return null;
  const [, version, traceId, parentId, flags, rest] = match;
  if (version === "ff" || (version === "00" && rest !== undefined)) return null;
  if (traceId === ZERO_TRACE_ID || parentId === ZERO_PARENT_ID) return null;
  return `00-${traceId}-${parentId}-${flags}`;
}

/** The `traceparent` a stored webhook payload echoes in its `data`, if any (and well-formed). */
export function traceparentOf(payload: Record<string, unknown>): string | null {
  const data = payload.data;
  if (data === null || typeof data !== "object") return null;
  const value = (data as { traceparent?: unknown }).traceparent;
  return typeof value === "string" && TRACEPARENT_PATTERN.test(value) ? value : null;
}
