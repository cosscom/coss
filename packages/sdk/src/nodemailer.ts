/**
 * `coss/nodemailer`: a Nodemailer transport that sends through the coss.com API.
 *
 * ```ts
 * import nodemailer from "nodemailer";
 * import { cossTransport } from "coss/nodemailer";
 *
 * const transporter = nodemailer.createTransport(cossTransport());
 * await transporter.sendMail({ from, to, subject, html });
 * ```
 *
 * The types here describe the parts of Nodemailer the transport uses, so the SDK has no
 * dependency on it; `test/integration-types.ts` checks them against Nodemailer's own.
 */
import type { CossResult } from "./core/errors.ts";
import { CossSendError, type IntegrationClientOptions, lazyClient } from "./core/integration.ts";
import {
  bareContentId,
  customHeaders,
  formatAddress,
  mediaType,
  utf8ToBase64,
} from "./core/mime.ts";
import type {
  Email,
  EmailAttachmentParams,
  EmailTag,
  SendEmailParams,
  TrackingOptions,
} from "./types/email.ts";
import { VERSION } from "./version.ts";

export { CossSendError } from "./core/integration.ts";

/** coss.com settings for one message, passed as `coss` next to Nodemailer's own fields (see `withCoss`). */
export interface CossMessageOptions {
  /** What kind of email this is, e.g. `"marketing"`. Recipients suppressed for it are skipped. */
  category?: string;
  /** Merged with the transport's `tags`; a message tag replaces a transport tag of the same name. */
  tags?: EmailTag[];
  /** Send later: a `Date`, or an ISO 8601 date-time with an offset, at most 30 days ahead. */
  scheduledAt?: Date | string;
  tracking?: TrackingOptions;
  /**
   * Sent as `Idempotency-Key`: a retry with the same key never sends twice. Defaults to a random
   * key per `sendMail` call (still reused by the client's own retries).
   */
  idempotencyKey?: string;
}

/** Options of `cossTransport`. The coss.com fields apply to every message unless the message sets them. */
export interface CossTransportOptions extends IntegrationClientOptions {
  category?: string;
  tags?: EmailTag[];
  tracking?: TrackingOptions;
}

/** What `sendMail` resolves with. */
export interface CossSentMessageInfo {
  /** The coss.com email id (`email_…`): look it up with `coss.email.get(id)` or in the dashboard. */
  messageId: string;
  envelope: { from: string | false; to: string[] };
  /** Every envelope recipient: coss.com took the email for all of them (or none, as an error). */
  accepted: string[];
  rejected: string[];
  pending: string[];
  /** e.g. `202 queued`. */
  response: string;
  /** The email as the API returned it. */
  email: Email;
}

/** The parts of Nodemailer's `MailMessage` the transport reads. */
export interface NodemailerMailMessage {
  data: object;
  message: {
    getEnvelope(): { from: string | false; to: string[] };
  };
  normalize(callback: (err: Error | null, data?: object) => void): void;
}

/** A Nodemailer transport (`nodemailer.createTransport(cossTransport())`). */
export interface CossTransport {
  name: string;
  version: string;
  send(
    mail: NodemailerMailMessage,
    callback: (err: Error | null, info?: CossSentMessageInfo) => void,
  ): void;
  /** Checks the configuration (an API key is set) without sending anything. */
  verify(callback?: (err: Error | null, success?: true) => void): Promise<true> | undefined;
}

interface Address {
  name?: string;
  address?: string;
  group?: Address[];
}

interface Content {
  content?: unknown;
  encoding?: string;
  filename?: string | false;
  contentType?: string;
  cid?: string;
}

/** `mail.data` after `normalize()`: addresses parsed, content resolved, headers flattened. */
interface NormalizedMail {
  from?: Address | null;
  to?: Address[] | null;
  cc?: Address[] | null;
  bcc?: Address[] | null;
  replyTo?: Address[] | null;
  subject?: string;
  html?: unknown;
  text?: unknown;
  icalEvent?: Content & { method?: string };
  attachments?: Content[];
  normalizedHeaders?: Record<string, string>;
  priority?: string;
  xMailer?: string | false;
  coss?: CossMessageOptions;
}

/**
 * Adds coss.com settings to a message. Use this rather than an inline `coss` field: Nodemailer's
 * `SendMailOptions` type has no `coss` property, so an object literal with one doesn't typecheck.
 *
 * ```ts
 * await transporter.sendMail(withCoss({ from, to, subject, html }, { category: "receipts" }));
 * ```
 */
