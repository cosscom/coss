/**
 * Public wire schemas for the email product (snake_case). Plain zod with `.meta({ id })` so the
 * public API, its OpenAPI document and contract tests share one definition. Must not import the
 * database: `@coss/email/schemas` is safe to load anywhere.
 */
import { ACCOUNT_EVENT_TYPES } from "@coss/reputation/schemas";
import { LATEST_API_VERSION } from "@coss/versioning";
import { z } from "zod";

export const MAX_RECIPIENTS = 50;
export const MAX_HEADERS = 15;
export const MAX_TAGS = 50;
export const SUBJECT_MAX_LENGTH = 998;
/** How far ahead `scheduled_at` may be. */
export const MAX_SCHEDULE_AHEAD_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_ATTACHMENTS = 20;
/** Decoded bytes across every attachment of one email (SES caps the whole message at 40 MB). */
export const MAX_ATTACHMENTS_BYTES = 25 * 1024 * 1024;
/** Emails per `POST /v1/emails/batch` request. */
export const MAX_BATCH_EMAILS = 100;
const FILENAME_MAX_LENGTH = 255;

const ADDRESS_MAX_LENGTH = 254;
const DISPLAY_NAME_MAX_LENGTH = 256;

// C0 (incl. CR, LF, NUL, TAB), DEL and C1 controls: header injection and display spoofing vectors.
const CONTROL_CHARACTERS = /\p{Cc}/u;
// Invisible format characters (bidi overrides, zero-width joiners…) and line/paragraph separators.
const FORMAT_CHARACTERS = /[\p{Cf}\p{Zl}\p{Zp}]/u;
const NON_ASCII = /\P{ASCII}/u;
const NAME_ADDR = /^(.*?)\s*<([^<>]*)>$/;
const QUOTED_NAME = /^"(?:[^"\\]|\\.)*"$/;
// RFC 5322 specials (minus "."): unquoted, they change how the address is parsed downstream.
const UNQUOTED_NAME_SPECIALS = /["<>,;:@()[\]\\]/;
const HEADER_NAME = /^[!-9;-~]{1,126}$/;
const HEADER_VALUE = /^[ -~]{1,995}$/;
// SES limit for one header (name + value), which keeps the folded line within RFC 5322's 998.
const HEADER_LINE_MAX_LENGTH = 996;
const TAG_PART = /^[A-Za-z0-9_-]{1,256}$/;
const CATEGORY = TAG_PART;
// RFC 2045 `type/subtype` tokens, without parameters.
const CONTENT_TYPE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
// The `cid:` reference without angle brackets (an RFC 5322 dot-atom-ish msg-id).
const CONTENT_ID = /^[A-Za-z0-9!#$%&'*+\-./=?^_`{|}~@]{1,100}$/;

/** File extensions SES refuses to send (https://docs.aws.amazon.com/ses/latest/dg/attachments.html). */
const BLOCKED_ATTACHMENT_EXTENSIONS: ReadonlySet<string> = new Set(
  (
    "ade adp app asp bas bat cer chm cmd com cpl crt csh der exe fxp gadget hlp hta inf ins isp " +
    "its js jse ksh lib lnk mad maf mag mam maq mar mas mat mau mav maw mda mdb mde mdt mdw mdz " +
    "msc msh msh1 msh2 mshxml msh1xml msh2xml msi msp mst ops pcd pif plg prf prg reg scf scr " +
    "sct shb shs sys ps1 ps1xml ps2 ps2xml psc1 psc2 tmp url vb vbe vbs vps vsmacros vss vst " +
    "vsw vxd ws wsc wsf wsh xnk"
  ).split(" "),
);

/** Content types filled in from the file extension when the caller sends none. */
const CONTENT_TYPES_BY_EXTENSION: Readonly<Record<string, string>> = {
  csv: "text/csv",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  gif: "image/gif",
  html: "text/html",
  ics: "text/calendar",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  json: "application/json",
  pdf: "application/pdf",
  png: "image/png",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  svg: "image/svg+xml",
  txt: "text/plain",
  webp: "image/webp",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
}

/**
 * Canonical base64: padded, no whitespace or data: URL prefix. A plain scan, because regex
 * engines give up on multi-megabyte strings.
 */
export function isCanonicalBase64(value: string): boolean {
  if (value.length % 4 !== 0) return false;
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  for (let i = 0; i < value.length - padding; i++) {
    const c = value.charCodeAt(i);
    const valid =
      (c >= 65 && c <= 90) || // A-Z
      (c >= 97 && c <= 122) || // a-z
      (c >= 48 && c <= 57) || // 0-9
      c === 43 || // +
      c === 47; // /
    if (!valid) return false;
  }
  return true;
}

/** Decoded size of canonical base64, without decoding it. */
export function base64DecodedSize(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

/** The suppression scope that matches every email, whatever its category. */
export const ALL_CATEGORIES = "*";

/** Headers COSS (or the provider) owns. `x-ses-*` is matched by prefix. */
export const RESERVED_HEADERS: ReadonlySet<string> = new Set([
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

export function isReservedHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return RESERVED_HEADERS.has(lower) || lower.startsWith("x-ses-");
}

export type ParsedEmailAddress = { name: string | null; address: string };

/**
 * Splits `addr`, `Name <addr>` or `"Name" <addr>` (whitespace-trimmed). Structural only; use
 * `emailAddressProblem` to validate.
 */
export function parseEmailAddress(value: string): ParsedEmailAddress {
  const trimmed = value.trim();
  const match = NAME_ADDR.exec(trimmed);
  if (!match) return { name: null, address: trimmed };
  return { name: match[1] || null, address: match[2]?.trim() ?? "" };
}

const strictEmail = z.email();

/** Why `value` is not an acceptable address, or `null` if it is. */
export function emailAddressProblem(value: string): string | null {
  if (CONTROL_CHARACTERS.test(value)) {
    return "Must not contain control characters (CR, LF, NUL, …).";
  }
  const { name, address } = parseEmailAddress(value);
  if (name !== null) {
    if (name.length > DISPLAY_NAME_MAX_LENGTH) {
      return `Display names can be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`;
    }
    if (FORMAT_CHARACTERS.test(name)) {
      return "Display names must not contain invisible formatting characters.";
    }
    if (!QUOTED_NAME.test(name) && UNQUOTED_NAME_SPECIALS.test(name)) {
      return 'Display names containing " < > , ; : @ ( ) [ ] or \\ must be quoted, e.g. "Acme, Inc." <hello@acme.com>.';
    }
  }
  if (address.length > ADDRESS_MAX_LENGTH) {
    return `Email addresses can be at most ${ADDRESS_MAX_LENGTH} characters.`;
  }
  const at = address.lastIndexOf("@");
  if (at > 0 && NON_ASCII.test(address.slice(0, at))) {
    return "Non-ASCII characters before the @ are not supported.";
  }
  if (at > 0 && NON_ASCII.test(address.slice(at + 1))) {
    return "Internationalized domains must be punycode-encoded (xn--…).";
  }
  if (!strictEmail.safeParse(address).success) {
    return 'Must be an email address like "hello@acme.com" or "Acme <hello@acme.com>".';
  }
  return null;
}

/** Normalized address used to count distinct recipients. */
function addressKey(value: string): string {
  return parseEmailAddress(value).address.toLowerCase();
}

function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (typeof value === "string" ? [value] : value).map((item) => item.trim());
}

const EmailAddress = z
  .string()
  .superRefine((value, ctx) => {
    const problem = emailAddressProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .meta({
    description: 'An email address, optionally with a display name: "Acme <hello@acme.com>".',
  });

/**
 * One address or a list. Kept free of transforms: zod reports the matching branch's precise
 * issues (e.g. `to[2]`) only while those issues are non-aborting.
 */
function addressList(minItems: number) {
  return z.union(
    [
      EmailAddress,
      z
        .array(EmailAddress)
        .min(minItems, "Provide at least one recipient.")
        .max(MAX_RECIPIENTS, `At most ${MAX_RECIPIENTS} addresses are allowed.`),
    ],
    { error: "Expected an email address or an array of email addresses." },
  );
}

const TagPart = z
  .string()
  .regex(TAG_PART, "Must be 1-256 characters: ASCII letters, numbers, underscores or dashes.");

const Tag = z.strictObject({ name: TagPart, value: TagPart });

const Category = z
  .string()
  .regex(CATEGORY, "Must be 1-256 characters: ASCII letters, numbers, underscores or dashes.");

const Attachment = z
  .strictObject({
    filename: z
      .string()
      .min(1, "Filename must not be empty.")
      .max(FILENAME_MAX_LENGTH, `Filenames can be at most ${FILENAME_MAX_LENGTH} characters.`)
      .superRefine((value, ctx) => {
        const extension = fileExtension(value);
        let message: string | null = null;
        if (CONTROL_CHARACTERS.test(value) || FORMAT_CHARACTERS.test(value)) {
          message = "Filenames must not contain control or invisible formatting characters.";
        } else if (value.includes("/") || value.includes("\\")) {
          message = "Filenames must not contain / or \\.";
        } else if (extension === "" || value.endsWith(".")) {
          message = 'Filenames need an extension, e.g. "invoice.pdf".';
        } else if (BLOCKED_ATTACHMENT_EXTENSIONS.has(extension)) {
          message = `Attachments with the .${extension} extension cannot be sent.`;
        }
        if (message) ctx.addIssue({ code: "custom", message });
      }),
    content: z
      .string()
      .min(1, "Content must not be empty.")
      .refine(isCanonicalBase64, "Must be base64-encoded (no whitespace or data: prefix).")
      .meta({ description: "The file's bytes, base64-encoded." }),
    content_type: z
      .string()
      .regex(CONTENT_TYPE, 'Must be a media type like "application/pdf", without parameters.')
      .optional()
      .meta({ description: "Defaults from the filename's extension." }),
    content_id: z
      .string()
      .regex(
        CONTENT_ID,
        "Must be 1-100 characters without spaces or angle brackets, e.g. logo@acme.",
      )
      .optional()
      .meta({
        description:
          'Makes the attachment inline: reference it from `html` as `<img src="cid:logo@acme">`.',
      }),
  })
  .meta({ id: "SendEmailAttachment" });
export const TrackingOptions = z
  .strictObject({
    opens: z.boolean().optional().meta({
      description: "Add an invisible pixel to the HTML body and record `email.opened` events.",
    }),
    clicks: z
      .boolean()
      .optional()
      .meta({
        description:
          "Send HTML links through a COSS redirect and record `email.clicked` events. Links with a " +
          "`data-coss-no-track` attribute are left alone.",
      }),
  })
  .meta({
    id: "TrackingOptions",
    description:
      "Overrides the environment's tracking settings (its default, or the rule for this " +
      "email's category) for this email. Omitted fields keep the configured setting.",
  });

export type TrackingOptionsOutput = z.output<typeof TrackingOptions>;

const ScheduledAt = z.iso.datetime({
  offset: true,
  error: "Expected an ISO 8601 date-time with a time zone offset.",
});

const TOO_FAR_AHEAD_MESSAGE = "An email can be scheduled at most 30 days ahead.";

function tooFarAhead(scheduledAt: string): boolean {
  return Date.parse(scheduledAt) > Date.now() + MAX_SCHEDULE_AHEAD_MS;
}

const SendEmailRequestFields = z.strictObject({
  from: EmailAddress,
  to: addressList(1),
  cc: addressList(0).optional(),
  bcc: addressList(0).optional(),
  reply_to: addressList(0).optional(),
  subject: z
    .string()
    .min(1, "Subject must not be empty.")
    .max(SUBJECT_MAX_LENGTH, `Subject can be at most ${SUBJECT_MAX_LENGTH} characters.`)
    .refine((value) => !CONTROL_CHARACTERS.test(value), {
      message: "Subject must not contain control characters (CR, LF, NUL, …).",
    })
    .refine((value) => !FORMAT_CHARACTERS.test(value), {
      message: "Subject must not contain invisible formatting characters.",
    }),
  html: z.string().optional().meta({ description: "HTML body. Provide `html`, `text`, or both." }),
  text: z.string().optional().meta({ description: "Plain-text body." }),
  headers: z
    // zod skips `__proto__` keys (prototype-pollution guard), which would silently drop such a
    // header; reject it explicitly while the raw object is still visible.
    .preprocess(
      (raw: Record<string, string>, ctx) => {
        if (raw !== null && typeof raw === "object" && Object.hasOwn(raw, "__proto__")) {
          ctx.addIssue({ code: "custom", path: ["__proto__"], message: "Invalid header name." });
        }
        return raw;
      },
      z.record(z.string(), z.string()).superRefine((headers, ctx) => {
        const entries = Object.entries(headers);
        if (entries.length > MAX_HEADERS) {
          ctx.addIssue({
            code: "custom",
            message: `At most ${MAX_HEADERS} custom headers are allowed.`,
          });
        }
        const seen = new Set<string>();
        for (const [name, value] of entries) {
          const lower = name.toLowerCase();
          if (!HEADER_NAME.test(name)) {
            ctx.addIssue({
              code: "custom",
              path: [name],
              message:
                "Header names must be 1-126 printable ASCII characters without spaces or colons.",
            });
          } else if (isReservedHeader(name)) {
            ctx.addIssue({
              code: "custom",
              path: [name],
              message: `The "${name}" header is set by COSS and cannot be overridden.`,
            });
          } else if (seen.has(lower)) {
            ctx.addIssue({
              code: "custom",
              path: [name],
              message: `Duplicate header "${name}" (header names are case-insensitive).`,
            });
          }
          seen.add(lower);
          if (!HEADER_VALUE.test(value)) {
            ctx.addIssue({
              code: "custom",
              path: [name],
              message:
                "Header values must be 1-995 printable ASCII characters without line breaks.",
            });
          } else if (name.length + value.length > HEADER_LINE_MAX_LENGTH) {
            ctx.addIssue({
              code: "custom",
              path: [name],
              message: `A header's name and value can be at most ${HEADER_LINE_MAX_LENGTH} characters combined.`,
            });
          }
        }
      }),
    )
    .optional()
    .meta({ description: `Up to ${MAX_HEADERS} custom headers. Names are case-insensitive.` }),
  tags: z
    .array(Tag)
    .max(MAX_TAGS, `At most ${MAX_TAGS} tags are allowed.`)
    .superRefine((tags, ctx) => {
      const seen = new Set<string>();
      for (const [index, tag] of tags.entries()) {
        if (seen.has(tag.name)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "name"],
            message: `Duplicate tag name "${tag.name}".`,
          });
        }
        seen.add(tag.name);
      }
    })
    .optional(),
  category: Category.optional().meta({
    description:
      'What kind of email this is, e.g. "marketing". Recipients suppressed for this category ' +
      "(or for every email) are skipped.",
  }),
  scheduled_at: ScheduledAt.optional().meta({
    description:
      "Send the email at this time instead of now (ISO 8601 with an offset, at most 30 days " +
      "ahead). A time that is not in the future sends immediately. Scheduled emails can be " +
      "rescheduled or canceled until they are sent.",
    example: "2026-10-11T09:00:00Z",
  }),
  attachments: z
    .array(Attachment)
    .max(MAX_ATTACHMENTS, `At most ${MAX_ATTACHMENTS} attachments are allowed.`)
    .superRefine((attachments, ctx) => {
      const seen = new Set<string>();
      let total = 0;
      for (const [index, attachment] of attachments.entries()) {
        // Issues on a single attachment don't abort, so fields may still be invalid here.
        if (typeof attachment.content === "string" && isCanonicalBase64(attachment.content)) {
          total += base64DecodedSize(attachment.content);
        }
        const contentId = attachment.content_id;
        if (contentId === undefined) continue;
        if (seen.has(contentId)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "content_id"],
            message: `Duplicate content_id "${contentId}".`,
          });
        }
        seen.add(contentId);
      }
      if (total > MAX_ATTACHMENTS_BYTES) {
        ctx.addIssue({
          code: "custom",
          message: `Attachments can be at most ${MAX_ATTACHMENTS_BYTES / 1024 / 1024} MB combined (decoded).`,
        });
      }
    })
    .optional()
    .meta({
      description: `Up to ${MAX_ATTACHMENTS} files, at most ${MAX_ATTACHMENTS_BYTES / 1024 / 1024} MB combined.`,
    }),
  tracking: TrackingOptions.optional(),
});

