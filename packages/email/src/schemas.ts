/**
 * Public wire schemas for the email product (snake_case). Plain zod with `.meta({ id })` so the
 * public API, its OpenAPI document and contract tests share one definition. Must not import the
 * database: `@coss/email/schemas` is safe to load anywhere.
 */
import { BILLING_EVENT_TYPES } from "@coss/billing/wire";
import { ACCOUNT_EVENT_TYPES } from "@coss/reputation/schemas";
import { RISK_EVENT_TYPES } from "@coss/risk/schemas";
import { LATEST_API_VERSION } from "@coss/versioning";
import { HOOK_OPERATIONAL_EVENT_TYPES } from "@coss/webhooks/schemas";
import { z } from "zod";
import {
  EmailTemplateReference,
  TemplateLocale,
  TemplateVariableValues,
} from "./template-schemas.ts";

export * from "./template-schemas.ts";

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
    unsubscribe: z
      .boolean()
      .optional()
      .meta({
        description:
          "Add one-click unsubscribe headers (`List-Unsubscribe` and `List-Unsubscribe-Post`, " +
          "RFC 8058). An unsubscribe suppresses the recipient for this email's category and " +
          "records `email.unsubscribed`. Needs a `category`, a single recipient, no " +
          "`List-Unsubscribe` header of your own and at most 13 custom headers.",
      }),
  })
  .meta({
    id: "TrackingOptions",
    description:
      "Overrides the environment's tracking settings (its default, or the rule for this " +
      "email's category) for this email. Omitted fields keep the configured setting.",
  });

/** Header names whose presence means the customer handles unsubscribes themselves. */
export const LIST_UNSUBSCRIBE_HEADERS = ["list-unsubscribe", "list-unsubscribe-post"] as const;

/**
 * Custom headers an email can have and still get COSS's two unsubscribe headers: providers take
 * at most `MAX_HEADERS` in all (SES's limit for a simple message).
 */
export const MAX_HEADERS_WITH_UNSUBSCRIBE = MAX_HEADERS - LIST_UNSUBSCRIBE_HEADERS.length;

export type TrackingOptionsOutput = z.output<typeof TrackingOptions>;

const ScheduledAt = z.iso.datetime({
  offset: true,
  error: "Expected an ISO 8601 date-time with a time zone offset.",
});

const TOO_FAR_AHEAD_MESSAGE = "An email can be scheduled at most 30 days ahead.";

function tooFarAhead(scheduledAt: string): boolean {
  return Date.parse(scheduledAt) > Date.now() + MAX_SCHEDULE_AHEAD_MS;
}

/** Rules for an email's subject, sent as is or rendered from a template. */
export const EmailSubject = z
  .string()
  .min(1, "Subject must not be empty.")
  .max(SUBJECT_MAX_LENGTH, `Subject can be at most ${SUBJECT_MAX_LENGTH} characters.`)
  .refine((value) => !CONTROL_CHARACTERS.test(value), {
    message: "Subject must not contain control characters (CR, LF, NUL, …).",
  })
  .refine((value) => !FORMAT_CHARACTERS.test(value), {
    message: "Subject must not contain invisible formatting characters.",
  });

const TEMPLATE_PROVIDED = ["subject", "html", "text"] as const;
const TEMPLATE_ONLY = ["template_version", "locale", "variables"] as const;