export function withCoss<T extends object>(
  mail: T,
  options: CossMessageOptions,
): T & { coss: CossMessageOptions } {
  return { ...mail, coss: options };
}

/** A Nodemailer transport that sends every message with `coss.email.send`. */
export function cossTransport(options: CossTransportOptions = {}): CossTransport {
  const client = lazyClient("nodemailer", options);
  return {
    name: "coss.com",
    version: VERSION,
    send(mail, callback) {
      send(mail).then(
        (info) => callback(null, info),
        (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
      );
    },
    verify(callback) {
      const check = async (): Promise<true> => {
        client();
        return true;
      };
      if (!callback) return check();
      check().then(
        (success) => callback(null, success),
        (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
      );
      return undefined;
    },
  };

  async function send(mail: NodemailerMailMessage): Promise<CossSentMessageInfo> {
    const raw = mail.data as Record<string, unknown>;
    // Checked before normalize(), which replaces `envelope` with the computed one.
    unsupported(raw.raw, "`raw` messages", "build the message from its fields instead");
    unsupported(raw.envelope, "a custom `envelope`", "coss.com sends to the message's recipients");
    unsupported(raw.sender, "`sender`", "coss.com sets the Sender header itself");
    unsupported(raw.amp, "AMP (`amp`) bodies", "send `html` and `text`");
    unsupported(raw.watchHtml, "`watchHtml`", "send `html` and `text`");
    if (Array.isArray(raw.alternatives) && raw.alternatives.length > 0) {
      unsupported(true, "`alternatives`", "send `html`, `text` and attachments");
    }
    // normalize() rebuilds attachments without `raw`, so it is only visible here.
    if (Array.isArray(raw.attachments) && raw.attachments.some(hasRawMime)) {
      unsupported(true, "attachments with `raw` MIME", "give `content`, `path` or `href`");
    }
    const ownHeaders = messageHeaders(raw.headers);

    const envelope = mail.message.getEnvelope();
    const data = await new Promise<NormalizedMail>((resolve, reject) => {
      mail.normalize((err, normalized) => (err ? reject(err) : resolve(normalized ?? {})));
    });
    const coss = data.coss ?? {};

    const params: SendEmailParams = {
      from: required(data.from ? addresses([data.from])[0] : undefined, "from"),
      to: addresses(data.to),
      subject: data.subject ?? "",
    };
    const cc = addresses(data.cc);
    if (cc.length > 0) params.cc = cc;
    const bcc = addresses(data.bcc);
    if (bcc.length > 0) params.bcc = bcc;
    const replyTo = addresses(data.replyTo);
    if (replyTo.length > 0) params.reply_to = replyTo;
    if (typeof data.html === "string" && data.html) params.html = data.html;
    if (typeof data.text === "string" && data.text) params.text = data.text;

    const attachments = (data.attachments ?? []).map(attachment);
    if (data.icalEvent) attachments.push(icalAttachment(data.icalEvent));
    if (attachments.length > 0) params.attachments = attachments;

    // normalize() keys `normalizedHeaders` by `Object.keys(headers)`, so the array form comes out
    // as "0", "1", …: the message's own headers are read above, and only the ones Nodemailer
    // derives (List-*, References, In-Reply-To) are taken from it.
    const derived = Object.entries(data.normalizedHeaders ?? {}).filter(
      ([name]) => !ownHeaders.names.has(name),
    );
    const headers = customHeaders([
      ...ownHeaders.entries,
      ...derived,
      ...priorityHeaders(data.priority),
      ...(typeof data.xMailer === "string" ? [["X-Mailer", data.xMailer] as const] : []),
    ]);
    if (headers) params.headers = headers;

    const category = coss.category ?? options.category;
    if (category) params.category = category;
    const tags = mergeTags(options.tags, coss.tags);
    if (tags) params.tags = tags;
    const tracking = coss.tracking ?? options.tracking;
    if (tracking) params.tracking = tracking;
    if (coss.scheduledAt) {
      params.scheduled_at =
        coss.scheduledAt instanceof Date ? coss.scheduledAt.toISOString() : coss.scheduledAt;
    }

    const result: CossResult<Email> = await client().email.send(params, {
      idempotencyKey: coss.idempotencyKey,
    });
    if (result.error) throw new CossSendError(result.error);
    return {
      messageId: result.data.id,
      envelope: { from: envelope.from, to: envelope.to },
      accepted: [...envelope.to],
      rejected: [],
      pending: [],
      response: `202 ${result.data.status}`,
      email: result.data,
    };
  }
}

function unsupported(value: unknown, what: string, instead: string): void {
  if (value === undefined || value === null || value === false || value === "") return;
  throw new Error(`coss/nodemailer: ${what} can't be sent through coss.com; ${instead}.`);
}

function hasRawMime(attachment: unknown): boolean {
  if (!attachment || typeof attachment !== "object" || !("raw" in attachment)) return false;
  return attachment.raw !== undefined && attachment.raw !== null && attachment.raw !== false;
}

function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`coss/nodemailer: the message has no \`${field}\`.`);
  return value;
}

