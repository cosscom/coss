/**
 * Public wire schemas of broadcasts (snake_case). Plain zod, no database imports: exported as
 * `@coss/email/broadcast-schemas`.
 */
import { LATEST_API_VERSION } from "@coss/versioning";
import { z } from "zod";
import { BROADCAST_EVENT_TYPES } from "./contact-event-types.ts";
import {
  Category,
  emailAddressProblem,
  MAX_SCHEDULE_AHEAD_MS,
  SUBJECT_MAX_LENGTH,
} from "./schemas.ts";

export const BROADCAST_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "paused",
  "sent",
  "canceled",
  "failed",
] as const;
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

export { BROADCAST_EVENT_TYPES, type BroadcastEventType } from "./contact-event-types.ts";

/** Addresses a test send may go to. */
export const MAX_BROADCAST_TEST_RECIPIENTS = 5;
export const DEFAULT_BROADCAST_LIST_LIMIT = 50;
export const MAX_BROADCAST_LIST_LIMIT = 100;
const PREVIEW_TEXT_MAX_LENGTH = 500;
/** A broadcast's HTML (and text), frozen once it starts: one copy for all its emails. */
const BODY_MAX_LENGTH = 1_000_000;

const Timestamp = z.iso.datetime();
const NullableTimestamp = Timestamp.nullable();

const Address = z.string().superRefine((value, ctx) => {
  const problem = emailAddressProblem(value);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

const Subject = z
  .string()
  .min(1, "Subject must not be empty.")
  .max(SUBJECT_MAX_LENGTH)
  .refine((value) => !/[\p{Cc}]/u.test(value), {
    message: "Subject must not contain control characters (CR, LF, NUL, …).",
  });

const ScheduledAt = z.iso
  .datetime({ offset: true, error: "Expected an ISO 8601 date-time with a time zone offset." })
  .refine((value) => Date.parse(value) <= Date.now() + MAX_SCHEDULE_AHEAD_MS, {
    message: "A broadcast can be scheduled at most 30 days ahead.",
  });

const BroadcastFields = {
  name: z.string().trim().min(1).max(200).meta({ description: "Shown only to you." }),
  audience_id: z.string().optional().meta({ description: "Send to this audience…" }),
  segment_id: z.string().optional().meta({ description: "…or to this segment (one of the two)." }),
  topic: Category.optional().meta({
    description:
      "The topic the broadcast is about (its key): only contacts it reaches get it, and its " +
      "unsubscribe link leaves just that topic. It is the emails' `category`.",
  }),
  from: Address.meta({ examples: ["Acme <news@acme.com>"] }),
  reply_to: z.array(Address).max(10).optional(),
  subject: Subject.meta({
    description: "May use `{{{contact.<key>|fallback}}}` (e.g. `{{{contact.first_name|there}}}`).",
  }),
  preview_text: z.string().max(PREVIEW_TEXT_MAX_LENGTH).optional().meta({
    description: "The inbox preview line (a hidden preheader at the start of the HTML).",
  }),
  html: z
    .string()
    .max(BODY_MAX_LENGTH)
    .optional()
    .meta({
      description:
        "`{{{contact.<key>|fallback}}}` for contact fields and properties (escaped), and " +
        "`{{{unsubscribe_url}}}`, `{{{preferences_url}}}`, `{{{mailing_address}}}`; a footer with " +
        "the postal address and an unsubscribe link is added unless they are there.",
    }),
  text: z.string().max(BODY_MAX_LENGTH).optional(),
  tracking: z
    .strictObject({ opens: z.boolean().optional(), clicks: z.boolean().optional() })
    .optional(),
  rate_per_second: z.int().min(1).max(1000).optional().meta({
    description: "Recipients per second, at most the plan's marketing rate (the default).",
  }),
};

export const CreateBroadcastRequest = z
  .strictObject({
    ...BroadcastFields,
    send: z.boolean().optional().meta({ description: "Start sending right away." }),
    scheduled_at: ScheduledAt.optional().meta({
      description: "Start sending at this time (ISO 8601 with an offset, at most 30 days ahead).",
    }),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.audience_id) === Boolean(value.segment_id)) {
      ctx.addIssue({
        code: "custom",
        path: ["audience_id"],
        message: "Give exactly one of audience_id and segment_id.",
      });
    }
    if (!value.html && !value.text) {
      ctx.addIssue({ code: "custom", path: ["html"], message: "Provide `html`, `text`, or both." });
    }
    if (value.send && value.scheduled_at) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduled_at"],
        message: "Give send or scheduled_at, not both.",
      });
    }
  })
  .meta({
    id: "CreateBroadcastRequest",
    examples: [
      {
        name: "October newsletter",
        segment_id: "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
        topic: "newsletter",
        from: "Acme <news@acme.com>",
        subject: "What's new, {{{contact.first_name|there}}}",
        html: '<p>Hi {{{contact.first_name|there}}},</p><p>…</p><p><a href="{{{unsubscribe_url}}}">Unsubscribe</a></p>',
        scheduled_at: "2026-10-20T09:00:00Z",
      },
    ],
  });