export const SendEmailRequest = SendEmailRequestFields.superRefine((value, ctx) => {
  // Runs after every field parsed with at most non-aborting issues, so types are as declared.
  const lists = [asList(value.to), asList(value.cc), asList(value.bcc)];
  // A single oversized list already has its own issue.
  const withinFieldLimits = lists.every((list) => list.length <= MAX_RECIPIENTS);
  const unique = new Set(lists.flat().map(addressKey));
  if (withinFieldLimits && unique.size > MAX_RECIPIENTS) {
    ctx.addIssue({
      code: "custom",
      path: ["to"],
      message: `An email can have at most ${MAX_RECIPIENTS} unique recipients across to, cc and bcc.`,
    });
  }
  if (!value.html && !value.text) {
    ctx.addIssue({ code: "custom", path: ["html"], message: "Provide `html`, `text`, or both." });
  }
  if (value.scheduled_at !== undefined && tooFarAhead(value.scheduled_at)) {
    ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: TOO_FAR_AHEAD_MESSAGE });
  }
})
  // Only runs on fully valid input: recipients become arrays, header names lower-case, and every
  // key is present, which also makes the canonical request hash independent of how input was spelled.
  .transform((value) => ({
    from: value.from.trim(),
    to: asList(value.to),
    cc: asList(value.cc),
    bcc: asList(value.bcc),
    reply_to: asList(value.reply_to),
    subject: value.subject,
    html: value.html || null,
    text: value.text || null,
    headers: Object.fromEntries(
      Object.entries(value.headers ?? {}).map(([name, headerValue]) => [
        name.toLowerCase(),
        headerValue,
      ]),
    ),
    tags: value.tags ?? [],
    // Absent rather than `null` without a category, so request hashes from before categories
    // existed stay valid for idempotent retries.
    ...(value.category === undefined ? {} : { category: value.category }),
    // Same for `scheduled_at`, normalized to UTC so equivalent offsets hash alike.
    ...(value.scheduled_at === undefined
      ? {}
      : { scheduled_at: new Date(value.scheduled_at).toISOString() }),
    // Absent when there are none, for the same reason.
    ...(value.attachments?.length
      ? {
          attachments: value.attachments.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            content_type:
              attachment.content_type?.toLowerCase() ??
              (Object.hasOwn(CONTENT_TYPES_BY_EXTENSION, fileExtension(attachment.filename))
                ? (CONTENT_TYPES_BY_EXTENSION[fileExtension(attachment.filename)] ??
                  DEFAULT_CONTENT_TYPE)
                : DEFAULT_CONTENT_TYPE),
            content_id: attachment.content_id ?? null,
          })),
        }
      : {}),
    // Absent when not given, for the same reason.
    ...(value.tracking === undefined
      ? {}
      : {
          tracking: {
            ...(value.tracking.opens === undefined ? {} : { opens: value.tracking.opens }),
            ...(value.tracking.clicks === undefined ? {} : { clicks: value.tracking.clicks }),
          },
        }),
  }))
  .meta({
    id: "SendEmailRequest",
    examples: [
      {
        from: "Acme <onboarding@acme.com>",
        to: "user@example.com",
        subject: "Welcome to Acme",
        html: "<p>Thanks for signing up!</p>",
        tags: [{ name: "template", value: "welcome" }],
        category: "onboarding",
      },
    ],
  });