/**
 * A message's `headers` (an object, or Nodemailer's `[{ key, value }]` array form) as name/value
 * pairs, plus the keys normalize() files them under. coss.com sends each header once, so one
 * given several values is refused rather than sent with only the first.
 */
function messageHeaders(headers: unknown): {
  entries: [string, string][];
  names: Set<string>;
} {
  const entries: [string, string][] = [];
  const names = new Set<string>();
  if (!headers || typeof headers !== "object") return { entries, names };
  const pairs: [string, unknown][] = Array.isArray(headers)
    ? headers.map((entry: { key?: unknown; value?: unknown } | null) => [
        typeof entry?.key === "string" ? entry.key : "",
        entry?.value,
      ])
    : Object.entries(headers);
  for (const key of Object.keys(headers)) names.add(key);
  const seen = new Set<string>();
  for (const [name, given] of pairs) {
    const values = (Array.isArray(given) ? given : [given])
      .map((value: unknown) =>
        value && typeof value === "object" && "value" in value ? value.value : value,
      )
      .filter((value) => value !== undefined && value !== null && value !== false && value !== "");
    if (!name || values.length === 0) continue;
    const lower = name.trim().toLowerCase();
    if (values.length > 1 || seen.has(lower)) {
      throw new Error(
        `coss/nodemailer: the \`${name}\` header is given more than once; coss.com sends each header once.`,
      );
    }
    seen.add(lower);
    entries.push([name, String(values[0])]);
  }
  return { entries, names };
}

/** Parsed addresses (groups flattened) as `Name <addr>` strings. */
function addresses(list: Address[] | null | undefined): string[] {
  const out: string[] = [];
  for (const entry of list ?? []) {
    if (entry.group) out.push(...addresses(entry.group));
    else if (entry.address) out.push(formatAddress(entry.address, entry.name));
  }
  return out;
}

function attachment(file: Content, index: number): EmailAttachmentParams {
  const params: EmailAttachmentParams = {
    filename: typeof file.filename === "string" ? file.filename : `attachment-${index + 1}`,
    content: base64Content(file),
  };
  const contentType = mediaType(file.contentType);
  if (contentType) params.content_type = contentType;
  const contentId = bareContentId(file.cid);
  if (contentId) params.content_id = contentId;
  return params;
}

function icalAttachment(event: Content): EmailAttachmentParams {
  return {
    filename: typeof event.filename === "string" ? event.filename : "invite.ics",
    content: base64Content(event),
    content_type: "text/calendar",
  };
}

/** After normalize(), content is base64 (it was binary) or a UTF-8 string. */
function base64Content(file: Content): string {
  const content = file.content;
  if (content === undefined || content === null) return "";
  if (typeof content !== "string") {
    throw new Error("coss/nodemailer: an attachment's content could not be read.");
  }
  return file.encoding?.toLowerCase() === "base64"
    ? content.replace(/\s+/g, "")
    : utf8ToBase64(content);
}

/** The headers Nodemailer adds for `priority` (it adds them to the MIME tree, not `normalizedHeaders`). */
function priorityHeaders(priority: string | undefined): [string, string][] {
  switch (priority?.toLowerCase()) {
    case "high":
      return [
        ["X-Priority", "1 (Highest)"],
        ["X-MSMail-Priority", "High"],
        ["Importance", "High"],
      ];
    case "low":
      return [
        ["X-Priority", "5 (Lowest)"],
        ["X-MSMail-Priority", "Low"],
        ["Importance", "Low"],
      ];
    default:
      return [];
  }
}

function mergeTags(
  defaults: EmailTag[] | undefined,
  message: EmailTag[] | undefined,
): EmailTag[] | undefined {
  if (!defaults?.length && !message?.length) return undefined;
  const byName = new Map<string, EmailTag>();
  for (const tag of [...(defaults ?? []), ...(message ?? [])]) byName.set(tag.name, tag);
  return [...byName.values()];
}