const SendEmailRequestFields = z.strictObject({
  from: EmailAddress,
  to: addressList(1),
  cc: addressList(0).optional(),
  bcc: addressList(0).optional(),
  reply_to: addressList(0).optional(),
  subject: EmailSubject.optional().meta({
    description: "Required unless the email is sent from a template (`template_id`).",
  }),
  html: z.string().optional().meta({ description: "HTML body. Provide `html`, `text`, or both." }),
  text: z.string().optional().meta({
    description:
      "Plain-text body. Without it, an `html` email goes out with a text part generated from the HTML.",
  }),
  template_id: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .meta({
      description:
        "Send a published email template (its id or alias) instead of `subject`, `html` and " +
        "`text`.",
      examples: ["welcome"],
    }),
  template_version: z.number().int().min(1).optional().meta({
    description: "A published version of the template to send. Defaults to the latest one.",
  }),
  locale: TemplateLocale.optional().meta({
    description:
      'The template locale to send, e.g. "pt-BR". Falls back to the language ("pt"), then ' +
      "to the template's default locale.",
  }),
  variables: TemplateVariableValues.optional().meta({
    description: "Values for the template's variables, keyed by name.",
  }),
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
  if (value.template_id !== undefined) {
    for (const field of TEMPLATE_PROVIDED) {
      if (value[field] !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "Not allowed with `template_id`: the template provides it.",
        });
      }
    }
  } else {
    if (value.subject === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["subject"],
        message: "Provide `subject`, or send a template with `template_id`.",
      });
    }
    if (!value.html && !value.text) {
      ctx.addIssue({ code: "custom", path: ["html"], message: "Provide `html`, `text`, or both." });
    }
    for (const field of TEMPLATE_ONLY) {
      if (value[field] !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "Only allowed with `template_id`.",
        });
      }
    }
  }
  if (value.scheduled_at !== undefined && tooFarAhead(value.scheduled_at)) {
    ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: TOO_FAR_AHEAD_MESSAGE });
  }
  if (value.tracking?.unsubscribe === true) {
    const path = ["tracking", "unsubscribe"];
    if (value.category === undefined) {
      ctx.addIssue({
        code: "custom",
        path,
        message: "One-click unsubscribe needs a `category`: the unsubscribe is scoped to it.",
      });
    }
    if (unique.size > 1) {
      ctx.addIssue({
        code: "custom",
        path,
        message:
          "One-click unsubscribe needs a single recipient across to, cc and bcc: send one " +
          "email per recipient.",
      });
    }
    const headerNames = Object.keys(value.headers ?? {}).map((name) => name.toLowerCase());
    if (LIST_UNSUBSCRIBE_HEADERS.some((name) => headerNames.includes(name))) {
      ctx.addIssue({
        code: "custom",
        path,
        message: "One-click unsubscribe can't be combined with your own List-Unsubscribe headers.",
      });
    }
    if (headerNames.length > MAX_HEADERS_WITH_UNSUBSCRIBE) {
      ctx.addIssue({
        code: "custom",
        path,
        message:
          `One-click unsubscribe adds ${LIST_UNSUBSCRIBE_HEADERS.length} headers: send at most ` +
          `${MAX_HEADERS_WITH_UNSUBSCRIBE} of your own.`,
      });
    }
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
    // `null` for template sends, whose content is rendered at send time.
    subject: value.subject ?? null,
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
            ...(value.tracking.unsubscribe === undefined
              ? {}
              : { unsubscribe: value.tracking.unsubscribe }),
          },
        }),
    // Only for template sends, for the same reason. The hash covers the request (template and
    // variables), never the rendered content.
    ...(value.template_id === undefined
      ? {}
      : {
          template_id: value.template_id,
          ...(value.template_version === undefined
            ? {}
            : { template_version: value.template_version }),
          ...(value.locale === undefined ? {} : { locale: value.locale }),
          variables: value.variables ?? {},
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
      {
        from: "Acme <onboarding@acme.com>",
        to: "user@example.com",
        template_id: "welcome",
        locale: "de",
        variables: { first_name: "Ada" },
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
  "email.unsubscribed",
] as const;

/** Engagement events: recorded by COSS's tracking endpoints, never change a recipient's status. */
export const ENGAGEMENT_EVENT_TYPES = [
  "email.opened",
  "email.clicked",
] as const satisfies readonly EmailEventType[];

export type EmailEventType = (typeof EMAIL_EVENT_TYPES)[number];

/** Events about received (inbound) emails. Not `email_event` rows: they have their own table. */
export const RECEIVED_EMAIL_EVENT_TYPES = ["email.received"] as const;

export type ReceivedEmailEventType = (typeof RECEIVED_EMAIL_EVENT_TYPES)[number];

/**
 * Every type a webhook endpoint can subscribe to: email events, received emails, the
 * organization's reputation changes (`account.*`) and billing events (`billing.*`), both
 * delivered to live environments only, and risk reviews (`risk.*`).
 */
export const WEBHOOK_EVENT_TYPES = [
  ...EMAIL_EVENT_TYPES,
  ...RECEIVED_EMAIL_EVENT_TYPES,
  ...ACCOUNT_EVENT_TYPES,
  ...HOOK_OPERATIONAL_EVENT_TYPES,
  ...BILLING_EVENT_TYPES,
  ...RISK_EVENT_TYPES,
] as const;
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

export const SUPPRESSION_REASONS = [
  "bounce",
  "complaint",
  "manual",
  "import",
  "unsubscribe",
] as const;

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
    "`manual`: added one by one through the API or dashboard. `import`: added by a bulk import. " +
    "`unsubscribe`: added by the recipient's one-click unsubscribe, scoped to the email's category.",
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
  unsubscribe: false,
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
    unsubscribe: z.boolean().meta({
      description: "Whether the email carries one-click unsubscribe headers (RFC 8058).",
    }),
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

export const EmailFailure = z
  .object({
    code: z.string().meta({
      description:
        "Why the email failed, e.g. `all_recipients_suppressed`, `domain_not_verified`, " +
        "`content_rejected`, `attachments_unavailable`, `dispatch_failed` or `provider_error`.",
      examples: ["all_recipients_suppressed"],
    }),
    message: z.string(),
  })
  .meta({
    id: "EmailFailure",
    examples: [
      { code: "all_recipients_suppressed", message: "Every recipient is on the suppression list." },
    ],
  });

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
    failure: z.union([EmailFailure, z.null()]).meta({
      description: "Why the email failed; `null` unless `status` is `failed`.",
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
    template: z.union([EmailTemplateReference, z.null()]).meta({
      description: "The template the email was rendered from; `null` if it was sent without one.",
    }),
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
        failure: null,
        recipients: [RECIPIENT_EXAMPLE],
        sandbox: false,
        tracking: TRACKING_EXAMPLE,
        attachments: [],
        created_at: "2026-10-10T12:00:00.000Z",
        sent_at: "2026-10-10T12:00:01.000Z",
        scheduled_at: null,
        batch_id: null,
        template: null,
      },
    ],
  });

