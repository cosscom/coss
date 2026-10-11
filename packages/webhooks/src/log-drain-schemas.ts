/**
 * Public wire schemas for log drains (snake_case). Plain zod, no database imports; re-exported by
 * `@coss/webhooks/schemas`.
 */
import { LOG_DRAIN_SOURCES } from "@coss/logs/schemas";
import { z } from "zod";

export const LOG_DRAIN_URL_MAX_LENGTH = 2048;
export const LOG_DRAIN_DESCRIPTION_MAX_LENGTH = 256;
export const LOG_DRAIN_BATCH_STATUSES = ["pending", "succeeded", "failed"] as const;
export const LOG_DRAIN_DISABLED_REASONS = ["manual", "failing"] as const;
export type LogDrainDisabledReason = (typeof LOG_DRAIN_DISABLED_REASONS)[number];
export const DEFAULT_LOG_DRAIN_BATCH_LIST_LIMIT = 50;
export const MAX_LOG_DRAIN_BATCH_LIST_LIMIT = 100;

const SOURCES_DESCRIPTION =
  "What the drain forwards: `api` (requests made with the environment's API keys), `email` " +
  "(email events), `webhook` (webhook delivery attempts) and `audit` (changes to the " +
  "environment, from the organization's audit log). An empty array means every source, " +
  "including ones added later.";

export const LogDrainSourceEnum = z.enum(LOG_DRAIN_SOURCES).meta({
  id: "LogDrainSource",
  description: SOURCES_DESCRIPTION,
});

const DRAIN_ID_EXAMPLE = "drain_01k7c8m4q2f3e9v6t5r1n0p8yz";
const DRAIN_EXAMPLE = {
  object: "log_drain",
  id: DRAIN_ID_EXAMPLE,
  url: "https://logs.example.com/coss",
  description: "Production logs",
  sources: ["api", "email"],
  enabled: true,
  disabled_reason: null,
  disabled_at: null,
  created_at: "2026-01-15T09:30:00.000Z",
  updated_at: "2026-01-15T09:30:00.000Z",
};

