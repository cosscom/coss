/**
 * The SMTP relay's message mapping: a submitted MIME message and its envelope become the same
 * `SendEmailRequest` an API send makes, so everything after it (sender authorization,
 * suppressions, quotas, tracking, screening, webhooks) is the API's path. Nothing is passed
 * through raw: the provider still gets a structured message coss.com builds.
 *
 * DB-free and server-only (`@coss/email/smtp`). Failures are SMTP replies whose text is safe to
 * show the client.
 */
import PostalMime, { addressParser } from "postal-mime";
import { formatAddresses } from "./inbound-mime.ts";
import {
  isReservedHeader,
  MAX_HEADERS,
  parseEmailAddress,
  SendEmailRequest,
  type SendEmailRequestInput,
  type SendEmailRequestOutput,
} from "./schemas.ts";
import { encodeWords } from "./ses/mime.ts";

/** An SMTP reply: basic code, enhanced status (RFC 3463) and a one-line message. */
export type SmtpReply = { code: number; status: string; message: string };

export type SmtpEnvelope = {
  /** `MAIL FROM` (ignored for sending: the provider uses its own return path). */
  mailFrom: string | null;
  /** `RCPT TO`: who actually receives the message. */
  rcptTo: readonly string[];
};

export type SmtpMessageResult =
  | { ok: true; params: SendEmailRequestOutput; idempotencyKey: string | null }
  /**
   * `reply` is for the client only (it may quote the message's addresses); `errorCode` is a
   * stable reason that is safe to log.
   */
  | { ok: false; reply: SmtpReply; errorCode: SmtpMessageErrorCode };

export type SmtpMessageErrorCode =
  | "unparsable_message"
  | "invalid_from"
  | "no_recipients"
  | "recipient_not_in_envelope"
  | "no_to_recipient"
  | "missing_subject"
  | "duplicate_header"
  | "header_too_long"
  | "too_many_headers"
  | "invalid_coss_header"
  | "invalid_message";

/** The relay's message size limit (SES's limit for a whole message), advertised as `SIZE`. */
export const SMTP_MAX_MESSAGE_BYTES = 40 * 1024 * 1024;

/** Matches the API's `Idempotency-Key` rule. */
const IDEMPOTENCY_KEY_MAX_LENGTH = 256;

/** Headers that steer coss.com itself; they are read and never sent on. */
export const COSS_HEADERS = {
  category: "x-coss-category",
  tags: "x-coss-tags",
  scheduledAt: "x-coss-scheduled-at",
  tracking: "x-coss-tracking",
  idempotencyKey: "x-coss-idempotency-key",
  subaccount: "x-coss-subaccount",
} as const;

const COSS_HEADER_NAMES: ReadonlySet<string> = new Set(Object.values(COSS_HEADERS));

/**
 * Headers mail clients and frameworks add about themselves or their transport. They are left out
 * rather than counted against the custom header limit; the provider writes its own.
 */
const CLIENT_HEADERS: ReadonlySet<string> = new Set([
  "bcc",
  "content-language",
  "content-id",
  "content-description",
  "user-agent",
  "x-mailer",
  "x-originating-ip",
  "x-php-originating-script",
  "x-ms-has-attach",
  "x-ms-tnef-correlator",
  "thread-index",
  "thread-topic",
  "x-priority-processed",
]);

/** Content types a nameless part gets a filename extension for. */
const EXTENSIONS_BY_CONTENT_TYPE: Readonly<Record<string, string>> = {
  "application/json": "json",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "message/rfc822": "eml",
  "text/calendar": "ics",
  "text/csv": "csv",
  "text/html": "html",
  "text/plain": "txt",
};