export type EmailObjectOutput = z.output<typeof EmailObject>;

const SUMMARY_EXAMPLE = {
  object: "email",
  id: EMAIL_ID_EXAMPLE,
  from: "Acme <onboarding@acme.com>",
  to: ["user@example.com"],
  cc: [],
  bcc: [],
  reply_to: [],
  subject: "Welcome to Acme",
  tags: [{ name: "template", value: "welcome" }],
  category: "onboarding",
  status: "sent",
  failure: null,
  recipients: [RECIPIENT_EXAMPLE],
  sandbox: false,
  tracking: TRACKING_EXAMPLE,
  created_at: "2026-10-10T12:00:00.000Z",
  sent_at: "2026-10-10T12:00:01.000Z",
  scheduled_at: null,
  batch_id: null,
  template: null,
};

/** An email in a list: everything but its content (`html`, `text`, `headers`, `attachments`). */
export const EmailSummary = EmailObject.omit({
  html: true,
  text: true,
  headers: true,
  attachments: true,
}).meta({
  id: "EmailSummary",
  description:
    "An email without its content. Retrieve the email for `html`, `text`, `headers` and " +
    "`attachments`.",
  examples: [SUMMARY_EXAMPLE],
});

export type EmailSummaryOutput = z.output<typeof EmailSummary>;

export const EmailSummaryList = z
  .object({
    object: z.literal("list"),
    data: z.array(EmailSummary),
    has_more: z.boolean(),
  })
  .meta({
    id: "EmailSummaryList",
    examples: [{ object: "list", data: [SUMMARY_EXAMPLE], has_more: false }],
  });

export type EmailSummaryListOutput = z.output<typeof EmailSummaryList>;

export const DEFAULT_EMAIL_LIST_LIMIT = 20;
export const MAX_EMAIL_LIST_LIMIT = 100;

/** A comma-separated list of enum values (`status=failed,canceled`). */
function csvEnum<const T extends readonly [string, ...string[]]>(values: T, description: string) {
  const item = z.enum(values);
  return z
    .string()
    .transform((value, ctx) => {
      const out: T[number][] = [];
      for (const part of value.split(",").map((piece) => piece.trim())) {
        if (part.length === 0) continue;
        const parsed = item.safeParse(part);
        if (!parsed.success) {
          ctx.addIssue({ code: "custom", message: `Invalid value "${part}".` });
          return z.NEVER;
        }
        out.push(parsed.data);
      }
      return out;
    })
    .optional()
    .meta({ description });
}

