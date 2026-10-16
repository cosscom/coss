/**
 * Received messages: parsing raw MIME (postal-mime: zero dependencies, Web APIs only), the
 * header scrubbing that keeps one environment's copy from naming another's envelope recipients,
 * and a builder for test messages (the dashboard's simulator, tests).
 */
import { createHash, randomBytes } from "node:crypto";
import PostalMime, { type Address, type Mailbox } from "postal-mime";
import { encodeAddress, encodeWords } from "./ses/mime.ts";

/** Stored `text`/`html` are cut to this many characters each (the raw message stays whole). */
export const RECEIVED_BODY_MAX_LENGTH = 2 * 1024 * 1024;
/** Stored headers stop once their names and values add up to this many characters. */
export const RECEIVED_HEADERS_MAX_LENGTH = 64 * 1024;
/** A header value is cut to this many characters when stored. */
const HEADER_VALUE_MAX_LENGTH = 8 * 1024;
const REFERENCES_MAX = 100;

export type ParsedAttachment = {
  filename: string | null;
  contentType: string;
  contentId: string | null;
  disposition: "attachment" | "inline";
  content: Uint8Array;
  size: number;
  sha256: string;
};

export type ParsedInboundMessage = {
  from: string | null;
  to: string[];
  cc: string[];
  replyTo: string[];
  subject: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  sentAt: Date | null;
  headers: { name: string; value: string }[];
  text: string | null;
  html: string | null;
  truncated: boolean;
  attachments: ParsedAttachment[];
};

// PostgreSQL text and JSONB cannot contain NUL. Keep the original bytes in the content store.
function databaseText(value: string): string {
  return value.replaceAll("\0", "");
}