const CONTENT_TYPE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,127}\/[!#$%&'*+.^_`|~0-9A-Za-z-]{1,127}$/;
const HEADER_VALUE_MAX_LENGTH = 995;
const NON_ASCII = /\P{ASCII}/u;
const MESSAGE_ID = /<[^<>\s]+>/g;

function refuse(
  errorCode: SmtpMessageErrorCode,
  code: number,
  status: string,
  message: string,
): SmtpMessageResult {
  return { ok: false, reply: { code, status, message }, errorCode };
}

const contentError = (errorCode: SmtpMessageErrorCode, message: string) =>
  refuse(errorCode, 554, "5.6.0", message);

/** Folding whitespace (tabs, stray line breaks) becomes single spaces. */
function unfold(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}

function addressKey(value: string): string {
  return parseEmailAddress(value).address.toLowerCase();
}

/** `a=b, c=d` → tags. */
function parseTags(value: string): { name: string; value: string }[] | null {
  const tags: { name: string; value: string }[] = [];
  for (const item of value.split(",")) {
    const pair = item.trim();
    if (pair === "") continue;
    const eq = pair.indexOf("=");
    if (eq <= 0) return null;
    tags.push({ name: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() });
  }
  return tags;
}

const TRACKING_TOKENS = ["opens", "clicks", "unsubscribe"] as const;
type TrackingToken = (typeof TRACKING_TOKENS)[number];

/**
 * Any of `opens`, `clicks`, `unsubscribe` (comma-separated), or `none`: exactly those are on, the
 * others off, whatever the environment's rules say.
 */
function parseTracking(value: string): Record<TrackingToken, boolean> | null {
  const tokens = value
    .toLowerCase()
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const none = tokens.length === 1 && tokens[0] === "none";
  if (!none && !tokens.every((token) => (TRACKING_TOKENS as readonly string[]).includes(token))) {
    return null;
  }
  return {
    opens: tokens.includes("opens"),
    clicks: tokens.includes("clicks"),
    unsubscribe: tokens.includes("unsubscribe"),
  };
}

/** A header value as the send schema takes it: one ASCII line, RFC 2047 words kept encoded. */
function headerValue(name: string, raw: string): string | null {
  let value = unfold(raw);
  if (NON_ASCII.test(value)) value = encodeWords(value);
  if (value.length <= HEADER_VALUE_MAX_LENGTH - name.length) return value;
  // Long threads: keep the newest message ids that fit (the first one is the thread's root).
  if (name === "references") {
    const ids = value.match(MESSAGE_ID) ?? [];
    const root = ids[0];
    const kept: string[] = [];
    let length = root ? root.length : 0;
    for (const id of ids.slice(1).reverse()) {
      if (length + 1 + id.length > HEADER_VALUE_MAX_LENGTH - name.length) break;
      kept.unshift(id);
      length += 1 + id.length;
    }
    return [root, ...kept].filter(Boolean).join(" ") || null;
  }
  return null;
}

function attachmentFilename(name: string | null, contentType: string, index: number): string {
  const clean = name?.replace(/[/\\]/g, "_").trim();
  if (clean) return clean;
  if (contentType === "text/calendar") return "invite.ics";
  return `attachment-${index + 1}.${EXTENSIONS_BY_CONTENT_TYPE[contentType] ?? "bin"}`;
}

/** The first schema issue as one readable line (`attachments.2.filename: …`). */
function describeIssue(issue: { path: PropertyKey[]; message: string }): string {
  const path = issue.path.map(String).join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/**
 * Maps a submitted message onto a send request.
 *
 * Recipients come from the envelope: `To`/`Cc` header addresses are kept as such when they are
 * also envelope recipients, and every other envelope recipient becomes `bcc`. A header recipient
 * that isn't in the envelope is refused (coss.com can't show an address without sending to it), as is
 * a message with no `To` recipient (moving Bcc'd addresses into `To` would disclose them).
 */
export async function messageToSendRequest(input: {
  raw: Uint8Array;
  envelope: SmtpEnvelope;
}): Promise<SmtpMessageResult> {
  let email: Awaited<ReturnType<typeof PostalMime.parse>>;
  try {
    email = await PostalMime.parse(input.raw, {
      attachmentEncoding: "base64",
      maxNestingDepth: 50,
      maxHeadersSize: 1024 * 1024,
    });
  } catch {
    return contentError("unparsable_message", "The message could not be parsed as MIME.");
  }

  // Header fields, first occurrence wins for the ones coss.com reads.
  const topHeaders = email.headers;
  const headerOf = (name: string) => topHeaders.find((header) => header.key === name)?.value;

  const fromHeaders = topHeaders.filter((header) => header.key === "from");
  if (fromHeaders.length !== 1 || !fromHeaders[0]?.value) {
    return contentError("invalid_from", "The message needs exactly one From header.");
  }
  const fromAddresses = formatAddresses(addressParser(fromHeaders[0].value));
  if (fromAddresses.length !== 1 || addressParser(fromHeaders[0].value).some((a) => a.group)) {
    return contentError("invalid_from", "The From header must name exactly one mailbox.");
  }
  const from = fromAddresses[0] as string;

  const envelope = new Map<string, string>();
  for (const recipient of input.envelope.rcptTo) {
    const address = recipient.trim();
    if (address) envelope.set(address.toLowerCase(), address);
  }
  if (envelope.size === 0) return refuse("no_recipients", 554, "5.5.1", "No valid recipients.");

  const to = formatAddresses(email.to);
  const cc = formatAddresses(email.cc);
  const named = new Set<string>();
  for (const address of [...to, ...cc]) {
    const key = addressKey(address);
    if (!envelope.has(key)) {
      return refuse(
        "recipient_not_in_envelope",
        554,
        "5.5.1",
        `The message names ${parseEmailAddress(address).address} in To/Cc, but it is not an envelope recipient (RCPT TO).`,
      );
    }
    named.add(key);
  }
  if (to.length === 0) {
    return contentError(
      "no_to_recipient",
      "The message needs at least one To recipient. coss.com does not move Bcc recipients into To.",
    );
  }
  const bcc = [...envelope].filter(([key]) => !named.has(key)).map(([, address]) => address);

  const subject = email.subject === undefined ? "" : unfold(email.subject);
  if (subject === "") return contentError("missing_subject", "The message needs a Subject.");

  // Custom headers: everything coss.com or the provider doesn't own, minus client noise.
  const headers: Record<string, string> = {};
  for (const header of topHeaders) {
    const name = header.key;
    if (
      isReservedHeader(name) ||
      CLIENT_HEADERS.has(name) ||
      COSS_HEADER_NAMES.has(name) ||
      name.startsWith("content-") ||
      name.startsWith("x-coss-")
    ) {
      continue;
    }
    if (Object.hasOwn(headers, name)) {
      return contentError(
        "duplicate_header",
        `The ${header.originalKey} header appears more than once.`,
      );
    }
    const value = headerValue(name, header.value);
    if (value === null) {
      return contentError("header_too_long", `The ${header.originalKey} header is too long.`);
    }
    if (value !== "") headers[name] = value;
  }
  if (Object.keys(headers).length > MAX_HEADERS) {
    return contentError(
      "too_many_headers",
      `At most ${MAX_HEADERS} custom headers are allowed; this message has ${Object.keys(headers).length} (${Object.keys(headers).join(", ")}).`,
    );
  }

  // coss.com's own settings.
  const request: SendEmailRequestInput = {
    from,
    to,
    ...(cc.length > 0 ? { cc } : {}),
    ...(bcc.length > 0 ? { bcc } : {}),
    ...(email.replyTo ? { reply_to: formatAddresses(email.replyTo) } : {}),
    subject,
    ...(email.html ? { html: email.html } : {}),
    ...(email.text ? { text: email.text } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };
  const category = headerOf(COSS_HEADERS.category);
  if (category !== undefined) request.category = unfold(category);
  const subaccount = headerOf(COSS_HEADERS.subaccount);
  if (subaccount !== undefined) request.subaccount = unfold(subaccount).trim();
  const tags = headerOf(COSS_HEADERS.tags);
  if (tags !== undefined) {
    const parsed = parseTags(unfold(tags));
    if (!parsed)
      return contentError(
        "invalid_coss_header",
        "X-Coss-Tags must look like `name=value, name=value`.",
      );
    request.tags = parsed;
  }
  const scheduledAt = headerOf(COSS_HEADERS.scheduledAt);
  if (scheduledAt !== undefined) request.scheduled_at = unfold(scheduledAt);
  const tracking = headerOf(COSS_HEADERS.tracking);
  if (tracking !== undefined) {
    const parsed = parseTracking(unfold(tracking));
    if (!parsed) {
      return contentError(
        "invalid_coss_header",
        "X-Coss-Tracking must list `opens`, `clicks` and/or `unsubscribe`, or be `none`.",
      );
    }
    request.tracking = parsed;
  }
  const idempotencyHeader = headerOf(COSS_HEADERS.idempotencyKey);
  let idempotencyKey: string | null = null;
  if (idempotencyHeader !== undefined) {
    idempotencyKey = unfold(idempotencyHeader);
    if (idempotencyKey.length < 1 || idempotencyKey.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
      return contentError(
        "invalid_coss_header",
        `X-Coss-Idempotency-Key must be 1-${IDEMPOTENCY_KEY_MAX_LENGTH} characters.`,
      );
    }
  }

  // Attachments; an empty part has nothing to deliver.
  const attachments = email.attachments
    .filter((attachment) => typeof attachment.content === "string" && attachment.content !== "")
    .map((attachment, index) => {
      const contentType = CONTENT_TYPE.test(attachment.mimeType)
        ? attachment.mimeType.toLowerCase()
        : "application/octet-stream";
      const contentId = attachment.contentId?.replace(/^<|>$/g, "").trim();
      const inline = (attachment.disposition === "inline" || attachment.related) && contentId;
      return {
        filename: attachmentFilename(attachment.filename, contentType, index),
        content: attachment.content as string,
        content_type: contentType,
        ...(inline ? { content_id: contentId } : {}),
      };
    });
  if (attachments.length > 0) request.attachments = attachments;

  const parsed = SendEmailRequest.safeParse(request);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue ? describeIssue(issue) : "The message is not a valid email.";
    // A From address the schema refuses is a sender problem, everything else content.
    return issue?.path[0] === "from"
      ? refuse("invalid_from", 550, "5.1.7", message)
      : contentError("invalid_message", message);
  }
  return { ok: true, params: parsed.data, idempotencyKey };
}
