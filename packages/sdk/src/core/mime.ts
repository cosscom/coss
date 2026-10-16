/**
 * Helpers the integrations (`coss/nodemailer`, `coss/better-auth`, `coss/authjs`) share to turn a
 * framework's message into a `SendEmailParams`. No `node:*`: like the rest of the SDK this runs on
 * Node, Bun, Deno and Workers.
 */

/**
 * Headers the API refuses because coss.com or the provider sets them (`RESERVED_HEADERS` in
 * `packages/email/src/schemas.ts`, mirrored by hand; `apps/api/test/integrations-contract.test.ts`
 * sends every one). Mailers set several of these on every message, so they are dropped, not sent.
 */
const RESERVED_HEADERS: ReadonlySet<string> = new Set([
  "from",
  "to",
  "cc",
  "bcc",
  "reply-to",
  "subject",
  "sender",
  "return-path",
  "date",
  "message-id",
  "mime-version",
  "content-type",
  "content-transfer-encoding",
  "content-disposition",
  "dkim-signature",
  "received",
]);

/** Whether the API would refuse a custom header with this name. */
export function isReservedHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return RESERVED_HEADERS.has(lower) || lower.startsWith("x-ses-");
}

// RFC 5322 specials (minus "."): the API refuses them in an unquoted display name.
const NAME_SPECIALS = /["<>,;:@()[\]\\]/;

/** `addr`, or `Name <addr>` with the name quoted when it needs to be. */
export function formatAddress(address: string, name?: string | null): string {
  const trimmedName = name?.trim();
  if (!trimmedName) return address;
  const display = NAME_SPECIALS.test(trimmedName)
    ? `"${trimmedName.replace(/["\\]/g, "\\$&")}"`
    : trimmedName;
  return `${display} <${address}>`;
}

const PRINTABLE_ASCII = /^[ -~]*$/;
// One encoded-word holds at most 75 characters: `=?UTF-8?B?` + base64 + `?=` leaves 63 for the
// base64, i.e. 45 bytes of UTF-8 (rounded down to whole characters).
const ENCODED_WORD_BYTES = 45;

/**
 * A header value as the API takes it: one line of printable ASCII. Folded lines are unfolded, and
 * anything non-ASCII becomes RFC 2047 encoded-words (`=?UTF-8?B?…?=`), which mail clients decode.
 */
export function encodeHeaderValue(value: string): string {
  // Unfold, and turn every other control character into a space.
  const unfolded = value
    .replace(/\r?\n[ \t]*/g, " ")
    .replace(/\p{Cc}/gu, " ")
    .trim();
  if (PRINTABLE_ASCII.test(unfolded)) return unfolded;
  const encoder = new TextEncoder();
  const words: string[] = [];
  let chunk: number[] = [];
  for (const character of unfolded) {
    const bytes = encoder.encode(character);
    if (chunk.length + bytes.length > ENCODED_WORD_BYTES) {
      words.push(`=?UTF-8?B?${toBase64(Uint8Array.from(chunk))}?=`);
      chunk = [];
    }
    chunk.push(...bytes);
  }
  if (chunk.length > 0) words.push(`=?UTF-8?B?${toBase64(Uint8Array.from(chunk))}?=`);
  return words.join(" ");
}

/**
 * Custom headers for the API: reserved ones dropped, values encoded, empty ones left out (the API
 * needs at least one character). Names are kept as given; the API treats them case-insensitively.
 * `undefined` when none is left.
 */
export function customHeaders(
  entries: Iterable<readonly [string, string]>,
): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  let any = false;
  for (const [name, value] of entries) {
    const trimmedName = name.trim();
    if (!trimmedName || isReservedHeader(trimmedName)) continue;
    const encoded = encodeHeaderValue(value);
    if (!encoded) continue;
    headers[trimmedName] = encoded;
    any = true;
  }
  return any ? headers : undefined;
}

const BASE64_CHUNK = 0x8000;

/** Standard, padded base64 of `bytes`. */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

/** Base64 of a string's UTF-8 bytes. */
export function utf8ToBase64(value: string): string {
  return toBase64(new TextEncoder().encode(value));
}

/** `type/subtype` without parameters (`text/plain; charset=utf-8` → `text/plain`). */
export function mediaType(contentType: string | null | undefined): string | undefined {
  const type = contentType?.split(";")[0]?.trim().toLowerCase();
  return type || undefined;
}

/** A Content-ID without its angle brackets (`<logo@acme>` → `logo@acme`). */
export function bareContentId(cid: string | null | undefined): string | undefined {
  const id = cid?.trim().replace(/^<|>$/g, "");
  return id || undefined;
}

/** Hex SHA-256 of `value` (Web Crypto). */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Escapes text for HTML element content and quoted attribute values. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