export type CreateBroadcastRequestOutput = z.output<typeof CreateBroadcastRequest>;

export const UpdateBroadcastRequest = z
  .strictObject({
    name: BroadcastFields.name.optional(),
    audience_id: z.string().nullable().optional(),
    segment_id: z.string().nullable().optional(),
    topic: Category.nullable().optional(),
    from: BroadcastFields.from.optional(),
    reply_to: BroadcastFields.reply_to,
    subject: BroadcastFields.subject.optional(),
    preview_text: z.string().max(PREVIEW_TEXT_MAX_LENGTH).nullable().optional(),
    html: z.string().max(BODY_MAX_LENGTH).nullable().optional(),
    text: z.string().max(BODY_MAX_LENGTH).nullable().optional(),
    tracking: BroadcastFields.tracking,
    rate_per_second: z.int().min(1).max(1000).nullable().optional(),
  })
  .meta({ id: "UpdateBroadcastRequest", examples: [{ subject: "Our October news" }] });
export type UpdateBroadcastRequestOutput = z.output<typeof UpdateBroadcastRequest>;

export const SendBroadcastRequest = z
  .strictObject({
    scheduled_at: ScheduledAt.optional().meta({ description: "Omit to start right away." }),
  })
  .meta({ id: "SendBroadcastRequest", examples: [{ scheduled_at: "2026-10-20T09:00:00Z" }] });

export const TestBroadcastRequest = z
  .strictObject({
    to: z.array(Address).min(1).max(MAX_BROADCAST_TEST_RECIPIENTS),
    contact: z.string().optional().meta({
      description: "A contact (id or address) whose values fill the template; default: fallbacks.",
    }),
  })
  .meta({ id: "TestBroadcastRequest", examples: [{ to: ["me@acme.com"] }] });

export const ListBroadcastsQuery = z.strictObject({
  status: z.enum(BROADCAST_STATUSES).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_BROADCAST_LIST_LIMIT)
    .optional()
    .meta({
      description: `1-${MAX_BROADCAST_LIST_LIMIT}, default ${DEFAULT_BROADCAST_LIST_LIMIT}.`,
    }),
  after: z
    .string()
    .optional()
    .meta({ description: "Cursor: the `id` of the last broadcast of the previous page." }),
});
export type ListBroadcastsQueryOutput = z.output<typeof ListBroadcastsQuery>;

export const BroadcastStats = z
  .object({
    recipients: z.int().meta({ description: "Emails made so far (one per reached contact)." }),
    sent: z.int(),
    delivered: z.int(),
    bounced: z.int().meta({ description: "Permanent bounces." }),
    complained: z.int(),
    failed: z.int(),
    opened: z.int().meta({ description: "Emails opened at least once (with open tracking)." }),
    clicked: z.int().meta({ description: "Emails clicked at least once (with click tracking)." }),
    unsubscribed: z.int().meta({ description: "Unsubscribes through the broadcast's links." }),
  })
  .meta({ id: "BroadcastStats" });
export type BroadcastStatsOutput = z.output<typeof BroadcastStats>;

const STATS_EXAMPLE = {
  recipients: 1200,
  sent: 1200,
  delivered: 1180,
  bounced: 6,
  complained: 1,
  failed: 0,
  opened: 540,
  clicked: 120,
  unsubscribed: 4,
};

const BROADCAST_ID_EXAMPLE = "bcast_01k7c8m4q2f3e9v6t5r1n0p8yz";
const BROADCAST_EXAMPLE = {
  object: "broadcast",
  id: BROADCAST_ID_EXAMPLE,
  name: "October newsletter",
  status: "sent",
  audience_id: null,
  segment_id: "seg_01k7c8m4q2f3e9v6t5r1n0p8yz",
  topic: "newsletter",
  from: "Acme <news@acme.com>",
  reply_to: [],
  subject: "What's new, {{{contact.first_name|there}}}",
  preview_text: null,
  html: "<p>Hi {{{contact.first_name|there}}},</p>",
  text: null,
  tracking: { opens: true, clicks: true },
  rate_per_second: null,
  scheduled_at: "2026-10-20T09:00:00.000Z",
  started_at: "2026-10-20T09:00:01.000Z",
  completed_at: "2026-10-20T09:12:40.000Z",
  canceled_at: null,
  recipients_estimated: 1200,
  pause_reason: null,
  error: null,
  stats: STATS_EXAMPLE,
  created_at: "2026-10-15T12:00:00.000Z",
  updated_at: "2026-10-20T09:12:40.000Z",
} as const;

