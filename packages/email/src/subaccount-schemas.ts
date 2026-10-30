/**
 * Public wire schemas of email sub-accounts (snake_case). Plain zod, no database imports: exported
 * as `@coss/email/subaccount-schemas`.
 */
import { z } from "zod";

export const SUBACCOUNT_STATUSES = ["active", "disabled", "deleting"] as const;
export type SubaccountStatus = (typeof SUBACCOUNT_STATUSES)[number];
export const SUBACCOUNT_REPUTATION_STATUSES = ["good", "warning", "paused"] as const;
export type SubaccountReputationStatus = (typeof SUBACCOUNT_REPUTATION_STATUSES)[number];

/** The customer's own id for a sub-account: what a send's `subaccount` may name instead of the id. */
export const SUBACCOUNT_UID = /^[A-Za-z0-9_.:@|-]{1,256}$/;
export const SUBACCOUNT_NAME_MAX_LENGTH = 256;
export const MAX_SUBACCOUNT_METADATA_KEYS = 16;
export const DEFAULT_SUBACCOUNT_LIST_LIMIT = 50;
export const MAX_SUBACCOUNT_LIST_LIMIT = 100;
/** The highest quota a customer can set (`integer` columns; the organization's quota applies too). */
export const MAX_SUBACCOUNT_QUOTA = 100_000_000;

const SUBACCOUNT_ID = "sub_01k7c8m4q2f3e9v6t5r1n0p8yz";
const CREATED = "2026-01-15T09:30:00.000Z";

const Timestamp = z.iso.datetime();

const Metadata = z
  .record(z.string().min(1).max(40), z.string().max(500))
  .refine((value) => Object.keys(value).length <= MAX_SUBACCOUNT_METADATA_KEYS, {
    message: `At most ${MAX_SUBACCOUNT_METADATA_KEYS} metadata keys.`,
  })
  .meta({
    description: `Your own key-value pairs (at most ${MAX_SUBACCOUNT_METADATA_KEYS}; keys up to 40 characters, values up to 500).`,
    examples: [{ plan: "pro" }],
  });

/** Why `uid` can't name a sub-account, or `null` when it can. */
export function subaccountUidProblem(uid: string): string | null {
  if (!SUBACCOUNT_UID.test(uid)) return "Use 1-256 letters, digits and . _ : @ | -";
  // A path segment: URLs resolve these to another path.
  if (uid === "." || uid === "..") return "A uid can't be `.` or `..`.";
  // Calls take an id or a uid, and a `sub_…` reference is looked up as an id.
  if (uid.startsWith("sub_")) return "A uid can't start with `sub_`: sub-account ids do.";
  return null;
}