export const ListEmailsQuery = z
  .strictObject({
    to: z
      .string()
      .trim()
      .min(1)
      .max(320)
      .transform((value) => value.toLowerCase())
      .optional()
      .meta({
        description:
          "Only emails with this recipient (in `to`, `cc` or `bcc`; the bare address, any case).",
        examples: ["user@example.com"],
      }),
    recipient_status: csvEnum(
      EMAIL_RECIPIENT_STATUSES,
      "Only emails with a recipient in one of these statuses, comma-separated: " +
        "`bounced,complained`. With `to`, that recipient's status.",
    ),
    status: csvEnum(EMAIL_STATUSES, "Only emails in these statuses, comma-separated: `failed`."),
    q: z
      .string()
      .max(256)
      .optional()
      .meta({ description: "Free text, matched against the subject and the `to` addresses." }),
    category: Category.optional().meta({ description: "Only emails of this category." }),
    batch_id: z.string().max(64).optional().meta({ description: "Only the emails of this batch." }),
    created_after: z.iso
      .datetime({ offset: true })
      .optional()
      .meta({ description: "Only emails created at or after this time." }),
    created_before: z.iso
      .datetime({ offset: true })
      .optional()
      .meta({ description: "Only emails created before this time." }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_EMAIL_LIST_LIMIT)
      .optional()
      .meta({ description: `1-${MAX_EMAIL_LIST_LIMIT}, default ${DEFAULT_EMAIL_LIST_LIMIT}.` }),
    after: z
      .string()
      .max(64)
      .optional()
      .meta({ description: "Cursor: the `id` of the last email of the previous page." }),
  })
  .meta({ description: "Emails are returned newest first." });

export type ListEmailsQueryOutput = z.output<typeof ListEmailsQuery>;

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
            failure: null,
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
            template: null,
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

export const BIMI_STATUSES = ["not_checked", "missing", "invalid", "configured"] as const;

export const BIMI_ISSUE_CODES = [
  "dmarc_missing",
  "dmarc_not_enforced",
  "dmarc_partial",
  "record_multiple",
  "record_invalid",
  "logo_missing",
  "logo_not_https",
  "certificate_missing",
  "certificate_not_https",
] as const;

export type BimiIssueCode = (typeof BIMI_ISSUE_CODES)[number];

