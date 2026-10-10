/**
 * Public wire schemas for the email product (snake_case). Plain zod with `.meta({ id })` so the
 * public API, its OpenAPI document and contract tests share one definition. Must not import the
 * database: `@coss/email/schemas` is safe to load anywhere.
 */
import { z } from "zod";

export const MAX_RECIPIENTS = 50;
export const MAX_HEADERS = 15;
export const MAX_TAGS = 50;
export const SUBJECT_MAX_LENGTH = 998;

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
const TAG_PART = /^[A-Za-z0-9_-]{1,256}$/;

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
  }))
  .meta({ id: "SendEmailRequest" });

export type SendEmailRequestInput = z.input<typeof SendEmailRequest>;
export type SendEmailRequestOutput = z.output<typeof SendEmailRequest>;

export const EMAIL_STATUSES = ["queued", "sent", "failed"] as const;

export const EmailObject = z
  .object({
    object: z.literal("email"),
    id: z.string().meta({ example: "email_01k7c8m4q2f3e9v6t5r1n0p8yz" }),
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
    status: z.enum(EMAIL_STATUSES),
    sandbox: z
      .boolean()
      .meta({ description: "True when sent from a sandbox environment (never delivered)." }),
    created_at: z.iso.datetime(),
    sent_at: z.iso.datetime().nullable(),
  })
  .meta({ id: "Email" });

export type EmailObjectOutput = z.output<typeof EmailObject>;