const SubaccountUid = z.string().superRefine((value, ctx) => {
  const problem = subaccountUidProblem(value);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

const QuotaValue = z.number().int().min(1).max(MAX_SUBACCOUNT_QUOTA);

const QUOTAS_EXAMPLE = { recipients_per_day: 5000, recipients_per_second: 5, burst: 50 };

export const SubaccountQuotas = z
  .object({
    recipients_per_day: QuotaValue.nullable().meta({
      description: "Recipients it may send to per day; `null`: only your organization's quota.",
    }),
    recipients_per_second: QuotaValue.nullable().meta({
      description: "Recipients it may send to per second; `null`: only your organization's quota.",
    }),
    burst: QuotaValue.nullable().meta({
      description:
        "How many recipients a moment may take before the per-second rate applies; `null`: the per-second rate.",
    }),
  })
  .meta({ id: "SubaccountQuotas", examples: [QUOTAS_EXAMPLE] });

/** Quotas in a request: every field optional, `null` removes one. */
const SubaccountQuotasInput = z
  .strictObject({
    recipients_per_day: QuotaValue.nullable().optional(),
    recipients_per_second: QuotaValue.nullable().optional(),
    burst: QuotaValue.nullable().optional(),
  })
  .meta({
    description: "Fields left out keep their value; `null` removes a quota.",
    examples: [QUOTAS_EXAMPLE],
  });

const REPUTATION_EXAMPLE = {
  status: "good",
  trigger: null,
  changed_at: null,
  reinstated_at: null,
};

export const SubaccountReputation = z
  .object({
    status: z.enum(SUBACCOUNT_REPUTATION_STATUSES).meta({
      description:
        "`warning`: a rate is close to its limit. `paused`: its live sends are refused (`subaccount_paused`) until you reinstate it.",
    }),
    trigger: z.string().nullable().meta({
      description:
        "What last changed it, e.g. `bounce_rate`, `complaint_rate`, `content_screening`.",
    }),
    changed_at: Timestamp.nullable(),
    reinstated_at: Timestamp.nullable(),
  })
  .meta({ id: "SubaccountReputation", examples: [REPUTATION_EXAMPLE] });

const SUBACCOUNT_EXAMPLE = {
  object: "subaccount",
  id: SUBACCOUNT_ID,
  uid: "user_8812",
  name: "Acme Bakery",
  metadata: { plan: "pro" },
  status: "active",
  quotas: QUOTAS_EXAMPLE,
  reputation: REPUTATION_EXAMPLE,
  created_at: CREATED,
  updated_at: CREATED,
};

export const Subaccount = z
  .object({
    object: z.literal("subaccount"),
    id: z.string().meta({ examples: [SUBACCOUNT_ID] }),
    uid: z.string().nullable().meta({
      description:
        "Your own id for it (e.g. your user's id), unique in the environment. Every path and send that takes a sub-account accepts its `id` or its `uid`.",
    }),
    name: z.string(),
    metadata: z.record(z.string(), z.string()),
    status: z.enum(SUBACCOUNT_STATUSES).meta({
      description:
        "`disabled`: you turned it off (its sends are refused). `deleting`: its domains are being released.",
    }),
    quotas: SubaccountQuotas,
    reputation: SubaccountReputation,
    created_at: Timestamp,
    updated_at: Timestamp,
  })
  .meta({ id: "Subaccount", examples: [SUBACCOUNT_EXAMPLE] });
export type SubaccountOutput = z.output<typeof Subaccount>;

export const CreateSubaccountRequest = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(1)
      .max(SUBACCOUNT_NAME_MAX_LENGTH)
      .meta({ description: "A name for your own reference.", examples: ["Acme Bakery"] }),
    uid: SubaccountUid.optional().meta({
      description: "Your own id for it, to address it by instead of its `id`.",
      examples: ["user_8812"],
    }),
    metadata: Metadata.optional(),
    quotas: SubaccountQuotasInput.optional(),
  })
  .meta({
    id: "CreateSubaccountRequest",
    examples: [{ name: "Acme Bakery", uid: "user_8812", quotas: { recipients_per_day: 5000 } }],
  });
export type CreateSubaccountRequestOutput = z.output<typeof CreateSubaccountRequest>;

export const UpdateSubaccountRequest = z
  .strictObject({
    name: z.string().trim().min(1).max(SUBACCOUNT_NAME_MAX_LENGTH).optional(),
    uid: SubaccountUid.nullable().optional().meta({ description: "`null` removes it." }),
    metadata: Metadata.optional().meta({ description: "Replaces the metadata." }),
    status: z.enum(["active", "disabled"]).optional().meta({
      description: "`disabled` refuses its sends until it is `active` again.",
    }),
    quotas: SubaccountQuotasInput.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." })
  .meta({ id: "UpdateSubaccountRequest", examples: [{ status: "disabled" }] });
export type UpdateSubaccountRequestOutput = z.output<typeof UpdateSubaccountRequest>;

export const ListSubaccountsQuery = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_SUBACCOUNT_LIST_LIMIT)
      .optional()
      .meta({
        description: `1-${MAX_SUBACCOUNT_LIST_LIMIT}, default ${DEFAULT_SUBACCOUNT_LIST_LIMIT}.`,
      }),
    after: z
      .string()
      .optional()
      .meta({ description: "The last `id` of the previous page.", examples: [SUBACCOUNT_ID] }),
  })
  .meta({ id: "ListSubaccountsQuery" });

export const SubaccountList = z
  .object({ object: z.literal("list"), data: z.array(Subaccount), has_more: z.boolean() })
  .meta({
    id: "SubaccountList",
    examples: [{ object: "list", data: [SUBACCOUNT_EXAMPLE], has_more: false }],
  });