/** What each BIMI issue means, rendered on read (the domain row stores only the codes). */
export const BIMI_ISSUE_MESSAGES: Record<BimiIssueCode, string> = {
  dmarc_missing:
    "The domain has no valid DMARC record (or more than one). BIMI needs DMARC at p=quarantine or p=reject.",
  dmarc_not_enforced:
    "The domain's DMARC policy is p=none (or sp=none for a subdomain). BIMI needs p=quarantine or p=reject.",
  dmarc_partial:
    "The domain's DMARC policy applies to only part of its mail (pct below 100, or t=y). BIMI needs it to apply to all of it.",
  record_multiple:
    "There is more than one v=BIMI1 record, which mailbox providers treat as no record. Keep one.",
  record_invalid:
    "The BIMI record is not valid: it must start with v=BIMI1 and list each tag only once.",
  logo_missing: "The BIMI record has no logo (l=). Point it at your SVG logo.",
  logo_not_https: "The logo URL (l=) must be an https:// URL.",
  certificate_missing:
    "The BIMI record has no certificate (a=). Gmail and Apple Mail show logos only with a VMC or CMC.",
  certificate_not_https: "The certificate URL (a=) must be an https:// URL.",
};

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
    value: "track.cosslinks.com",
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
const BIMI_EXAMPLE = {
  status: "configured",
  name: "default._bimi.acme.com",
  record: "v=BIMI1; l=https://acme.com/brand/logo.svg; a=https://acme.com/brand/vmc.pem",
  logo_url: "https://acme.com/brand/logo.svg",
  certificate_url: "https://acme.com/brand/vmc.pem",
  dmarc_policy: "reject",
  issues: [],
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
  receiving: null,
  bimi: BIMI_EXAMPLE,
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

export const DomainBimiObject = z
  .object({
    status: z.enum(BIMI_STATUSES).meta({
      description:
        "`configured` when the BIMI record is valid and DMARC is enforced, `invalid` when a " +
        "record exists but something is wrong (see `issues`), `missing` when there is no record, " +
        "and `not_checked` until DNS has been consulted. COSS checks DNS only: mailbox providers " +
        "still validate the logo and the certificate.",
    }),
    name: z.string().meta({
      description:
        "Where the BIMI record was found, or looked up when there is none: " +
        "`default._bimi.<domain>`, or the organizational domain's when only it has one.",
    }),
    record: z.string().nullable().meta({ description: "The `v=BIMI1` record found." }),
    logo_url: z.string().nullable().meta({ description: "The record's logo URL (`l=`)." }),
    certificate_url: z
      .string()
      .nullable()
      .meta({ description: "The record's VMC or CMC certificate URL (`a=`)." }),
    dmarc_policy: z
      .enum(["none", "quarantine", "reject"])
      .nullable()
      .meta({
        description:
          "The DMARC policy that applies to the domain (`sp` when it comes from a parent domain), " +
          "`null` without a DMARC record.",
      }),
    issues: z
      .array(z.object({ code: z.enum(BIMI_ISSUE_CODES), message: z.string() }))
      .meta({ description: "What keeps the domain's logo from showing, as far as DNS tells." }),
  })
  .meta({
    id: "DomainBimi",
    description:
      "The result of the last BIMI check: whether mailbox providers can find the domain's brand " +
      "logo and certificate. The record and the certificate are your own.",
    examples: [BIMI_EXAMPLE],
  });

export type DomainBimiObjectOutput = z.output<typeof DomainBimiObject>;

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

const RECEIVING_DOMAIN_EXAMPLE = {
  hostname: "inbound.acme.com",
  environment_id: "env_01k7c8m4q2f3e9v6t5r1n0p8yz",
  record: {
    type: "MX",
    name: "inbound.acme.com",
    value: "inbound-smtp.us-east-1.amazonaws.com",
    priority: 10,
    status: "verified",
    found: [],
  },
  created_at: "2026-01-15T09:45:00.000Z",
  last_checked_at: "2026-01-15T09:52:00.000Z",
} as const;

export const ReceivingDomainObject = z
  .object({
    hostname: z.string().meta({
      description: "The hostname that receives email: the domain itself or a subdomain of it.",
      examples: ["inbound.acme.com"],
    }),
    environment_id: z.string().meta({
      description: "The environment its received emails are delivered to.",
      examples: ["env_01k7c8m4q2f3e9v6t5r1n0p8yz"],
    }),
    record: z
      .object({
        type: z.literal("MX"),
        name: z.string().meta({ description: "The fully qualified record name to create." }),
        value: z.string().meta({ description: "The mail exchange the record must point at." }),
        priority: z.number().int(),
        status: z.enum(DOMAIN_RECORD_STATUSES).meta({
          description:
            "What the last DNS check saw: `verified` once the most preferred MX records point " +
            "at COSS. `not_checked` means DNS has not been consulted yet.",
        }),
        found: z
          .array(z.string())
          .meta({ description: "What DNS returned when it did not match." }),
      })
      .meta({
        description:
          "The MX record to publish, with the result of the last check. Mail for the hostname " +
          "is received as soon as it reaches COSS; the check only shows what DNS serves.",
      }),
    created_at: z.iso.datetime(),
    last_checked_at: z.iso.datetime().nullable(),
  })
  .meta({
    id: "ReceivingDomain",
    description:
      "A domain's receiving hostname: email sent to any address at it becomes a received email " +
      "of its environment.",
    examples: [RECEIVING_DOMAIN_EXAMPLE],
  });

export type ReceivingDomainObjectOutput = z.output<typeof ReceivingDomainObject>;

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
    // The receiving hostname (`null` when the domain doesn't receive email). A union, like `tracking`.
    receiving: z.union([ReceivingDomainObject, z.null()]),
    bimi: DomainBimiObject,
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
  unsubscribe: z.boolean(),
});

export type TrackingRuleInputOutput = z.output<typeof TrackingRuleInput>;

