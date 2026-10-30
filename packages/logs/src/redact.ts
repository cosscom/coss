/**
 * What a log may keep of a request or response body. Logs are readable by every member and over
 * the API, so they never hold secrets, attachment bytes or long content, only the shape of it.
 */

/** Keys whose values are never stored (compared lower-cased, without `_`/`-`). */
const SECRET_KEYS: ReadonlySet<string> = new Set([
  "secret",
  "password",
  "token",
  "apikey",
  "authorization",
  "key",
  "privatekey",
  "signingsecret",
  // A log drain's `auth_header: { name, value }`: the value is a vendor's credential.
  "authheader",
  // Payment cards' fingerprints (risk checkouts): an identifier coss.com keeps only as a keyed hash.
  "fingerprint",
]);
/**
 * Keys holding content: a string (base64 attachments) is replaced by its size, and so is every
 * string inside an object (risk assessments' `content: { text }`, people's own words).
 */
const CONTENT_KEYS: ReadonlySet<string> = new Set(["content"]);

export const REDACTED = "[redacted]";
/** The longest string kept as is. */
export const MAX_LOGGED_STRING = 2048;
/** The largest redacted body kept (as JSON). */
export const MAX_LOGGED_BODY = 16 * 1024;
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 50;

function normalizedKey(key: string): string {
  return key.toLowerCase().replaceAll(/[_-]/g, "");
}

function redactValue(value: unknown, depth: number, contentKeys: ReadonlySet<string>): unknown {
  if (typeof value === "string") {
    return value.length > MAX_LOGGED_STRING
      ? `${value.slice(0, MAX_LOGGED_STRING)}… [${value.length - MAX_LOGGED_STRING} more characters]`
      : value;
  }
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[…]";
  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redactValue(item, depth + 1, contentKeys));
    if (value.length > MAX_ARRAY_ITEMS)
      items.push(`[${value.length - MAX_ARRAY_ITEMS} more items]`);
    return items;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    if (SECRET_KEYS.has(normalized) && item !== null && item !== undefined) {
      out[key] = REDACTED;
    } else if (contentKeys.has(normalized) && item !== null && item !== undefined) {
      out[key] = sizesOnly(item, depth + 1);
    } else {
      out[key] = redactValue(item, depth + 1, contentKeys);
    }
  }
  return out;
}

/**
 * The shape of a value: every string replaced by its length, and every other value (numbers,
 * booleans: a template variable is content too) by its type. Only `null` stays.
 */
function sizesOnly(value: unknown, depth: number): unknown {
  if (typeof value === "string") return `[${value.length} characters]`;
  if (value === null) return value;
  if (typeof value !== "object") return `[${typeof value}]`;
  if (depth >= MAX_DEPTH) return "[…]";
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sizesOnly(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, sizesOnly(item, depth + 1)]),
  );
}

/**
 * Keys of an email's content, for requests about emails of an environment that doesn't store it
 * (`redactBody(body, { content: EMAIL_CONTENT_KEYS })`): subject, bodies, headers, template
 * variables, attachment filenames (React elements are rendered by the SDK and never sent).
 */
export const EMAIL_CONTENT_KEYS: readonly string[] = [
  "subject",
  "html",
  "text",
  "headers",
  "variables",
  "filename",
];

/**
 * A JSON body as a log may keep it: secrets replaced, `content` (and the `content` keys given,
 * at any depth) replaced by its length(s), long strings and arrays cut, and at most
 * `MAX_LOGGED_BODY` bytes overall (beyond that only `{ truncated: true, preview }`).
 */
export function redactBody(body: unknown, opts: { content?: readonly string[] } = {}): unknown {
  const contentKeys = opts.content
    ? new Set([...CONTENT_KEYS, ...opts.content.map(normalizedKey)])
    : CONTENT_KEYS;
  const redacted = redactValue(body, 0, contentKeys);
  const json = JSON.stringify(redacted) ?? "null";
  if (json.length <= MAX_LOGGED_BODY) return redacted;
  return { truncated: true, bytes: json.length, preview: json.slice(0, 1024) };
}

/** Request headers a log keeps (never `authorization` or cookies). */
const REQUEST_HEADERS = [
  "content-type",
  "content-length",
  "user-agent",
  "idempotency-key",
  "origin",
  "accept",
  "traceparent",
] as const;

/** Response headers a log keeps. */
const RESPONSE_HEADERS = [
  "content-type",
  "location",
  "idempotent-replayed",
  "retry-after",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset",
  "ratelimit-policy",
] as const;

function pick(headers: Headers, names: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of names) {
    const value = headers.get(name);
    if (value !== null) out[name] = value.slice(0, 512);
  }
  return out;
}

export function loggedRequestHeaders(headers: Headers): Record<string, string> {
  return pick(headers, REQUEST_HEADERS);
}

export function loggedResponseHeaders(headers: Headers): Record<string, string> {
  return pick(headers, RESPONSE_HEADERS);
}