export type SendEmailRequestInput = z.input<typeof SendEmailRequest>;
export type SendEmailRequestOutput = z.output<typeof SendEmailRequest>;

export const SendEmailBatchRequest = z
  .strictObject({
    emails: z
      .array(SendEmailRequest)
      .min(1)
      .max(MAX_BATCH_EMAILS)
      .meta({
        description:
          `Up to ${MAX_BATCH_EMAILS} emails, each accepted by \`POST /v1/emails\`. The batch is ` +
          "accepted or rejected as a whole.",
      }),
  })
  .meta({
    id: "SendEmailBatchRequest",
    examples: [
      {
        emails: [
          {
            from: "Acme <notifications@acme.com>",
            to: "ada@example.com",
            subject: "Your weekly summary",
            html: "<p>Hi Ada, here is your week.</p>",
            category: "digest",
          },
          {
            from: "Acme <notifications@acme.com>",
            to: "grace@example.com",
            subject: "Your weekly summary",
            html: "<p>Hi Grace, here is your week.</p>",
            category: "digest",
          },
        ],
      },
    ],
  });

export type SendEmailBatchRequestInput = z.input<typeof SendEmailBatchRequest>;
export type SendEmailBatchRequestOutput = z.output<typeof SendEmailBatchRequest>;

export const RescheduleEmailRequest = z
  .strictObject({
    scheduled_at: ScheduledAt.meta({
      description:
        "The new time to send the email at (ISO 8601 with an offset, at most 30 days ahead). A " +
        "time that is not in the future sends it right away.",
      example: "2026-10-12T09:00:00Z",
    }),
  })
  .superRefine((value, ctx) => {
    if (tooFarAhead(value.scheduled_at)) {
      ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: TOO_FAR_AHEAD_MESSAGE });
    }
  })
  // Normalized to UTC, like the stored `scheduled_at`.
  .transform((value) => ({ scheduled_at: new Date(value.scheduled_at).toISOString() }))
  .meta({
    id: "RescheduleEmailRequest",
    examples: [{ scheduled_at: "2026-10-12T09:00:00Z" }],
  });

export type RescheduleEmailRequestInput = z.input<typeof RescheduleEmailRequest>;
export type RescheduleEmailRequestOutput = z.output<typeof RescheduleEmailRequest>;

/** Distinct addresses across to, cc and bcc: what send quotas count. */
export function uniqueRecipientCount(params: SendEmailRequestOutput): number {
  return new Set([...params.to, ...params.cc, ...params.bcc].map(addressKey)).size;
}