const TRACKING_RULE_ID_EXAMPLE = "etr_01k7c8m4q2f3e9v6t5r1n0p8yz";
const TRACKING_DEFAULT_EXAMPLE = {
  object: "tracking_rule",
  id: "etr_01k7c8k1d9w4x2b7n3m5q6r8st",
  category: null,
  opens: true,
  clicks: true,
  unsubscribe: false,
  created_at: "2026-01-15T09:30:00.000Z",
  updated_at: "2026-01-15T09:30:00.000Z",
} as const;
const TRACKING_RULE_EXAMPLE = {
  object: "tracking_rule",
  id: TRACKING_RULE_ID_EXAMPLE,
  category: "password-reset",
  opens: false,
  clicks: false,
  unsubscribe: false,
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
    unsubscribe: z.boolean().meta({
      description:
        "Whether emails get one-click unsubscribe headers (only emails with a category and a " +
        "single recipient).",
    }),
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
      "Open and click tracking and one-click unsubscribe settings of the API key's environment. " +
      "For each of `opens`, `clicks` and `unsubscribe`, a send's own `tracking` wins, then its " +
      "category's rule, then `default` (the environment default; `null` when none is set), " +
      "then off.",
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
    unsubscribe: z.boolean().optional().meta({
      description:
        "Add one-click unsubscribe headers to emails with a category and a single recipient.",
    }),
  })
  .refine(
    (value) =>
      value.opens !== undefined || value.clicks !== undefined || value.unsubscribe !== undefined,
    { error: "Provide opens, clicks or unsubscribe." },
  )
  .meta({
    id: "UpdateTrackingRuleRequest",
    description:
      "Fields left out keep their current value; a new rule starts with all off. A send's own " +
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

export const RECEIVED_EMAIL_STATUSES = ["received", "blocked"] as const;
export const RECEIVED_EMAIL_BLOCKED_REASONS = ["virus"] as const;
export const VERDICT_STATUSES = ["pass", "fail", "gray", "processing_failed"] as const;
export const ATTACHMENT_DISPOSITIONS = ["attachment", "inline"] as const;
export const DEFAULT_RECEIVED_EMAIL_LIST_LIMIT = 20;
export const MAX_RECEIVED_EMAIL_LIST_LIMIT = 100;

const RECEIVED_EMAIL_ID_EXAMPLE = "rcvd_01k7c8m4q2f3e9v6t5r1n0p8yz";
const RECEIVED_ATTACHMENT_EXAMPLE = {
  id: "rcvdatt_01k7c8m4r0c2b8w9y3d5f6g7h8",
  filename: "invoice.pdf",
  content_type: "application/pdf",
  content_id: null,
  disposition: "attachment",
  size: 48213,
} as const;
const VERDICTS_EXAMPLE = {
  spam: "pass",
  virus: "pass",
  spf: "pass",
  dkim: "pass",
  dmarc: "pass",
  dmarc_policy: null,
} as const;
const RECEIVED_EMAIL_SUMMARY_EXAMPLE = {
  object: "received_email",
  id: RECEIVED_EMAIL_ID_EXAMPLE,
  status: "received",
  blocked_reason: null,
  mail_from: "jane@example.com",
  recipients: ["support@inbound.acme.com"],
  from: "Jane Doe <jane@example.com>",
  to: ["support@inbound.acme.com"],
  cc: [],
  subject: "Re: Your order",
  message_id: "<CAF3k2m9qp4ld8sv@mail.example.com>",
  attachments: [RECEIVED_ATTACHMENT_EXAMPLE],
  size: 61432,
  spam: false,
  verdicts: VERDICTS_EXAMPLE,
  sandbox: false,
  received_at: "2026-10-10T12:00:00.000Z",
} as const;
const RECEIVED_EMAIL_EXAMPLE = {
  ...RECEIVED_EMAIL_SUMMARY_EXAMPLE,
  reply_to: [],
  in_reply_to: "<x7f3k2m9qp4ld8sv@acme.com>",
  references: ["<x7f3k2m9qp4ld8sv@acme.com>"],
  sent_at: "2026-10-10T11:59:58.000Z",
  headers: [
    { name: "From", value: "Jane Doe <jane@example.com>" },
    { name: "To", value: "support@inbound.acme.com" },
    { name: "Subject", value: "Re: Your order" },
  ],
  text: "Hi, the order arrived damaged.",
  html: "<p>Hi, the order arrived damaged.</p>",
  truncated: false,
} as const;

export const ReceivedEmailAttachmentObject = z
  .object({
    id: z.string(),
    filename: z.string().nullable().meta({ description: "`null` when the part named none." }),
    content_type: z.string(),
    content_id: z
      .string()
      .nullable()
      .meta({ description: "Set for parts the HTML references (`cid:` URLs)." }),
    disposition: z.enum(ATTACHMENT_DISPOSITIONS),
    size: z.number().int().meta({ description: "Size in bytes." }),
  })
  .meta({ id: "ReceivedEmailAttachment", examples: [RECEIVED_ATTACHMENT_EXAMPLE] });

const Verdict = z.union([z.enum(VERDICT_STATUSES), z.null()]);

export const ReceivedEmailVerdicts = z
  .object({
    spam: Verdict,
    virus: Verdict,
    spf: Verdict,
    dkim: Verdict,
    dmarc: Verdict,
    dmarc_policy: z.string().nullable().meta({
      description:
        "The sender domain's DMARC policy (`none`, `quarantine` or `reject`) when DMARC failed.",
    }),
  })
  .meta({
    id: "ReceivedEmailVerdicts",
    description:
      "What the receiving server concluded: `pass`, `fail`, `gray` (could not decide) or " +
      "`processing_failed`; `null` when the check did not run.",
    examples: [VERDICTS_EXAMPLE],
  });

const receivedEmailSummaryShape = {
  object: z.literal("received_email"),
  id: z.string().meta({ examples: [RECEIVED_EMAIL_ID_EXAMPLE] }),
  status: z.enum(RECEIVED_EMAIL_STATUSES).meta({
    description:
      "`received`, or `blocked` when the message carried a virus: then only its envelope and " +
      "verdicts are kept, never its content.",
  }),
  blocked_reason: z.union([z.enum(RECEIVED_EMAIL_BLOCKED_REASONS), z.null()]),
  mail_from: z.string().meta({
    description: "The envelope sender (`MAIL FROM`); empty for bounces.",
  }),
  recipients: z.array(z.string()).meta({
    description:
      "The envelope recipients this environment received the message for (Bcc'd addresses " +
      "included, other organizations' never).",
  }),
  from: z.string().nullable().meta({ description: "The `From` header." }),
  to: z.array(z.string()).meta({ description: "The `To` header's addresses." }),
  cc: z.array(z.string()).meta({ description: "The `Cc` header's addresses." }),
  subject: z.string().nullable(),
  message_id: z.string().nullable().meta({ description: "The `Message-ID` header." }),
  attachments: z.array(ReceivedEmailAttachmentObject),
  size: z.number().int().meta({ description: "Size of the raw message in bytes." }),
  spam: z.boolean().meta({ description: "Whether the spam verdict is `fail`." }),
  verdicts: ReceivedEmailVerdicts,
  sandbox: z.boolean().meta({ description: "Whether it was received by a sandbox environment." }),
  received_at: z.iso.datetime(),
};

export const ReceivedEmailSummary = z
  .object(receivedEmailSummaryShape)
  .meta({ id: "ReceivedEmailSummary", examples: [RECEIVED_EMAIL_SUMMARY_EXAMPLE] });

export type ReceivedEmailSummaryOutput = z.output<typeof ReceivedEmailSummary>;

export const ReceivedEmailObject = z
  .object({
    ...receivedEmailSummaryShape,
    reply_to: z.array(z.string()),
    in_reply_to: z.string().nullable(),
    references: z
      .array(z.string())
      .meta({ description: "Message ids of the `References` header." }),
    sent_at: z.iso.datetime().nullable().meta({ description: "The `Date` header, when valid." }),
    headers: z
      .array(z.object({ name: z.string(), value: z.string() }))
      .meta({ description: "Every header in message order (duplicates included)." }),
    text: z.string().nullable(),
    html: z.string().nullable(),
    truncated: z.boolean().meta({
      description:
        "Whether `text`, `html` or `headers` were shortened (2 MB per body, 64 KB of headers). " +
        "The raw message always has all of it.",
    }),
  })
  .meta({ id: "ReceivedEmail", examples: [RECEIVED_EMAIL_EXAMPLE] });

export type ReceivedEmailObjectOutput = z.output<typeof ReceivedEmailObject>;

export const ReceivedEmailList = z
  .object({
    object: z.literal("list"),
    data: z.array(ReceivedEmailSummary),
    has_more: z.boolean(),
  })
  .meta({
    id: "ReceivedEmailList",
    examples: [{ object: "list", data: [RECEIVED_EMAIL_SUMMARY_EXAMPLE], has_more: false }],
  });

export type ReceivedEmailListOutput = z.output<typeof ReceivedEmailList>;

export const ListReceivedEmailsQuery = z
  .strictObject({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_RECEIVED_EMAIL_LIST_LIMIT)
      .optional()
      .meta({
        description: `1-${MAX_RECEIVED_EMAIL_LIST_LIMIT}, default ${DEFAULT_RECEIVED_EMAIL_LIST_LIMIT}.`,
      }),
    after: z
      .string()
      .max(64)
      .optional()
      .meta({ description: "Cursor: the `id` of the last email of the previous page." }),
  })
  .meta({ description: "Received emails are returned newest first." });

export type ListReceivedEmailsQueryOutput = z.output<typeof ListReceivedEmailsQuery>;

export const DeletedReceivedEmail = z
  .object({
    object: z.literal("received_email"),
    id: z.string(),
    deleted: z.literal(true),
  })
  .meta({
    id: "DeletedReceivedEmail",
    examples: [{ object: "received_email", id: RECEIVED_EMAIL_ID_EXAMPLE, deleted: true }],
  });

export type DeletedReceivedEmailOutput = z.output<typeof DeletedReceivedEmail>;

export const InboundAddressObject = z
  .object({
    object: z.literal("inbound_address"),
    environment_id: z.string(),
    domain: z.string().meta({
      description:
        "Email sent to any address at this domain is received by the environment, with no DNS " +
        "setup. It never changes.",
    }),
  })
  .meta({
    id: "InboundAddress",
    examples: [
      {
        object: "inbound_address",
        environment_id: "env_01k7c8m4q2f3e9v6t5r1n0p8yz",
        domain: "k3j9x2m7qp4l.inbound.coss.com",
      },
    ],
  });

export type InboundAddressObjectOutput = z.output<typeof InboundAddressObject>;

export const CreateReceivingDomainRequest = z
  .strictObject({
    hostname: z
      .string()
      .min(1, "Enter a hostname, like inbound.acme.com.")
      .max(DOMAIN_NAME_MAX_LENGTH, `Hostnames can be at most ${DOMAIN_NAME_MAX_LENGTH} characters.`)
      .meta({
        description:
          "The domain itself or a subdomain of it, without a scheme or path. Point its MX at " +
          "COSS with the record the response lists. Using the domain itself moves all of its " +
          "mail to COSS, so a subdomain is usually the better choice.",
        examples: ["inbound.acme.com"],
      }),
  })
  .meta({ id: "CreateReceivingDomainRequest", examples: [{ hostname: "inbound.acme.com" }] });

export type CreateReceivingDomainRequestInput = z.input<typeof CreateReceivingDomainRequest>;

/**
 * Body of an `email.received` webhook request: who sent what to whom, never the content, the
 * headers or the Cc addresses (read those with the received email's id).
 */
export const ReceivedEmailWebhookEvent = z
  .object({
    id: z.string().meta({
      description: "The event id, and the `webhook-id` header.",
      examples: ["evt_01k7c8m4r0c2b8w9y3d5f6g7h9"],
    }),
    object: z.literal("event"),
    type: z.enum(RECEIVED_EMAIL_EVENT_TYPES),
    api_version: z.string().meta({
      description:
        "The API version (`Coss-Version`) this event is rendered in: the receiving endpoint's `api_version`.",
      examples: [LATEST_API_VERSION],
    }),
    created_at: z.iso.datetime(),
    data: z.object({
      received_email_id: z.string(),
      from: z.string().nullable(),
      to: z.array(z.string()),
      recipients: z.array(z.string()),
      subject: z.string().nullable(),
      message_id: z.string().nullable(),
      attachment_count: z.number().int(),
      size: z.number().int(),
      spam: z.boolean(),
      verdicts: ReceivedEmailVerdicts,
      sandbox: z.boolean(),
      received_at: z.iso.datetime(),
    }),
  })
  .meta({
    id: "ReceivedEmailWebhookEvent",
    examples: [
      {
        id: "evt_01k7c8m4r0c2b8w9y3d5f6g7h9",
        object: "event",
        type: "email.received",
        api_version: LATEST_API_VERSION,
        created_at: "2026-10-10T12:00:01.000Z",
        data: {
          received_email_id: RECEIVED_EMAIL_ID_EXAMPLE,
          from: RECEIVED_EMAIL_SUMMARY_EXAMPLE.from,
          to: RECEIVED_EMAIL_SUMMARY_EXAMPLE.to,
          recipients: RECEIVED_EMAIL_SUMMARY_EXAMPLE.recipients,
          subject: RECEIVED_EMAIL_SUMMARY_EXAMPLE.subject,
          message_id: RECEIVED_EMAIL_SUMMARY_EXAMPLE.message_id,
          attachment_count: 1,
          size: RECEIVED_EMAIL_SUMMARY_EXAMPLE.size,
          spam: false,
          verdicts: VERDICTS_EXAMPLE,
          sandbox: false,
          received_at: RECEIVED_EMAIL_SUMMARY_EXAMPLE.received_at,
        },
      },
    ],
  });

export type ReceivedEmailWebhookEventOutput = z.output<typeof ReceivedEmailWebhookEvent>;
/** What the outbox stores: delivery adds `api_version` when it renders the event for an endpoint. */
export type StoredReceivedEmailWebhookEvent = Omit<ReceivedEmailWebhookEventOutput, "api_version">;