// Postal-mime preserves malformed media types. S3 sends this value as an HTTP header,
// so accept only bounded ASCII type/subtype tokens; preserve the original in raw.eml.
const CONTENT_TYPE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,127}\/[!#$%&'*+.^_`|~0-9A-Za-z-]{1,127}$/;

function attachmentContentType(value: string): string {
  return CONTENT_TYPE.test(value) ? value.toLowerCase() : "application/octet-stream";
}

const QUOTE_NEEDED = /["<>,;:@()[\]\\]/;

function formatMailbox(name: string, address: string): string {
  address = databaseText(address);
  const cleanName = databaseText(name)
    .replace(/\p{Cc}/gu, " ")
    .trim();
  if (!cleanName) return address;
  const display = QUOTE_NEEDED.test(cleanName)
    ? `"${cleanName.replace(/["\\]/g, "\\$&")}"`
    : cleanName;
  return `${display} <${address}>`;
}

export function formatAddresses(addresses: readonly Address[] | Address | undefined): string[] {
  if (!addresses) return [];
  const list = Array.isArray(addresses) ? addresses : [addresses];
  return list.flatMap((entry) =>
    entry.group
      ? entry.group.map((member: Mailbox) => formatMailbox(member.name, member.address))
      : entry.address
        ? [formatMailbox(entry.name, entry.address)]
        : [],
  );
}

/** Keep the UTF-16 limit without splitting a Unicode surrogate pair. */
function truncate(value: string, max: number): string {
  const last = value.charCodeAt(max - 1);
  const next = value.charCodeAt(max);
  const splitsPair = last >= 0xd800 && last <= 0xdbff && next >= 0xdc00 && next <= 0xdfff;
  return value.slice(0, splitsPair ? max - 1 : max);
}

function cut(value: string | undefined, max: number): { value: string | null; cut: boolean } {
  if (value === undefined) return { value: null, cut: false };
  value = databaseText(value);
  if (value.length <= max) return { value, cut: false };
  return { value: truncate(value, max), cut: true };
}

function bytesOf(content: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (typeof content === "string") return new TextEncoder().encode(content);
  return content instanceof Uint8Array ? content : new Uint8Array(content);
}

function messageIds(value: string | undefined): string[] {
  if (!value) return [];
  return (databaseText(value).match(/<[^<>\s]+>/g) ?? []).slice(0, REFERENCES_MAX);
}

/** An empty result for a message the parser rejects (only the raw message is kept then). */
function unparsed(): ParsedInboundMessage {
  return {
    from: null,
    to: [],
    cc: [],
    replyTo: [],
    subject: null,
    messageId: null,
    inReplyTo: null,
    references: [],
    sentAt: null,
    headers: [],
    text: null,
    html: null,
    truncated: false,
    attachments: [],
  };
}

/**
 * Parses a received message. Never throws: a message the parser rejects (nesting or header
 * limits) is returned with no fields, and its raw message is all the customer gets.
 */
export async function parseInboundMessage(raw: Uint8Array): Promise<ParsedInboundMessage> {
  let email: Awaited<ReturnType<typeof PostalMime.parse>>;
  try {
    email = await PostalMime.parse(raw, { attachmentEncoding: "arraybuffer" });
  } catch (error) {
    console.error("[email:inbound] could not parse a received message:", error);
    return unparsed();
  }
  let truncated = false;
  const headers: { name: string; value: string }[] = [];
  let headerLength = 0;
  for (const header of email.headers) {
    const cleanValue = databaseText(header.value);
    const name = databaseText(header.originalKey);
    const value = truncate(cleanValue, HEADER_VALUE_MAX_LENGTH);
    if (value.length < cleanValue.length) truncated = true;
    headerLength += name.length + value.length;
    if (headerLength > RECEIVED_HEADERS_MAX_LENGTH) {
      truncated = true;
      break;
    }
    headers.push({ name, value });
  }
  const text = cut(email.text, RECEIVED_BODY_MAX_LENGTH);
  const html = cut(email.html, RECEIVED_BODY_MAX_LENGTH);
  if (text.cut || html.cut) truncated = true;
  const sentAt = email.date ? new Date(email.date) : null;
  return {
    from: formatAddresses(email.from)[0] ?? null,
    to: formatAddresses(email.to),
    cc: formatAddresses(email.cc),
    replyTo: formatAddresses(email.replyTo),
    subject: email.subject === undefined ? null : databaseText(email.subject),
    messageId: email.messageId === undefined ? null : databaseText(email.messageId),
    inReplyTo: email.inReplyTo === undefined ? null : databaseText(email.inReplyTo),
    references: messageIds(email.references),
    sentAt: sentAt && !Number.isNaN(sentAt.getTime()) ? sentAt : null,
    headers,
    text: text.value,
    html: html.value,
    truncated,
    attachments: email.attachments.map((attachment) => {
      const content = bytesOf(attachment.content);
      return {
        filename: attachment.filename === null ? null : databaseText(attachment.filename),
        contentType: attachmentContentType(attachment.mimeType),
        contentId: attachment.contentId
          ? databaseText(attachment.contentId).replace(/^<|>$/g, "") || null
          : null,
        disposition: attachment.disposition === "inline" ? "inline" : "attachment",
        content,
        size: content.byteLength,
        sha256: createHash("sha256").update(content).digest("hex"),
      };
    }),
  };
}

/**
 * Headers the receiving provider adds that may name *every* envelope recipient of the message:
 * SES's receipt blob and its signature. One environment's copy never carries them.
 */
const PROVIDER_RECEIPT_HEADERS = new Set(["x-ses-receipt", "x-ses-dkim-signature"]);

/** `Received: … for <address>;` clauses that name an address outside `keep`. */
function scrubReceived(value: string, keep: ReadonlySet<string>): string {
  return value.replace(/\sfor\s+<?([^\s<>;]+@[^\s<>;]+)>?(?=\s*;)/gi, (clause, address: string) =>
    keep.has(address.toLowerCase()) ? clause : "",
  );
}

function headerEnd(raw: Uint8Array): number {
  for (let i = 0; i < raw.length - 1; i++) {
    if (raw[i] === 0x0a && raw[i + 1] === 0x0a) return i + 1;
    if (raw[i] === 0x0a && raw[i + 1] === 0x0d && raw[i + 2] === 0x0a) return i + 1;
  }
  return -1;
}

/**
 * One environment's copy of a shared message: drops the provider's receipt headers and the
 * `for <address>` clauses of `Received` headers that name another environment's recipients
 * (Bcc'd addresses of other organizations included). Only header lines added on receipt are
 * touched, so the sender's signatures still verify; the body bytes are kept as they are.
 */
export function scrubEnvelopeHeaders(raw: Uint8Array, recipients: readonly string[]): Uint8Array {
  const end = headerEnd(raw);
  if (end < 0) return raw;
  // latin1 maps every byte to one character, so the header block round-trips unchanged.
  const head = Buffer.from(raw.subarray(0, end)).toString("latin1");
  const keep = new Set(recipients.map((address) => address.toLowerCase()));
  const fields: string[] = [];
  for (const line of head.split(/(?<=\n)/)) {
    if (/^[ \t]/.test(line) && fields.length > 0) fields[fields.length - 1] += line;
    else fields.push(line);
  }
  let changed = false;
  const kept = fields.flatMap((field) => {
    const name = field.slice(0, field.indexOf(":")).trim().toLowerCase();
    if (PROVIDER_RECEIPT_HEADERS.has(name)) {
      changed = true;
      return [];
    }
    if (name !== "received") return [field];
    const scrubbed = scrubReceived(field, keep);
    if (scrubbed !== field) changed = true;
    return [scrubbed];
  });
  if (!changed) return raw;
  const newHead = Buffer.from(kept.join(""), "latin1");
  const out = new Uint8Array(newHead.length + raw.length - end);
  out.set(newHead, 0);
  out.set(raw.subarray(end), newHead.length);
  return out;
}

/** The same scrubbing for already-parsed headers (what `received_email.headers` stores). */
export function scrubParsedHeaders(
  headers: readonly { name: string; value: string }[],
  recipients: readonly string[],
): { name: string; value: string }[] {
  const keep = new Set(recipients.map((address) => address.toLowerCase()));
  return headers.flatMap((header) => {
    const name = header.name.toLowerCase();
    if (PROVIDER_RECEIPT_HEADERS.has(name)) return [];
    return name === "received"
      ? [{ ...header, value: scrubReceived(header.value, keep) }]
      : [header];
  });
}

export type TestMessageAttachment = { filename: string; contentType: string; content: Uint8Array };

function base64Lines(content: Uint8Array): string {
  return (
    Buffer.from(content)
      .toString("base64")
      .match(/.{1,76}/g) ?? []
  ).join("\r\n");
}

function encodeHeaderText(value: string): string {
  return /\P{ASCII}/u.test(value) ? encodeWords(value) : value;
}

/** A small, valid MIME message (simulated receipts in development and tests). */
export function buildTestMessage(input: {
  from: string;
  to: readonly string[];
  cc?: readonly string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: readonly TestMessageAttachment[];
  messageId?: string;
  date?: Date;
}): Uint8Array {
  const boundary = (suffix: string) => `coss-${randomBytes(8).toString("hex")}-${suffix}`;
  const mixed = boundary("mixed");
  const alternative = boundary("alt");
  const domain = input.from.slice(input.from.lastIndexOf("@") + 1).replace(/>$/, "");
  const lines = [
    `From: ${encodeAddress(input.from)}`,
    `To: ${input.to.map(encodeAddress).join(", ")}`,
    ...(input.cc && input.cc.length > 0 ? [`Cc: ${input.cc.map(encodeAddress).join(", ")}`] : []),
    `Subject: ${encodeHeaderText(input.subject)}`,
    `Message-ID: ${input.messageId ?? `<${randomBytes(12).toString("hex")}@${domain}>`}`,
    `Date: ${(input.date ?? new Date()).toUTCString()}`,
    ...Object.entries(input.headers ?? {}).map(([name, value]) => `${name}: ${value}`),
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    "",
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alternative}"`,
    "",
  ];
  const parts: [string, string][] = [];
  if (input.text !== undefined) parts.push(["text/plain", input.text]);
  if (input.html !== undefined) parts.push(["text/html", input.html]);
  if (parts.length === 0) parts.push(["text/plain", ""]);
  for (const [type, body] of parts) {
    lines.push(
      `--${alternative}`,
      `Content-Type: ${type}; charset=utf-8`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(new TextEncoder().encode(body)),
    );
  }
  lines.push(`--${alternative}--`);
  for (const attachment of input.attachments ?? []) {
    const filename = attachment.filename.replace(/["\\\r\n]/g, "_");
    lines.push(
      `--${mixed}`,
      `Content-Type: ${attachment.contentType}; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(attachment.content),
    );
  }
  lines.push(`--${mixed}--`, "");
  return new TextEncoder().encode(lines.join("\r\n"));
}