export const EMAIL_STATUSES = ["queued", "sent", "failed", "scheduled", "canceled"] as const;

/** Ordered by precedence: later delivery events never move a recipient to a lower status. */
export const EMAIL_RECIPIENT_STATUSES = [
  "queued",
  "sent",
  "delivery_delayed",
  "delivered",
  "bounced",
  "suppressed",
  "complained",
  "failed",
  "canceled",
] as const;

export type EmailRecipientStatus = (typeof EMAIL_RECIPIENT_STATUSES)[number];

export const EMAIL_RECIPIENT_TYPES = ["to", "cc", "bcc"] as const;

export const EMAIL_EVENT_TYPES = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
  "email.scheduled",
  "email.canceled",
  "email.opened",
  "email.clicked",
  "email.rescheduled",
] as const;

/** Engagement events: recorded by COSS's tracking endpoints, never change a recipient's status. */
export const ENGAGEMENT_EVENT_TYPES = [
  "email.opened",
  "email.clicked",
] as const satisfies readonly EmailEventType[];

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number];

/**
 * Every type a webhook endpoint can subscribe to: email events plus the organization's
 * reputation changes (`account.*`, delivered to live environments only).
 */
export const WEBHOOK_EVENT_TYPES = [...EMAIL_EVENT_TYPES, ...ACCOUNT_EVENT_TYPES] as const;
// Examples shown in the API reference; test/schema-examples.test.ts parses each with its schema.
const EMAIL_ID_EXAMPLE = "email_01k7c8m4q2f3e9v6t5r1n0p8yz";
const RECIPIENT_EXAMPLE = {
  address: "user@example.com",
  type: "to",
  status: "delivered",
  last_event_at: "2026-10-10T12:00:02.000Z",
};
const SENT_EVENT_EXAMPLE = {
  object: "email_event",
  id: "evt_01k7c8m4r0c2b8w9y3d5f6g7h8",
  email_id: EMAIL_ID_EXAMPLE,
  type: "email.sent",
  recipient: null,
  occurred_at: "2026-10-10T12:00:01.000Z",
  data: {},
};
const DELIVERED_EVENT_EXAMPLE = {
  object: "email_event",
  id: "evt_01k7c8m4q2f3e9v6t5r1n0p8yz",
  email_id: EMAIL_ID_EXAMPLE,
  type: "email.delivered",
  recipient: "user@example.com",
  occurred_at: "2026-10-10T12:00:02.000Z",
  data: { delivery: { smtp_response: "250 2.0.0 OK" } },
};

export const EmailRecipient = z
  .object({
    address: z.string().meta({ description: "The bare, lower-cased address." }),
    type: z.enum(EMAIL_RECIPIENT_TYPES),
    status: z.enum(EMAIL_RECIPIENT_STATUSES).meta({
      description:
        "Delivery status of this recipient. `suppressed` means the address is on the " +
        "environment's suppression list (for every email or for this email's category), so it " +
        "was skipped. `canceled` means the scheduled email was canceled before it was sent.",
    }),
    last_event_at: z.iso.datetime().nullable(),
  })
  .meta({ id: "EmailRecipient", examples: [RECIPIENT_EXAMPLE] });

export const SUPPRESSION_REASONS = ["bounce", "complaint", "manual", "import"] as const;

export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];

export const SuppressionScope = z
  .union([z.literal(ALL_CATEGORIES), Category], {
    error: 'Expected "*" or a category (ASCII letters, numbers, underscores or dashes).',
  })
  .meta({
    id: "SuppressionScope",
    description:
      "`*` suppresses every email; a category only suppresses emails with that category.",
  });

const SuppressionReasonEnum = z.enum(SUPPRESSION_REASONS).meta({
  description:
    "`bounce`: added after a permanent bounce. `complaint`: added after a spam complaint. " +
    "`manual`: added one by one through the API or dashboard. `import`: added by a bulk import.",
});

export const EmailEventData = z
  .object({
    bounce: z
      .object({
        type: z.enum(["permanent", "transient", "undetermined"]),
        sub_type: z.string(),
        diagnostic_code: z.string().nullable(),
      })
      .optional(),
    complaint: z
      .object({ feedback_type: z.string().nullable(), sub_type: z.string().nullable() })
      .optional(),
    delay: z
      .object({
        type: z.string(),
        expires_at: z.iso.datetime().nullable(),
        diagnostic_code: z.string().nullable(),
      })
      .optional(),
    delivery: z.object({ smtp_response: z.string().nullable() }).optional(),
    failure: z.object({ code: z.string(), message: z.string() }).optional(),
    suppression: z
      .object({ id: z.string(), scope: z.string(), reason: SuppressionReasonEnum })
      .optional()
      .meta({ description: "Only for `email.suppressed`: the entry that matched the recipient." }),
    open: z
      .object({ user_agent: z.string().nullable() })
      .optional()
      .meta({ description: "Only for `email.opened`." }),
    click: z
      .object({
        url: z.string().meta({ description: "The original link that was clicked." }),
        link_position: z
          .number()
          .int()
          .meta({ description: "Index of the link among the email's tracked links." }),
        user_agent: z.string().nullable(),
      })
      .optional()
      .meta({ description: "Only for `email.clicked`." }),
    reschedule: z
      .object({
        scheduled_at: z.iso.datetime().meta({ description: "The new time." }),
        previous_scheduled_at: z.iso.datetime().meta({ description: "The time it replaced." }),
      })
      .optional()
      .meta({ description: "Only for `email.rescheduled`." }),
  })
  .meta({ id: "EmailEventData", examples: [DELIVERED_EVENT_EXAMPLE.data] });

export type EmailEventDataOutput = z.output<typeof EmailEventData>;

export const EmailEvent = z
  .object({
    object: z.literal("email_event"),
    id: z.string().meta({ examples: ["evt_01k7c8m4q2f3e9v6t5r1n0p8yz"] }),
    email_id: z.string(),
    type: z.enum(EMAIL_EVENT_TYPES),
    recipient: z
      .string()
      .nullable()
      .meta({ description: "The recipient this event is about; `null` for the whole email." }),
    occurred_at: z.iso.datetime(),
    data: EmailEventData,
  })
  .meta({ id: "EmailEvent", examples: [DELIVERED_EVENT_EXAMPLE] });

export type EmailEventOutput = z.output<typeof EmailEvent>;

export const EmailEventList = z
  .object({
    object: z.literal("list"),
    data: z.array(EmailEvent),
    has_more: z.boolean(),
  })
  .meta({
    id: "EmailEventList",
    examples: [
      {
        object: "list",
        data: [SENT_EVENT_EXAMPLE, DELIVERED_EVENT_EXAMPLE],
        has_more: false,
      },
    ],
  });

export type EmailEventListOutput = z.output<typeof EmailEventList>;

/**
 * Body of a webhook request. `data` describes the email (never its content, cc or bcc) and
 * carries the event's details (`bounce`, `complaint`, …) like `EmailEvent.data`.
 */
