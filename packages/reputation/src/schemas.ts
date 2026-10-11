/**
 * The reputation guard's policy and public wire schemas (snake_case). Plain zod, no database
 * imports: `@coss/reputation/schemas` is safe to load anywhere.
 */
import { z } from "zod";

export const REPUTATION_STATUSES = ["good", "warning", "suspended"] as const;
export type ReputationStatus = (typeof REPUTATION_STATUSES)[number];

export const CHECK_SEVERITIES = ["ok", "warning", "suspend"] as const;
export type CheckSeverity = (typeof CHECK_SEVERITIES)[number];

/** Webhook event types announcing standing changes (delivered to live environments only). */
export const ACCOUNT_EVENT_TYPES = [
  "account.reputation_warning",
  "account.reputation_recovered",
  "account.suspended",
  "account.reinstated",
] as const;
export type AccountEventType = (typeof ACCOUNT_EVENT_TYPES)[number];

/**
 * Customer-facing names of the triggers behind a standing (dashboard and notification emails).
 * Add an entry with every new trigger; unknown triggers show as is.
 */
export const TRIGGER_LABELS: Readonly<Record<string, string>> = {
  bounce_rate: "Bounce rate",
  complaint_rate: "Complaint rate",
  content_screening: "Content screening",
  manual: "COSS review",
  policy: "Policy",
  evaluation: "Evaluation",
};

export function triggerLabel(trigger: string | null): string {
  if (!trigger) return "—";
  return TRIGGER_LABELS[trigger] ?? trigger;
}

// ---------------------------------------------------------------------------------------------
// Policy (internal, camelCase): the defaults plus per-organization overrides set by admins.
// ---------------------------------------------------------------------------------------------

const Rate = z.number().min(0).max(1);

export const RateThreshold = z
  .strictObject({
    /** Rate at or above which the organization is warned. */
    warning: Rate,
    /** Rate at or above which live sending is suspended. */
    suspend: Rate,
    /** Below this many recipients in the window the rate is reported but never acted on. */
    minimumRecipients: z.int().min(1),
  })
  .refine((value) => value.warning <= value.suspend, {
    message: "The warning threshold can't be above the suspension threshold.",
  });
export type RateThreshold = z.output<typeof RateThreshold>;

const Probability = z.number().min(0).max(1);

/**
 * AI content screening of a sample of each organization's live messages (`@coss/screening`).
 * The highest category probability decides: at `blockThreshold` the message is refused and the
 * organization suspended, at `flagThreshold` it is sent but the organization is warned.
 */
export const ContentScreeningPolicy = z
  .strictObject({
    enabled: z.boolean(),
    /** Off (shadow mode): verdicts are only recorded; nothing is blocked, warned or suspended. */
    enforce: z.boolean(),
    blockThreshold: Probability,
    flagThreshold: Probability,
    /** Every one of the organization's first N live messages is screened. */
    alwaysFirst: z.int().min(0).max(1000),
    /** Later messages at these positions are screened too. */
    milestones: z.array(z.int().min(1)).max(50),
    /** Every other message is screened with this probability (unpredictable, so it can't be gamed). */
    sampleRate: Probability,
  })
  .refine((value) => value.flagThreshold <= value.blockThreshold, {
    message: "The flag threshold can't be above the block threshold.",
  });
export type ContentScreeningPolicy = z.output<typeof ContentScreeningPolicy>;

export const ReputationPolicy = z.strictObject({
  /** Rolling window the rates are measured over (never before the last reinstatement). */
  windowDays: z.int().min(1).max(30),
  /** Permanent bounces / recipients. */
  bounceRate: RateThreshold,
  /** Complaints / recipients. */
  complaintRate: RateThreshold,
  /** Count mailbox-simulator recipients (testing only: SES itself never counts them). */
  countSimulatorRecipients: z.boolean(),
  contentScreening: ContentScreeningPolicy,
});
export type ReputationPolicy = z.output<typeof ReputationPolicy>;

/**
 * Stricter than SES (which reviews accounts at 5% bounces / 0.1% complaints and may pause them
 * at 10% / 0.5%), so COSS acts on an organization before AWS acts on the shared account.
 */
export const DEFAULT_REPUTATION_POLICY: ReputationPolicy = {
  windowDays: 7,
  bounceRate: { warning: 0.04, suspend: 0.08, minimumRecipients: 200 },
  complaintRate: { warning: 0.0008, suspend: 0.003, minimumRecipients: 500 },
  countSimulatorRecipients: false,
  contentScreening: {
    enabled: true,
    enforce: true,
    blockThreshold: 0.95,
    flagThreshold: 0.7,
    alwaysFirst: 10,
    milestones: [25, 50, 100, 250, 500, 1000],
    sampleRate: 0.02,
  },
};