export const Broadcast = z
  .object({
    object: z.literal("broadcast"),
    id: z.string(),
    name: z.string(),
    status: z.enum(BROADCAST_STATUSES).meta({
      description:
        "`draft` (editable), `scheduled`, `sending`, `paused` (see `pause_reason`), `sent`, " +
        "`canceled`, or `failed` (see `error`).",
    }),
    audience_id: z.string().nullable(),
    segment_id: z.string().nullable(),
    topic: z.string().nullable(),
    from: z.string(),
    reply_to: z.array(z.string()),
    subject: z.string(),
    preview_text: z.string().nullable(),
    html: z.string().nullable(),
    text: z.string().nullable(),
    tracking: z.object({ opens: z.boolean(), clicks: z.boolean() }),
    rate_per_second: z.int().nullable(),
    scheduled_at: NullableTimestamp,
    started_at: NullableTimestamp,
    completed_at: NullableTimestamp,
    canceled_at: NullableTimestamp,
    recipients_estimated: z.int().nullable().meta({
      description: "How many contacts it would reach, counted when it started.",
    }),
    pause_reason: z
      .string()
      .nullable()
      .meta({
        description:
          "Why a paused broadcast waits: `paused` (by you), `billing_hold`, `usage_limit`, " +
          "`marketing_paused`, `account_suspended`, `sending_paused`.",
      }),
    error: z.object({ code: z.string(), message: z.string() }).nullable(),
    stats: BroadcastStats,
    created_at: Timestamp,
    updated_at: Timestamp,
  })
  .meta({ id: "Broadcast", examples: [BROADCAST_EXAMPLE] });
export type BroadcastOutput = z.output<typeof Broadcast>;

export const BroadcastList = z
  .object({ object: z.literal("list"), data: z.array(Broadcast), has_more: z.boolean() })
  .meta({
    id: "BroadcastList",
    examples: [{ object: "list", data: [BROADCAST_EXAMPLE], has_more: false }],
  });

export const DeletedBroadcast = z
  .object({ object: z.literal("broadcast"), id: z.string(), deleted: z.literal(true) })
  .meta({
    id: "DeletedBroadcast",
    examples: [{ object: "broadcast", id: BROADCAST_ID_EXAMPLE, deleted: true }],
  });

export const BroadcastTest = z
  .object({
    object: z.literal("broadcast_test"),
    email_ids: z.array(z.string()),
  })
  .meta({
    id: "BroadcastTest",
    examples: [{ object: "broadcast_test", email_ids: ["email_01k7c8m4q2f3e9v6t5r1n0p8yz"] }],
  });

/** Body of a `broadcast.*` webhook request. */
export const BroadcastWebhookEvent = z
  .object({
    id: z.string().meta({ examples: ["evt_01k7c8m4r0c2b8w9y3d5f6g7h9"] }),
    object: z.literal("event"),
    type: z.enum(BROADCAST_EVENT_TYPES),
    api_version: z.string().meta({
      description:
        "The API version (`Coss-Version`) this event is rendered in: the receiving endpoint's `api_version`.",
      examples: [LATEST_API_VERSION],
    }),
    created_at: Timestamp,
    data: z.object({
      broadcast: z.object({ id: z.string(), name: z.string(), status: z.enum(BROADCAST_STATUSES) }),
      pause_reason: z.string().nullable(),
      error: z.object({ code: z.string(), message: z.string() }).nullable(),
      stats: BroadcastStats,
      occurred_at: Timestamp,
    }),
  })
  .meta({
    id: "BroadcastWebhookEvent",
    examples: [
      {
        id: "evt_01k7c8m4r0c2b8w9y3d5f6g7h9",
        object: "event",
        type: "broadcast.sent",
        api_version: LATEST_API_VERSION,
        created_at: "2026-10-20T09:12:40.000Z",
        data: {
          broadcast: { id: BROADCAST_ID_EXAMPLE, name: "October newsletter", status: "sent" },
          pause_reason: null,
          error: null,
          stats: STATS_EXAMPLE,
          occurred_at: "2026-10-20T09:12:40.000Z",
        },
      },
    ],
  });
export type BroadcastWebhookEventOutput = z.output<typeof BroadcastWebhookEvent>;
export type StoredBroadcastWebhookEvent = Omit<BroadcastWebhookEventOutput, "api_version">;