export const EmailWebhookEvent = z
  .object({
    id: z.string().meta({
      description: "The event id: the same as `EmailEvent.id`, and the `webhook-id` header.",
      examples: ["evt_01k7c8m4q2f3e9v6t5r1n0p8yz"],
    }),
    object: z.literal("event"),
    type: z.enum(EMAIL_EVENT_TYPES),
    api_version: z.string().meta({
      description:
        "The API version (`Coss-Version`) this event is rendered in: the receiving endpoint's `api_version`.",
      examples: [LATEST_API_VERSION],
    }),
    created_at: z.iso.datetime(),
    data: EmailEventData.extend({
      email_id: z.string(),
      from: z.string(),
      to: z.array(z.string()),
      subject: z.string(),
      tags: z.array(z.object({ name: z.string(), value: z.string() })),
      category: z.string().nullable(),
      sandbox: z.boolean(),
      recipient: z.string().nullable(),
      occurred_at: z.iso.datetime(),
    }),
  })
  .meta({
    id: "EmailWebhookEvent",
    examples: [
      {
        id: DELIVERED_EVENT_EXAMPLE.id,
        object: "event",
        type: "email.delivered",
        api_version: LATEST_API_VERSION,
        created_at: "2026-10-10T12:00:03.000Z",
        data: {
          email_id: EMAIL_ID_EXAMPLE,
          from: "Acme <onboarding@acme.com>",
          to: ["user@example.com"],
          subject: "Welcome to Acme",
          tags: [{ name: "template", value: "welcome" }],
          category: "onboarding",
          sandbox: false,
          recipient: "user@example.com",
          occurred_at: DELIVERED_EVENT_EXAMPLE.occurred_at,
          delivery: { smtp_response: "250 2.0.0 OK" },
        },
      },
    ],
  });

export type EmailWebhookEventOutput = z.output<typeof EmailWebhookEvent>;
/** What the outbox stores: delivery adds `api_version` when it renders the event for an endpoint. */
export type StoredEmailWebhookEvent = Omit<EmailWebhookEventOutput, "api_version">;

export const EmailAttachmentObject = z
  .object({
    id: z.string().meta({ example: "att_01k7c8m4q2f3e9v6t5r1n0p8yz" }),
    filename: z.string(),
    content_type: z.string(),
    content_id: z
      .string()
      .nullable()
      .meta({ description: "Set for inline attachments (`cid:` references)." }),
    size: z.number().int().meta({ description: "Size in bytes." }),
  })
  .meta({ id: "EmailAttachment" });

export type EmailAttachmentObjectOutput = z.output<typeof EmailAttachmentObject>;
const TRACKING_EXAMPLE = {
  opens: false,
  clicks: false,
  open_count: 0,
  first_opened_at: null,
  last_opened_at: null,
  click_count: 0,
  first_clicked_at: null,
  last_clicked_at: null,
};
const LINK_EXAMPLE = {
  object: "email_link",
  id: "lnk_01k7c8m4q2f3e9v6t5r1n0p8yz",
  email_id: EMAIL_ID_EXAMPLE,
  position: 0,
  url: "https://acme.com/start",
  click_count: 0,
  first_clicked_at: null,
  last_clicked_at: null,
};

export const EmailTracking = z
  .object({
    opens: z.boolean().meta({ description: "Whether opens are tracked for this email." }),
    clicks: z.boolean().meta({ description: "Whether link clicks are tracked for this email." }),
    open_count: z.number().int(),
    first_opened_at: z.iso.datetime().nullable(),
    last_opened_at: z.iso.datetime().nullable(),
    click_count: z.number().int(),
    first_clicked_at: z.iso.datetime().nullable(),
    last_clicked_at: z.iso.datetime().nullable(),
  })
  .meta({
    id: "EmailTracking",
    examples: [TRACKING_EXAMPLE],
    description:
      "Open and click tracking, as resolved when the email was sent, with engagement so far. " +
      "Opens can be inflated by mail clients that prefetch images, clicks by link scanners.",
  });

export const EmailLink = z
  .object({
    object: z.literal("email_link"),
    id: z.string().meta({ examples: [LINK_EXAMPLE.id] }),
    email_id: z.string(),
    position: z.number().int().meta({ description: "Index of the link among the tracked links." }),
    url: z.string(),
    click_count: z.number().int(),
    first_clicked_at: z.iso.datetime().nullable(),
    last_clicked_at: z.iso.datetime().nullable(),
  })
  .meta({ id: "EmailLink", examples: [LINK_EXAMPLE] });

export type EmailLinkOutput = z.output<typeof EmailLink>;

export const EmailLinkList = z
  .object({
    object: z.literal("list"),
    data: z.array(EmailLink),
    has_more: z.boolean(),
  })
  .meta({
    id: "EmailLinkList",
    examples: [{ object: "list", data: [LINK_EXAMPLE], has_more: false }],
  });

export type EmailLinkListOutput = z.output<typeof EmailLinkList>;

export const EmailObject = z
  .object({
    object: z.literal("email"),
    id: z.string().meta({ examples: [EMAIL_ID_EXAMPLE] }),
    from: z.string(),
    to: z.array(z.string()),
    cc: z.array(z.string()),
    bcc: z.array(z.string()),
    reply_to: z.array(z.string()),
    subject: z.string(),
    html: z.string().nullable(),
    text: z.string().nullable(),
    headers: z.record(z.string(), z.string()),
    tags: z.array(z.object({ name: z.string(), value: z.string() })),
    category: z.string().nullable(),
    status: z.enum(EMAIL_STATUSES).meta({
      description:
        "Whether the email was handed to the delivery provider. `scheduled` emails wait for " +
        "`scheduled_at`; `canceled` ones were canceled before that. Per-recipient delivery is in " +
        "`recipients`.",
    }),
    recipients: z.array(EmailRecipient),
    attachments: z.array(EmailAttachmentObject).meta({
      description: "Attachment metadata. Content is never returned, and is discarded once sent.",
    }),
    sandbox: z
      .boolean()
      .meta({ description: "True when sent from a sandbox environment (never delivered)." }),
    tracking: EmailTracking,
    created_at: z.iso.datetime(),
    sent_at: z.iso.datetime().nullable(),
    scheduled_at: z.iso
      .datetime()
      .nullable()
      .meta({ description: "When the email was scheduled to be sent; `null` if it was not." }),
    batch_id: z
      .string()
      .nullable()
      .meta({ description: "The batch that sent the email; `null` if it was sent on its own." }),
  })
  .meta({
    id: "Email",
    examples: [
      {
        object: "email",
        id: EMAIL_ID_EXAMPLE,
        from: "Acme <onboarding@acme.com>",
        to: ["user@example.com"],
        cc: [],
        bcc: [],
        reply_to: [],
        subject: "Welcome to Acme",
        html: "<p>Thanks for signing up!</p>",
        text: null,
        headers: {},
        tags: [{ name: "template", value: "welcome" }],
        category: "onboarding",
        status: "sent",
        recipients: [RECIPIENT_EXAMPLE],
        sandbox: false,
        tracking: TRACKING_EXAMPLE,
        attachments: [],
        created_at: "2026-10-10T12:00:00.000Z",
        sent_at: "2026-10-10T12:00:01.000Z",
        scheduled_at: null,
        batch_id: null,
      },
    ],
  });

export type EmailObjectOutput = z.output<typeof EmailObject>;

const BATCH_EXAMPLE_ID = "batch_01k8d0n6x5f3w2e1r9t7y4u6i8";