export const ReputationPolicyOverrides = z.strictObject({
  windowDays: z.int().min(1).max(30).optional(),
  bounceRate: z
    .strictObject({
      warning: Rate.optional(),
      suspend: Rate.optional(),
      minimumRecipients: z.int().min(1).optional(),
    })
    .optional(),
  complaintRate: z
    .strictObject({
      warning: Rate.optional(),
      suspend: Rate.optional(),
      minimumRecipients: z.int().min(1).optional(),
    })
    .optional(),
  countSimulatorRecipients: z.boolean().optional(),
  contentScreening: z
    .strictObject({
      enabled: z.boolean().optional(),
      enforce: z.boolean().optional(),
      blockThreshold: Probability.optional(),
      flagThreshold: Probability.optional(),
      alwaysFirst: z.int().min(0).max(1000).optional(),
      milestones: z.array(z.int().min(1)).max(50).optional(),
      sampleRate: Probability.optional(),
    })
    .optional(),
});
export type ReputationPolicyOverrides = z.output<typeof ReputationPolicyOverrides>;

/** The defaults with `overrides` applied; throws a `ZodError` if the result is inconsistent. */
export function effectivePolicy(overrides: unknown): ReputationPolicy {
  if (overrides == null) return DEFAULT_REPUTATION_POLICY;
  const parsed = ReputationPolicyOverrides.parse(overrides);
  return ReputationPolicy.parse({
    ...DEFAULT_REPUTATION_POLICY,
    ...parsed,
    bounceRate: { ...DEFAULT_REPUTATION_POLICY.bounceRate, ...parsed.bounceRate },
    complaintRate: { ...DEFAULT_REPUTATION_POLICY.complaintRate, ...parsed.complaintRate },
    contentScreening: {
      ...DEFAULT_REPUTATION_POLICY.contentScreening,
      ...parsed.contentScreening,
    },
  });
}

// ---------------------------------------------------------------------------------------------
// Wire schemas
// ---------------------------------------------------------------------------------------------

export const ReputationCheckObject = z
  .object({
    trigger: z.string().meta({
      description: "What was measured, e.g. `bounce_rate` or `complaint_rate`.",
      example: "bounce_rate",
    }),
    severity: z.enum(CHECK_SEVERITIES).meta({
      description:
        "`ok`, `warning` (at or above the warning threshold) or `suspend` (at or above the " +
        "suspension threshold).",
    }),
    message: z.string(),
    rate: z.number().nullable().meta({ description: "`count / volume`; `null` with no volume." }),
    count: z.int().meta({ description: "Matching recipients, e.g. permanent bounces." }),
    volume: z.int().meta({ description: "Recipients sent to (live environments) in the window." }),
    warning_threshold: z.number().nullable(),
    suspend_threshold: z.number().nullable(),
    minimum_volume: z.int().nullable().meta({
      description: "Below this volume the rate is reported but never acted on.",
    }),
  })
  .meta({ id: "ReputationCheck" });
export type ReputationCheckObjectOutput = z.output<typeof ReputationCheckObject>;

export const ReputationObject = z
  .object({
    object: z.literal("reputation"),
    status: z.enum(REPUTATION_STATUSES).meta({
      description:
        "`good`, `warning` (a rate is approaching the suspension threshold) or `suspended` " +
        "(live sending is refused until COSS support reinstates the organization).",
    }),
    reason: z.string().nullable().meta({
      description: "The trigger behind a `warning` or `suspended` status.",
      example: "complaint_rate",
    }),
    status_changed_at: z.iso.datetime().nullable(),
    evaluated_at: z.iso.datetime().nullable().meta({
      description: "When the checks below were computed; `null` before the first evaluation.",
    }),
    window: z
      .object({ start: z.iso.datetime(), end: z.iso.datetime() })
      .nullable()
      .meta({ description: "The period the checks cover (live environments only)." }),
    checks: z.array(ReputationCheckObject),
  })
  .meta({ id: "Reputation" });
export type ReputationObjectOutput = z.output<typeof ReputationObject>;

export const AccountWebhookEvent = z
  .object({
    id: z.string().meta({
      description: "The event id, also sent as the `webhook-id` header.",
      example: "evt_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }),
    object: z.literal("event"),
    type: z.enum(ACCOUNT_EVENT_TYPES),
    created_at: z.iso.datetime(),
    data: z.object({
      organization_id: z.string(),
      status: z.enum(REPUTATION_STATUSES),
      previous_status: z.enum(REPUTATION_STATUSES),
      reason: z.string().nullable(),
      occurred_at: z.iso.datetime(),
      checks: z.array(ReputationCheckObject),
    }),
  })
  .meta({ id: "AccountWebhookEvent" });
export type AccountWebhookEventOutput = z.output<typeof AccountWebhookEvent>;