export const LogDrainObject = z
  .object({
    object: z.literal("log_drain"),
    id: z.string().meta({ examples: [DRAIN_ID_EXAMPLE] }),
    url: z.string().meta({ examples: ["https://logs.example.com/coss"] }),
    description: z.string().nullable(),
    sources: z.array(LogDrainSourceEnum).meta({ description: SOURCES_DESCRIPTION }),
    enabled: z.boolean().meta({
      description:
        "A disabled drain receives nothing, and lines logged while it is disabled are not kept for it.",
    }),
    disabled_reason: z
      .enum(LOG_DRAIN_DISABLED_REASONS)
      .nullable()
      .meta({
        description:
          "`manual`: someone disabled it. `failing`: a batch failed every attempt, so COSS disabled " +
          "it. `null` while enabled.",
      }),
    disabled_at: z.iso.datetime().nullable(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .meta({ id: "LogDrain", examples: [DRAIN_EXAMPLE] });

export type LogDrainObjectOutput = z.output<typeof LogDrainObject>;

export const LogDrainWithSecret = LogDrainObject.extend({
  secret: z.string().meta({
    description:
      "The drain's `whsec_…` signing secret, used to verify the batches COSS sends. Returned only " +
      "when the drain is created — store it now; it cannot be read back through the API.",
    examples: ["whsec_6Jk…"],
  }),
}).meta({
  id: "LogDrainWithSecret",
  examples: [{ ...DRAIN_EXAMPLE, secret: "whsec_6Jk…" }],
});

export type LogDrainWithSecretOutput = z.output<typeof LogDrainWithSecret>;

export const LogDrainList = z
  .object({
    object: z.literal("list"),
    data: z.array(LogDrainObject),
    has_more: z.boolean(),
  })
  .meta({
    id: "LogDrainList",
    examples: [{ object: "list", data: [DRAIN_EXAMPLE], has_more: false }],
  });

export type LogDrainListOutput = z.output<typeof LogDrainList>;

export const DeletedLogDrain = z
  .object({
    object: z.literal("log_drain"),
    id: z.string(),
    deleted: z.literal(true),
  })
  .meta({
    id: "DeletedLogDrain",
    examples: [{ object: "log_drain", id: DRAIN_ID_EXAMPLE, deleted: true }],
  });

export type DeletedLogDrainOutput = z.output<typeof DeletedLogDrain>;

const Url = z
  .string()
  .min(1, "Enter a full URL, like https://logs.example.com/coss.")
  .max(LOG_DRAIN_URL_MAX_LENGTH, `URLs can be at most ${LOG_DRAIN_URL_MAX_LENGTH} characters.`)
  .meta({
    description: "An `https://` URL COSS posts batches of log lines to.",
    examples: ["https://logs.example.com/coss"],
  });

const Description = z
  .string()
  .max(
    LOG_DRAIN_DESCRIPTION_MAX_LENGTH,
    `Can be at most ${LOG_DRAIN_DESCRIPTION_MAX_LENGTH} characters.`,
  )
  .meta({ description: "A note for your own reference. `null` clears it." });

const Sources = z
  .array(LogDrainSourceEnum)
  .max(LOG_DRAIN_SOURCES.length)
  .meta({ description: SOURCES_DESCRIPTION });

export const CreateLogDrainRequest = z
  .strictObject({
    url: Url,
    description: Description.nullish(),
    sources: Sources.optional().meta({
      description: `${SOURCES_DESCRIPTION} Defaults to every source.`,
    }),
  })
  .meta({
    id: "CreateLogDrainRequest",
    examples: [
      {
        url: "https://logs.example.com/coss",
        description: "Production logs",
        sources: ["api", "email"],
      },
    ],
  });

export type CreateLogDrainRequestOutput = z.output<typeof CreateLogDrainRequest>;

export const UpdateLogDrainRequest = z
  .strictObject({
    url: Url.optional(),
    description: Description.nullish(),
    sources: Sources.optional(),
    enabled: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    error: "Provide at least one field to update.",
  })
  .meta({ id: "UpdateLogDrainRequest", examples: [{ enabled: false }] });

export type UpdateLogDrainRequestOutput = z.output<typeof UpdateLogDrainRequest>;

const BATCH_ID_EXAMPLE = "drainbat_01k7c8n2b5d7f9h1k3m5p7r9tv";
const DRAIN_ATTEMPT_EXAMPLE = {
  object: "log_drain_attempt",
  id: "drainatt_01k7c8n2c9e1g3j5l7n9q1s3uw",
  attempted_at: "2026-01-15T09:30:01.000Z",
  status_code: 200,
  duration_ms: 182,
  error: null,
  response_excerpt: "ok",
};
const BATCH_EXAMPLE = {
  object: "log_drain_batch",
  id: BATCH_ID_EXAMPLE,
  drain_id: DRAIN_ID_EXAMPLE,
  status: "succeeded",
  line_count: 42,
  byte_size: 31_870,
  attempt_count: 1,
  next_attempt_at: null,
  last_status_code: 200,
  last_error: null,
  attempts: [DRAIN_ATTEMPT_EXAMPLE],
  created_at: "2026-01-15T09:30:00.000Z",
  updated_at: "2026-01-15T09:30:01.000Z",
};

export const LogDrainBatchStatusEnum = z.enum(LOG_DRAIN_BATCH_STATUSES).meta({
  id: "LogDrainBatchStatus",
  description:
    "`pending`: waiting for its next attempt. `succeeded`: the drain answered with a 2xx status. " +
    "`failed`: every attempt failed, or the drain was disabled.",
});

export const LogDrainAttemptObject = z
  .object({
    object: z.literal("log_drain_attempt"),
    id: z.string(),
    attempted_at: z.iso.datetime(),
    status_code: z
      .number()
      .int()
      .nullable()
      .meta({ description: "The drain's HTTP status; `null` when no response arrived." }),
    duration_ms: z.number().int(),
    error: z.string().nullable().meta({
      description: "Why the attempt failed (e.g. `HTTP 500`, a timeout); `null` on success.",
    }),
    response_excerpt: z
      .string()
      .nullable()
      .meta({ description: "At most 1 KB of the response body, as text." }),
  })
  .meta({ id: "LogDrainAttempt", examples: [DRAIN_ATTEMPT_EXAMPLE] });

export type LogDrainAttemptObjectOutput = z.output<typeof LogDrainAttemptObject>;

export const LogDrainBatchObject = z
  .object({
    object: z.literal("log_drain_batch"),
    id: z.string().meta({
      description: "The batch's id: the `webhook-id` header, the same on every attempt.",
      examples: [BATCH_ID_EXAMPLE],
    }),
    drain_id: z.string(),
    status: LogDrainBatchStatusEnum,
    line_count: z.number().int().meta({ description: "Lines in the batch (one per NDJSON line)." }),
    byte_size: z.number().int().meta({ description: "Size of the request body in bytes." }),
    attempt_count: z.number().int(),
    next_attempt_at: z.iso
      .datetime()
      .nullable()
      .meta({ description: "When the next attempt is due; `null` once the batch is finished." }),
    last_status_code: z.number().int().nullable(),
    last_error: z.string().nullable(),
    attempts: z
      .array(LogDrainAttemptObject)
      .meta({ description: "Every HTTP attempt of this batch, oldest first." }),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .meta({ id: "LogDrainBatch", examples: [BATCH_EXAMPLE] });

export type LogDrainBatchObjectOutput = z.output<typeof LogDrainBatchObject>;

export const LogDrainBatchList = z
  .object({
    object: z.literal("list"),
    data: z.array(LogDrainBatchObject),
    has_more: z.boolean(),
  })
  .meta({
    id: "LogDrainBatchList",
    examples: [{ object: "list", data: [BATCH_EXAMPLE], has_more: false }],
  });

export type LogDrainBatchListOutput = z.output<typeof LogDrainBatchList>;

export const ListLogDrainBatchesQuery = z.strictObject({
  status: LogDrainBatchStatusEnum.optional().meta({
    description: "Only batches with this status.",
  }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LOG_DRAIN_BATCH_LIST_LIMIT)
    .optional()
    .meta({
      description: `1-${MAX_LOG_DRAIN_BATCH_LIST_LIMIT}, default ${DEFAULT_LOG_DRAIN_BATCH_LIST_LIMIT}.`,
    }),
  after: z
    .string()
    .optional()
    .meta({ description: "Cursor: the `id` of the last batch of the previous page." }),
});

export type ListLogDrainBatchesQueryOutput = z.output<typeof ListLogDrainBatchesQuery>;