export const EmailBatchObject = z
  .object({
    object: z.literal("email_batch"),
    id: z.string().meta({ examples: [BATCH_EXAMPLE_ID] }),
    data: z
      .array(EmailObject)
      .meta({ description: "The batch's emails, in the order of the request." }),
    created_at: z.iso.datetime(),
  })
  .meta({
    id: "EmailBatch",
    examples: [
      {
        object: "email_batch",
        id: BATCH_EXAMPLE_ID,
        data: [
          {
            object: "email",
            id: EMAIL_ID_EXAMPLE,
            from: "Acme <notifications@acme.com>",
            to: ["ada@example.com"],
            cc: [],
            bcc: [],
            reply_to: [],
            subject: "Your weekly summary",
            html: "<p>Hi Ada, here is your week.</p>",
            text: null,
            headers: {},
            tags: [],
            category: "digest",
            status: "queued",
            recipients: [
              { address: "ada@example.com", type: "to", status: "queued", last_event_at: null },
            ],
            sandbox: false,
            tracking: TRACKING_EXAMPLE,
            attachments: [],
            created_at: "2026-10-10T12:00:00.000Z",
            sent_at: null,
            scheduled_at: null,
            batch_id: BATCH_EXAMPLE_ID,
          },
        ],
        created_at: "2026-10-10T12:00:00.000Z",
      },
    ],
  });

export type EmailBatchObjectOutput = z.output<typeof EmailBatchObject>;

export const DOMAIN_STATUSES = [
  "pending",
  "verified",
  "temporary_failure",
  "failed",
  "deleting",
] as const;

export const MAIL_FROM_STATUSES = ["pending", "success", "temporary_failure", "failed"] as const;

export const DOMAIN_RECORD_PURPOSES = ["dkim", "mail_from_mx", "mail_from_spf", "dmarc"] as const;

export const DOMAIN_RECORD_STATUSES = ["verified", "missing", "mismatch", "not_checked"] as const;

export const TRACKING_DOMAIN_STATUSES = [
  "pending",
  "active",
  "temporary_failure",
  "failed",
  "deleting",
] as const;

const DOMAIN_ID_EXAMPLE = "dom_01k7c8m4q2f3e9v6t5r1n0p8yz";
const TRACKING_DOMAIN_EXAMPLE = {
  hostname: "links.acme.com",
  status: "active",
  record: {
    type: "CNAME",
    name: "links.acme.com",
    value: "track.coss.com",
    status: "verified",
    found: [],
  },
  message: null,
  created_at: "2026-01-15T09:45:00.000Z",
  last_checked_at: "2026-01-15T09:52:00.000Z",
  activated_at: "2026-01-15T09:52:00.000Z",
  failed_at: null,
} as const;
const VERIFIED_RECORD = { priority: null, required: true, status: "verified", found: [] } as const;
const DKIM_RECORD_EXAMPLE = {
  ...VERIFIED_RECORD,
  purpose: "dkim",
  type: "CNAME",
  name: "x7f3k2m9qp4ld8sv6hwz1nyc5rbtgj0e._domainkey.acme.com",
  value: "x7f3k2m9qp4ld8sv6hwz1nyc5rbtgj0e.dkim.amazonses.com",
} as const;
const DOMAIN_EXAMPLE = {
  object: "domain",
  id: DOMAIN_ID_EXAMPLE,
  name: "acme.com",
  status: "verified",
  can_send: true,
  region: "us-east-1",
  mail_from_domain: "send.acme.com",
  mail_from_status: "success",
  records: [
    DKIM_RECORD_EXAMPLE,
    {
      ...VERIFIED_RECORD,
      purpose: "mail_from_mx",
      type: "MX",
      name: "send.acme.com",
      value: "feedback-smtp.us-east-1.amazonses.com",
      priority: 10,
    },
    {
      ...VERIFIED_RECORD,
      purpose: "mail_from_spf",
      type: "TXT",
      name: "send.acme.com",
      value: "v=spf1 include:amazonses.com ~all",
    },
    {
      ...VERIFIED_RECORD,
      purpose: "dmarc",
      type: "TXT",
      name: "_dmarc.acme.com",
      value: "v=DMARC1; p=none;",
      required: false,
    },
  ],
  created_at: "2026-01-15T09:30:00.000Z",
  last_checked_at: "2026-01-15T09:42:10.000Z",
  verified_at: "2026-01-15T09:42:10.000Z",
  failed_at: null,
  tracking: TRACKING_DOMAIN_EXAMPLE,
} as const;

export const DomainRecordObject = z
  .object({
    purpose: z.enum(DOMAIN_RECORD_PURPOSES).meta({
      description:
        "What the record is for: `dkim` signs messages, `mail_from_mx` and `mail_from_spf` " +
        "set up the bounce subdomain, `dmarc` is recommended but not required.",
    }),
    type: z.enum(["CNAME", "MX", "TXT"]),
    name: z.string().meta({ description: "The fully qualified record name to create." }),
    value: z.string(),
    priority: z.number().int().nullable().meta({ description: "`MX` records only." }),
    required: z.boolean().meta({ description: "`false` for records that are only recommended." }),
    status: z.enum(DOMAIN_RECORD_STATUSES).meta({
      description:
        "What the last DNS check saw. `not_checked` means DNS has not been consulted yet.",
    }),
    found: z.array(z.string()).meta({ description: "What DNS returned when it did not match." }),
  })
  .meta({ id: "DomainRecord", examples: [DKIM_RECORD_EXAMPLE] });

export type DomainRecordObjectOutput = z.output<typeof DomainRecordObject>;

export const TrackingDomainObject = z
  .object({
    hostname: z.string().meta({
      description: "The tracking hostname, a subdomain of the domain.",
      examples: ["links.acme.com"],
    }),
    status: z.enum(TRACKING_DOMAIN_STATUSES).meta({
      description:
        "`pending` until the CNAME points at COSS and its certificate is issued, `active` once " +
        "links and open pixels of emails sent from the domain use it, `temporary_failure` when " +
        "an active hostname stopped working (emails fall back to the default tracking host " +
        "meanwhile), `failed` when setup gave up (72 hours) — restart it with the domain's " +
        "verify endpoint. `deleting` is a removal in progress.",
    }),
    record: z
      .object({
        type: z.literal("CNAME"),
        name: z.string().meta({ description: "The fully qualified record name to create." }),
        value: z.string().meta({ description: "The host the record must point at." }),
        status: z.enum(DOMAIN_RECORD_STATUSES).meta({
          description:
            "What the last DNS check saw. `not_checked` means DNS has not been consulted yet.",
        }),
        found: z
          .array(z.string())
          .meta({ description: "What DNS returned when it did not match." }),
      })
      .meta({ description: "The DNS record to publish, with the result of the last check." }),
    message: z.string().nullable().meta({
      description: "What is holding the hostname up, when the certificate provider said.",
    }),
    created_at: z.iso.datetime(),
    last_checked_at: z.iso.datetime().nullable(),
    activated_at: z.iso.datetime().nullable(),
    failed_at: z.iso.datetime().nullable(),
  })
  .meta({
    id: "TrackingDomain",
    description:
      "A domain's custom tracking domain: open pixels and click redirects of emails sent from " +
      "the domain use it while it is `active`.",
    examples: [TRACKING_DOMAIN_EXAMPLE],
  });

export type TrackingDomainObjectOutput = z.output<typeof TrackingDomainObject>;

