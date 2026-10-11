/**
 * Public wire schemas for logs (snake_case). Plain zod with `.meta({ id })`, shared by the public
 * API, its OpenAPI document and the contract tests. Must not import the database:
 * `@coss/logs/schemas` is safe to load anywhere.
 */
import { z } from "zod";

export const LOG_SOURCES = ["api", "email", "webhook"] as const;
export type LogSource = (typeof LOG_SOURCES)[number];

export const LOG_LEVELS = ["info", "warning", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const DEFAULT_LOG_LIST_LIMIT = 50;
export const MAX_LOG_LIST_LIMIT = 100;
/** How long a range one query may cover (also the longest retention we offer). */
export const MAX_LOG_RANGE_MS = 31 * 24 * 60 * 60 * 1000;
/** The range when a query names none. */
export const DEFAULT_LOG_RANGE_MS = 60 * 60 * 1000;

export const LogSourceEnum = z.enum(LOG_SOURCES).meta({
  id: "LogSource",
  description:
    "`api`: a request to the API. `email`: an email event. `webhook`: a delivery attempt.",
});

export const LogLevelEnum = z.enum(LOG_LEVELS).meta({
  id: "LogLevel",
  description:
    "`error`: 5xx responses, bounces, complaints, failures. `warning`: 4xx responses, delays, " +
    "suppressions, failed webhook attempts that will be retried. `info`: everything else.",
});

const LOG_ID_EXAMPLE = "log_01k7c8m4q2f3e9v6t5r1n0p8yz";

const LOG_EXAMPLE = {
  object: "log",
  id: LOG_ID_EXAMPLE,
  occurred_at: "2026-01-15T09:30:00.000Z",
  source: "api",
  level: "info",
  type: "api.request",
  message: "POST /v1/emails 202",
  request_id: "req_01k7c8m4q2f3e9v6t5r1n0p8yz",
  api_key_id: "key_01k7c8m4q2f3e9v6t5r1n0p8yz",
  method: "POST",
  path: "/v1/emails",
  route: "/v1/emails",
  status_code: 202,
  duration_ms: 48,
  client_ip: "203.0.113.7",
  user_agent: "coss-node/0.1.0",
  error_code: null,
  resource_type: "email",
  resource_id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz",
  recipient: null,
  attributes: {
    request: { body: { from: "hello@example.com", to: ["user@example.com"], subject: "Hi" } },
    response: { body: { object: "email", id: "email_01k7c8m4q2f3e9v6t5r1n0p8yz" } },
  },
} as const;

export const LogEntry = z
  .object({
    object: z.literal("log"),
    id: z.string().meta({ examples: [LOG_ID_EXAMPLE] }),
    occurred_at: z.iso.datetime(),
    source: LogSourceEnum,
    level: LogLevelEnum,
    type: z.string().meta({
      description:
        "`api.request`, `webhook.attempt`, or an email event type such as `email.delivered`.",
    }),
    message: z.string().meta({ description: "A one-line summary." }),
    request_id: z
      .string()
      .nullable()
      .meta({ description: "The `X-Request-Id` of the API request this line belongs to." }),
    api_key_id: z.string().nullable(),
    method: z.string().nullable(),
    path: z.string().nullable(),
    route: z.string().nullable().meta({ description: "The matched route, e.g. `/v1/emails/:id`." }),
    status_code: z
      .number()
      .int()
      .nullable()
      .meta({ description: "The API response status, or the webhook endpoint's response status." }),
    duration_ms: z.number().int().nullable(),
    client_ip: z.string().nullable(),
    user_agent: z.string().nullable(),
    error_code: z.string().nullable(),
    resource_type: z
      .string()
      .nullable()
      .meta({ description: "What the line is about: `email`, `domain`, `webhook_endpoint`…" }),
    resource_id: z.string().nullable(),
    recipient: z.string().nullable(),
    attributes: z.record(z.string(), z.unknown()).meta({
      description:
        "Details: redacted request and response bodies for API requests (secrets, attachment " +
        "contents and long strings are never stored), event data for emails and webhooks.",
    }),
  })
  .meta({ id: "Log", examples: [LOG_EXAMPLE] });

export type LogEntryOutput = z.output<typeof LogEntry>;

export const LogList = z
  .object({
    object: z.literal("list"),
    data: z.array(LogEntry),
    has_more: z.boolean(),
  })
  .meta({
    id: "LogList",
    examples: [{ object: "list", data: [LOG_EXAMPLE], has_more: false }],
  });

export type LogListOutput = z.output<typeof LogList>;

/** A comma-separated list (`level=warning,error`), each item validated. */
function csv<T extends z.ZodType<string>>(item: T, description: string) {
  return z
    .string()
    .transform((value, ctx) => {
      const items = value
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      const out: z.output<T>[] = [];
      for (const part of items) {
        const parsed = item.safeParse(part);
        if (!parsed.success) {
          ctx.addIssue({ code: "custom", message: `Invalid value "${part}".` });
          return z.NEVER;
        }
        out.push(parsed.data as z.output<T>);
      }
      return out;
    })
    .optional()
    .meta({ description });
}

export const STATUS_FILTER = /^[1-5](?:xx|\d\d)$/;

export const ListLogsQuery = z
  .strictObject({
    from: z.iso
      .datetime({ offset: true })
      .optional()
      .meta({ description: "Start of the range (inclusive). Defaults to an hour before `to`." }),
    to: z.iso
      .datetime({ offset: true })
      .optional()
      .meta({ description: "End of the range (exclusive). Defaults to now. At most 31 days." }),
    source: csv(LogSourceEnum, "Only these sources, comma-separated: `api,email,webhook`."),
    level: csv(LogLevelEnum, "Only these levels, comma-separated: `warning,error`."),
    type: csv(
      z.string().min(1).max(64),
      "Only these types, e.g. `email.bounced,email.complained`.",
    ),
    status: csv(
      z.string().regex(STATUS_FILTER),
      "Only these status codes or classes, e.g. `4xx,503`.",
    ),
    method: csv(
      z
        .string()
        .regex(/^[A-Za-z]{3,7}$/)
        .transform((value) => value.toUpperCase()),
      "Only these HTTP methods, e.g. `POST`.",
    ),
    route: csv(z.string().min(1).max(256), "Only these routes, e.g. `/v1/emails/:id`."),
    api_key_id: csv(z.string().min(1).max(64), "Only requests made with these API keys."),
    request_id: z.string().max(64).optional().meta({ description: "Only this request's lines." }),
    resource_id: z
      .string()
      .max(64)
      .optional()
      .meta({ description: "Only lines about this resource, e.g. an `email_…` id." }),
    q: z
      .string()
      .max(256)
      .optional()
      .meta({ description: "Free text, matched against the message, path, ids and recipient." }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_LOG_LIST_LIMIT)
      .optional()
      .meta({ description: `1-${MAX_LOG_LIST_LIMIT}, default ${DEFAULT_LOG_LIST_LIMIT}.` }),
    after: z
      .string()
      .optional()
      .meta({ description: "Cursor: the `id` of the last line of the previous page." }),
  })
  .meta({ description: "Lines are returned newest first." });

export type ListLogsQueryOutput = z.output<typeof ListLogsQuery>;

/** Org audit log entries (dashboard only, no public API). */
export type OrgAuditActorType = "user" | "api_key" | "system";

export type OrgAuditEventOutput = {
  id: string;
  created_at: string;
  actor_type: OrgAuditActorType;
  actor_id: string | null;
  actor_label: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  project_id: string | null;
  environment_id: string | null;
  metadata: Record<string, unknown>;
  client_ip: string | null;
  user_agent: string | null;
};