export const DomainObject = z
  .object({
    object: z.literal("domain"),
    id: z.string().meta({ examples: [DOMAIN_ID_EXAMPLE] }),
    name: z.string().meta({ description: "The domain, lower-cased.", examples: ["acme.com"] }),
    status: z.enum(DOMAIN_STATUSES).meta({
      description:
        "`pending` while the records are being checked, `verified` once they are, " +
        "`temporary_failure` after a transient DNS problem, and `failed` when verification gave " +
        "up (72 hours) — restart it with the verify endpoint. `deleting` is a removal in progress.",
    }),
    can_send: z
      .boolean()
      .meta({ description: "Whether live keys may send from this domain right now." }),
    region: z.string().nullable(),
    mail_from_domain: z
      .string()
      .meta({ description: "The envelope sender subdomain bounces come back to." }),
    mail_from_status: z.enum(MAIL_FROM_STATUSES),
    records: z
      .array(DomainRecordObject)
      .meta({ description: "The DNS records to publish, with the result of the last check." }),
    created_at: z.iso.datetime(),
    last_checked_at: z.iso.datetime().nullable(),
    verified_at: z.iso.datetime().nullable(),
    failed_at: z.iso.datetime().nullable(),
    // The custom tracking domain (`null` when none is set up). A union, not `.nullable()`, and no
    // `.meta()`: the OpenAPI generator would drop the `null` or inline the `TrackingDomain` schema.
    tracking: z.union([TrackingDomainObject, z.null()]),
  })
  .meta({ id: "Domain", examples: [DOMAIN_EXAMPLE] });

export type DomainObjectOutput = z.output<typeof DomainObject>;

export const DomainList = z
  .object({
    object: z.literal("list"),
    data: z.array(DomainObject),
    has_more: z.boolean(),
  })
  .meta({
    id: "DomainList",
    examples: [{ object: "list", data: [DOMAIN_EXAMPLE], has_more: false }],
  });

export type DomainListOutput = z.output<typeof DomainList>;

export const DOMAIN_NAME_MAX_LENGTH = 200;

export const CreateDomainRequest = z
  .strictObject({
    name: z
      .string()
      .min(1, "Enter a domain name, like acme.com.")
      .max(
        DOMAIN_NAME_MAX_LENGTH,
        `Domain names can be at most ${DOMAIN_NAME_MAX_LENGTH} characters.`,
      )
      .meta({
        description:
          "The domain to send from, without a scheme or path. Subdomains are allowed; " +
          "internationalized domains must be punycode-encoded.",
        examples: ["acme.com"],
      }),
  })
  .meta({ id: "CreateDomainRequest", examples: [{ name: "acme.com" }] });

export type CreateDomainRequestInput = z.input<typeof CreateDomainRequest>;

export const DeletedDomain = z
  .object({
    object: z.literal("domain"),
    id: z.string(),
    deleted: z.literal(true),
  })
  .meta({
    id: "DeletedDomain",
    examples: [{ object: "domain", id: DOMAIN_ID_EXAMPLE, deleted: true }],
  });

export type DeletedDomainOutput = z.output<typeof DeletedDomain>;

export const CreateTrackingDomainRequest = z
  .strictObject({
    hostname: z
      .string()
      .min(1, "Enter a hostname, like links.acme.com.")
      .max(DOMAIN_NAME_MAX_LENGTH, `Hostnames can be at most ${DOMAIN_NAME_MAX_LENGTH} characters.`)
      .meta({
        description:
          "A subdomain of the domain to serve tracking links from, without a scheme or path. " +
          "Point it at COSS with the CNAME record the response lists.",
        examples: ["links.acme.com"],
      }),
  })
  .meta({ id: "CreateTrackingDomainRequest", examples: [{ hostname: "links.acme.com" }] });

export type CreateTrackingDomainRequestInput = z.input<typeof CreateTrackingDomainRequest>;
const SuppressionAddress = z
  .string()
  .superRefine((value, ctx) => {
    const problem = emailAddressProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .transform(addressKey);

export const CreateSuppressionRequest = z
  .strictObject({
    address: SuppressionAddress.meta({
      description:
        "The address to suppress. Display names are ignored; matching is case-insensitive.",
    }),
    scope: SuppressionScope.optional().meta({
      description:
        'Defaults to `*` (every email). Pass a category, e.g. "marketing", to only skip those.',
    }),
  })
  .transform((value) => ({ address: value.address, scope: value.scope ?? ALL_CATEGORIES }))
  .meta({
    id: "CreateSuppressionRequest",
    examples: [{ address: "user@example.com", scope: "marketing" }],
  });

export type CreateSuppressionRequestInput = z.input<typeof CreateSuppressionRequest>;
export type CreateSuppressionRequestOutput = z.output<typeof CreateSuppressionRequest>;

export const DEFAULT_SUPPRESSION_LIST_LIMIT = 50;
export const MAX_SUPPRESSION_LIST_LIMIT = 100;

export const ListSuppressionsQuery = z.strictObject({
  address: SuppressionAddress.optional().meta({ description: "Only entries for this address." }),
  scope: SuppressionScope.optional().meta({ description: "Only entries with this scope." }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_SUPPRESSION_LIST_LIMIT)
    .optional()
    .meta({
      description: `1-${MAX_SUPPRESSION_LIST_LIMIT}, default ${DEFAULT_SUPPRESSION_LIST_LIMIT}.`,
    }),
  after: z
    .string()
    .optional()
    .meta({ description: "Cursor: the `id` of the last entry of the previous page." }),
});

export type ListSuppressionsQueryOutput = z.output<typeof ListSuppressionsQuery>;

export const CheckSuppressionQuery = z.strictObject({
  address: SuppressionAddress.meta({
    description: "The address to check.",
    examples: ["user@example.com"],
  }),
  category: Category.optional().meta({
    description: "The category of the email you plan to send. Without it, only `*` entries count.",
  }),
});

export type CheckSuppressionQueryOutput = z.output<typeof CheckSuppressionQuery>;

const SUPPRESSION_ID_EXAMPLE = "sup_01k7c8m4q2f3e9v6t5r1n0p8yz";
const SUPPRESSION_EXAMPLE = {
  object: "suppression",
  id: SUPPRESSION_ID_EXAMPLE,
  address: "user@example.com",
  scope: "marketing",
  reason: "manual",
  email_id: null,
  created_at: "2026-01-15T09:30:00.000Z",
} as const;

export const Suppression = z
  .object({
    object: z.literal("suppression"),
    id: z.string().meta({ examples: [SUPPRESSION_ID_EXAMPLE] }),
    address: z.string().meta({ description: "The bare, lower-cased address." }),
    scope: z.string().meta({ description: "`*` (every email) or a category." }),
    reason: SuppressionReasonEnum,
    email_id: z
      .string()
      .nullable()
      .meta({ description: "The email whose bounce or complaint added this entry." }),
    created_at: z.iso.datetime(),
  })
  .meta({ id: "Suppression", examples: [SUPPRESSION_EXAMPLE] });

export type SuppressionOutput = z.output<typeof Suppression>;

export const SuppressionList = z
  .object({
    object: z.literal("list"),
    data: z.array(Suppression),
    has_more: z.boolean(),
  })
  .meta({
    id: "SuppressionList",
    examples: [{ object: "list", data: [SUPPRESSION_EXAMPLE], has_more: false }],
  });

export type SuppressionListOutput = z.output<typeof SuppressionList>;

export const SuppressionCheck = z
  .object({
    object: z.literal("suppression_check"),
    address: z.string(),
    suppressed: z
      .boolean()
      .meta({ description: "Whether a send (with the given category) would skip this address." }),
    suppressions: z.array(Suppression).meta({ description: "The entries that match." }),
  })
  .meta({
    id: "SuppressionCheck",
    examples: [
      {
        object: "suppression_check",
        address: "user@example.com",
        suppressed: true,
        suppressions: [SUPPRESSION_EXAMPLE],
      },
    ],
  });

export type SuppressionCheckOutput = z.output<typeof SuppressionCheck>;

export const DeletedSuppression = z
  .object({
    object: z.literal("suppression"),
    id: z.string(),
    deleted: z.literal(true),
  })
  .meta({
    id: "DeletedSuppression",
    examples: [{ object: "suppression", id: SUPPRESSION_ID_EXAMPLE, deleted: true }],
  });

export type DeletedSuppressionOutput = z.output<typeof DeletedSuppression>;

/** An environment's tracking default (`category: null`) or a category's override. */
export const TrackingRuleInput = z.strictObject({
  category: Category.nullable(),
  opens: z.boolean(),
  clicks: z.boolean(),
});

export type TrackingRuleInputOutput = z.output<typeof TrackingRuleInput>;

const TRACKING_RULE_ID_EXAMPLE = "etr_01k7c8m4q2f3e9v6t5r1n0p8yz";
const TRACKING_DEFAULT_EXAMPLE = {
  object: "tracking_rule",
  id: "etr_01k7c8k1d9w4x2b7n3m5q6r8st",
  category: null,
  opens: true,
  clicks: true,
  created_at: "2026-01-15T09:30:00.000Z",
  updated_at: "2026-01-15T09:30:00.000Z",
} as const;
const TRACKING_RULE_EXAMPLE = {
  object: "tracking_rule",
  id: TRACKING_RULE_ID_EXAMPLE,
  category: "password-reset",
  opens: false,
  clicks: false,
  created_at: "2026-01-16T10:00:00.000Z",
  updated_at: "2026-01-16T10:00:00.000Z",
} as const;

export const TrackingRule = z
  .object({
    object: z.literal("tracking_rule"),
    id: z.string().meta({ examples: [TRACKING_RULE_ID_EXAMPLE] }),
    category: z.string().nullable().meta({
      description: "The category the rule applies to; `null` for the environment default.",
    }),
    opens: z.boolean().meta({ description: "Whether opens are tracked." }),
    clicks: z.boolean().meta({ description: "Whether clicks are tracked." }),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .meta({
    id: "TrackingRule",
    description:
      "An environment's tracking default (`category: null`) or the rule for one category. " +
      "Emails are fixed to the settings that applied when they were sent.",
    examples: [TRACKING_RULE_EXAMPLE],
  });

export type TrackingRuleOutput = z.output<typeof TrackingRule>;

export const TrackingSettings = z
  .object({
    object: z.literal("tracking_settings"),
    // A union, not `.nullable()`, and no `.meta()`: the OpenAPI generator would drop the `null`
    // or inline the `TrackingRule` schema (as for `Domain.tracking`).
    default: z.union([TrackingRule, z.null()]),
    categories: z.array(TrackingRule).meta({ description: "Category rules, by category name." }),
  })
  .meta({
    id: "TrackingSettings",
    description:
      "Open and click tracking settings of the API key's environment. For each of `opens` and " +
      "`clicks`, a send's own `tracking` wins, then its category's rule, then `default` (the " +
      "environment default; `null` when none is set), then off.",
    examples: [
      {
        object: "tracking_settings",
        default: TRACKING_DEFAULT_EXAMPLE,
        categories: [TRACKING_RULE_EXAMPLE],
      },
    ],
  });

export type TrackingSettingsOutput = z.output<typeof TrackingSettings>;

export const UpdateTrackingRuleRequest = z
  .strictObject({
    opens: z.boolean().optional().meta({ description: "Track opens." }),
    clicks: z.boolean().optional().meta({ description: "Track clicks." }),
  })
  .refine((value) => value.opens !== undefined || value.clicks !== undefined, {
    error: "Provide opens, clicks or both.",
  })
  .meta({
    id: "UpdateTrackingRuleRequest",
    description:
      "Fields left out keep their current value; a new rule starts with both off. A send's own " +
      "`tracking` option still wins over the rule.",
    examples: [{ opens: false, clicks: false }],
  });

export type UpdateTrackingRuleRequestInput = z.input<typeof UpdateTrackingRuleRequest>;
export type UpdateTrackingRuleRequestOutput = z.output<typeof UpdateTrackingRuleRequest>;

export const TrackingCategoryParams = z.object({
  category: Category.meta({
    description: "The category, as sent in `category`.",
    examples: ["password-reset"],
  }),
});

export const DeletedTrackingRule = z
  .object({
    object: z.literal("tracking_rule"),
    id: z.string(),
    category: z.string().nullable(),
    deleted: z.literal(true),
  })
  .meta({
    id: "DeletedTrackingRule",
    examples: [
      {
        object: "tracking_rule",
        id: TRACKING_RULE_ID_EXAMPLE,
        category: "password-reset",
        deleted: true,
      },
    ],
  });

export type DeletedTrackingRuleOutput = z.output<typeof DeletedTrackingRule>;
export const MAX_SUPPRESSION_IMPORT_ENTRIES = 1000;

export const ImportSuppressionsRequest = z
  .strictObject({
    suppressions: z
      .array(
        z.strictObject({
          address: z.string().meta({ description: "The address to suppress." }),
          scope: z.string().optional().meta({ description: "`*` (the default) or a category." }),
        }),
      )
      .min(1, "Provide at least one suppression.")
      .max(
        MAX_SUPPRESSION_IMPORT_ENTRIES,
        `At most ${MAX_SUPPRESSION_IMPORT_ENTRIES} suppressions can be imported per request.`,
      )
      .meta({
        description:
          `1-${MAX_SUPPRESSION_IMPORT_ENTRIES} entries. Each one is validated on its own: invalid ` +
          "entries are skipped and reported in `invalid`, the rest are imported.",
      }),
  })
  .meta({
    id: "ImportSuppressionsRequest",
    examples: [
      {
        suppressions: [
          { address: "user@example.com" },
          { address: "other@example.com", scope: "marketing" },
        ],
      },
    ],
  });

export type ImportSuppressionsRequestInput = z.input<typeof ImportSuppressionsRequest>;
export type ImportSuppressionsRequestOutput = z.output<typeof ImportSuppressionsRequest>;

export const SuppressionImport = z
  .object({
    object: z.literal("suppression_import"),
    created: z.number().int().meta({ description: "Entries added by this import." }),
    existing: z.number().int().meta({
      description:
        "Valid entries that were already on the list (or repeated within this import); unchanged.",
    }),
    invalid: z
      .array(
        z.object({
          index: z.number().int().meta({ description: "Position of the entry in the request." }),
          address: z.string(),
          message: z.string(),
        }),
      )
      .meta({ description: "Entries that were skipped, with the reason." }),
  })
  .meta({
    id: "SuppressionImport",
    examples: [
      {
        object: "suppression_import",
        created: 2,
        existing: 0,
        invalid: [],
      },
    ],
  });

export type SuppressionImportOutput = z.output<typeof SuppressionImport>;

export const ExportSuppressionsQuery = z.strictObject({
  scope: SuppressionScope.optional().meta({ description: "Only entries with this scope." }),
  reason: SuppressionReasonEnum.optional().meta({
    description: "Only entries with this reason.",
    examples: ["bounce"],
  }),
});

export type ExportSuppressionsQueryOutput = z.output<typeof ExportSuppressionsQuery>;
