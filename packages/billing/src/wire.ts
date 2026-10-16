/**
 * Billing's public wire schemas (snake_case): the API's `/v1/billing*` objects and the
 * `billing.*` webhook events. Amounts are integers in the currency's minor unit (cents); unit
 * prices, which can be finer than a cent, are decimal strings in dollars. Plain zod (with the
 * catalog's and `@coss/versioning`'s constants): safe to load anywhere.
 */
import { LATEST_API_VERSION } from "@coss/versioning";
import { z } from "zod";
import { METER_KEYS } from "./catalog/meters.ts";
import { PLAN_KEYS } from "./catalog/plans.ts";

const Timestamp = z.iso.datetime();
const Cents = z.int().meta({ description: "An amount in cents (USD)." });
const Meter = z.enum(METER_KEYS).meta({ description: "What is counted, e.g. `email.recipients`." });
const Plan = z.enum(PLAN_KEYS);

export const DEFAULT_BILLING_LIST_LIMIT = 20;
export const MAX_BILLING_LIST_LIMIT = 100;
/** Usage queries span at most this many days (`granularity: hour`: 7). */
export const MAX_USAGE_RANGE_DAYS = 400;
export const MAX_HOURLY_USAGE_RANGE_DAYS = 7;

const PeriodObject = z.object({ start: Timestamp, end: Timestamp });

// ---------------------------------------------------------------------------------------------
// GET /v1/billing

const BILLING_EXAMPLE = {
  object: "billing",
  organization_id: "org_01k7c8m4q2f3e9v6t5r1n0p8yz",
  plan: "pro",
  contract: {
    id: "bcon_01k7c8m4q2f3e9v6t5r1n0p8yz",
    kind: "self_serve",
    effective_from: "2026-10-01T00:00:00.000Z",
    effective_until: null,
    term_end: null,
    auto_renew: false,
  },
  scheduled_change: null,
  status: "active",
  holds: [],
  currency: "usd",
  period: { start: "2026-10-01T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z" },
  usage: [{ meter: "email.recipients", quantity: 120000, included: null }],
  estimate: { usage: 4800, discount: 0, credit: 2500, total: 2300 },
  credit_remaining: 0,
  spend_limit: null,
  payment_method: { type: "card", brand: "visa", last4: "4242" },
  add_ons: [],
  features: {
    tracking_domains: true,
    audit_log: true,
    log_drains: false,
    sso: false,
    scim: false,
    dedicated_ips: false,
  },
  limits: { domains: 10, members: 10, webhook_endpoints_per_environment: 10 },
} as const;

export const BillingObject = z
  .object({
    object: z.literal("billing"),
    organization_id: z.string(),
    plan: Plan.meta({ description: "The plan in effect now (`free` without a contract)." }),
    contract: z
      .object({
        id: z.string(),
        kind: z.enum(["self_serve", "sales", "internal"]),
        effective_from: Timestamp,
        effective_until: Timestamp.nullable(),
        term_end: Timestamp.nullable().meta({ description: "End of a committed term." }),
        auto_renew: z.boolean(),
      })
      .nullable()
      .meta({ description: "The contract in effect; `null` on the Free plan." }),
    scheduled_change: z.object({ effective_at: Timestamp, plan: Plan }).nullable().meta({
      description: "A plan change that takes effect later (a downgrade, a cancellation).",
    }),
    status: z.enum(["active", "past_due", "delinquent"]).meta({
      description:
        "`past_due`: an invoice is overdue; `delinquent`: past its grace period, and live sending is held.",
    }),
    holds: z
      .array(
        z.object({
          reason: z.enum(["delinquent", "spend_limit", "admin"]),
          since: Timestamp,
        }),
      )
      .meta({ description: "Billing holds on live sending (sandbox keys keep working)." }),
    currency: z.literal("usd"),
    period: PeriodObject.meta({ description: "The current billing month (UTC)." }),
    usage: z.array(
      z.object({
        meter: Meter,
        quantity: z.int().nonnegative(),
        included: z.int().nonnegative().nullable().meta({
          description: "The plan's monthly allowance where usage stops (Free), else `null`.",
        }),
      }),
    ),
    estimate: z
      .object({
        usage: Cents.meta({ description: "Usage this month at your rates." }),
        discount: Cents,
        credit: Cents.meta({
          description: "Credit applied to this estimate (your plan's fee is credit).",
        }),
        total: Cents.meta({
          description:
            "Estimated total including usage and fees billed in arrears, after discounts and credits.",
        }),
      })
      .meta({ description: "This month so far, as it would be invoiced if it ended now." }),
    credit_remaining: Cents.meta({ description: "Unused credit usable this month." }),
    spend_limit: Cents.nullable().meta({
      description: "Usage beyond the credit past which live sending is held; `null`: none.",
    }),
    payment_method: z
      .object({ type: z.string(), brand: z.string().nullable(), last4: z.string().nullable() })
      .nullable(),
    add_ons: z
      .array(
        z.object({
          key: z.string().meta({ description: "e.g. `dedicated_ips`." }),
          name: z.string(),
          quantity: z.int(),
          unit_amount: Cents.meta({ description: "The price per unit and interval, in cents." }),
          interval: z.enum(["month", "quarter", "year"]),
        }),
      )
      .meta({ description: "Add-ons of the contract in effect, charged on top of the plan." }),
    features: z.object({
      tracking_domains: z.boolean(),
      audit_log: z.boolean(),
      log_drains: z.boolean(),
      sso: z.boolean(),
      scim: z.boolean(),
      dedicated_ips: z.boolean(),
    }),
    limits: z
      .object({
        domains: z.int().nullable(),
        members: z.int().nullable(),
        webhook_endpoints_per_environment: z.int().nullable(),
      })
      .meta({ description: "Resource limits (`null`: unlimited)." }),
  })
  .meta({ id: "Billing", examples: [BILLING_EXAMPLE] });
export type BillingObjectOutput = z.output<typeof BillingObject>;

// ---------------------------------------------------------------------------------------------
// GET /v1/billing/usage

const USAGE_EXAMPLE = {
  object: "usage",
  meter: "email.recipients",
  dimension: null,
  environment_id: null,
  start: "2026-10-12T00:00:00.000Z",
  end: "2026-10-13T00:00:00.000Z",
  quantity: 4200,
} as const;

export const UsageObject = z
  .object({
    object: z.literal("usage"),
    meter: Meter,
    dimension: z
      .string()
      .nullable()
      .meta({ description: "e.g. `country=US` for SMS; `null` for none." }),
    environment_id: z.string().nullable().meta({ description: "Set with `group_by=environment`." }),
    start: Timestamp,
    end: Timestamp,
    quantity: z.int().nonnegative(),
  })
  .meta({ id: "Usage", examples: [USAGE_EXAMPLE] });
export type UsageObjectOutput = z.output<typeof UsageObject>;

export const UsageList = z
  .object({
    object: z.literal("list"),
    data: z.array(UsageObject),
    has_more: z.literal(false),
  })
  .meta({
    id: "UsageList",
    examples: [{ object: "list", data: [USAGE_EXAMPLE], has_more: false }],
  });

export const UsageQuery = z
  .strictObject({
    from: z.iso.datetime({ offset: true }).optional().meta({
      description: "Start (inclusive). Defaults to the start of the current billing month.",
    }),
    to: z.iso
      .datetime({ offset: true })
      .optional()
      .meta({
        description: `End (exclusive). Defaults to now. At most ${MAX_USAGE_RANGE_DAYS} days after \`from\` (${MAX_HOURLY_USAGE_RANGE_DAYS} by hour).`,
      }),
    granularity: z
      .enum(["hour", "day", "month"])
      .optional()
      .meta({ description: "Bucket size (UTC). Defaults to `day`." }),
    group_by: z
      .enum(["environment"])
      .optional()
      .meta({ description: "Split each bucket per environment." }),
    meter: Meter.optional().meta({ description: "Only this meter." }),
  })
  .meta({ id: "UsageQuery" });

// ---------------------------------------------------------------------------------------------
// Invoices

export const INVOICE_STATUSES = ["open", "paid", "void", "uncollectible"] as const;
export const LINE_KINDS = [
  "plan_fee",
  "proration",
  "usage",
  "credit",
  "discount",
  "commitment_fee",
  "commitment_shortfall",
  "add_on",
  "adjustment",
  "write_off",
] as const;

const INVOICE_LINE_EXAMPLE = {
  object: "invoice_line",
  id: "invl_01k7c8m4q2f3e9v6t5r1n0p8yz",
  kind: "usage",
  description: "Email: 120,000 recipients",
  meter: "email.recipients",
  dimension: null,
  quantity: 120000,
  included_quantity: 0,
  unit_price: "0.0004",
  amount: 4800,
  period: { start: "2026-10-01T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z" },
} as const;

export const InvoiceLineObject = z
  .object({
    object: z.literal("invoice_line"),
    id: z.string(),
    kind: z.enum(LINE_KINDS),
    description: z.string(),
    meter: Meter.nullable(),
    dimension: z.string().nullable(),
    quantity: z.int().nullable(),
    included_quantity: z
      .int()
      .nullable()
      .meta({ description: "Units covered by an allowance or committed volume (not charged)." }),
    unit_price: z.string().nullable().meta({
      description: "Dollars per unit, e.g. `0.0004`; `null` when the price varies by volume.",
    }),
    amount: Cents,
    period: PeriodObject,
  })
  .meta({ id: "InvoiceLine", examples: [INVOICE_LINE_EXAMPLE] });

const INVOICE_EXAMPLE = {
  object: "invoice",
  id: "inv_01k7c8m4q2f3e9v6t5r1n0p8yz",
  number: "COSS-000042",
  kind: "period",
  status: "paid",
  currency: "usd",
  period: { start: "2026-10-01T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z" },
  subtotal: 7300,
  discount: 0,
  credit: 2500,
  tax: 0,
  total: 4800,
  amount_paid: 4800,
  amount_due: 0,
  collection_method: "charge_automatically",
  due_at: "2026-11-01T00:20:00.000Z",
  finalized_at: "2026-11-01T00:20:00.000Z",
  paid_at: "2026-11-01T00:21:00.000Z",
  voided_at: null,
  hosted_url: "https://invoice.stripe.com/i/acct_123/test_YWNjdF8x",
  pdf_url: "https://pay.stripe.com/invoice/acct_123/test_YWNjdF8x/pdf",
} as const;

const invoiceFields = {
  object: z.literal("invoice"),
  id: z.string(),
  number: z.string().nullable(),
  kind: z.enum(["period", "plan_change", "one_off", "final"]),
  status: z.enum(INVOICE_STATUSES),
  currency: z.literal("usd"),
  period: PeriodObject,
  subtotal: Cents,
  discount: Cents,
  credit: Cents,
  tax: Cents,
  total: Cents,
  amount_paid: Cents,
  amount_due: Cents,
  collection_method: z.enum(["charge_automatically", "send_invoice"]),
  due_at: Timestamp.nullable(),
  finalized_at: Timestamp.nullable(),
  paid_at: Timestamp.nullable(),
  voided_at: Timestamp.nullable(),
  hosted_url: z.string().nullable().meta({ description: "A page to view (and pay) the invoice." }),
  pdf_url: z.string().nullable(),
};

/** An invoice without its lines (lists and webhook events). */
export const InvoiceSummary = z
  .object(invoiceFields)
  .meta({ id: "InvoiceSummary", examples: [INVOICE_EXAMPLE] });
export type InvoiceSummaryOutput = z.output<typeof InvoiceSummary>;

export const InvoiceObject = z
  .object({ ...invoiceFields, lines: z.array(InvoiceLineObject) })
  .meta({ id: "Invoice", examples: [{ ...INVOICE_EXAMPLE, lines: [INVOICE_LINE_EXAMPLE] }] });
export type InvoiceObjectOutput = z.output<typeof InvoiceObject>;

export const InvoiceList = z
  .object({ object: z.literal("list"), data: z.array(InvoiceSummary), has_more: z.boolean() })
  .meta({
    id: "InvoiceList",
    examples: [{ object: "list", data: [INVOICE_EXAMPLE], has_more: false }],
  });

const listPaging = {
  after: z.string().max(64).optional().meta({
    description: "Continue after this id (the last of the previous page).",
  }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_BILLING_LIST_LIMIT)
    .optional()
    .meta({ description: `At most this many (default ${DEFAULT_BILLING_LIST_LIMIT}).` }),
};

export const ListInvoicesQuery = z
  .strictObject({
    status: z
      .enum(INVOICE_STATUSES)
      .optional()
      .meta({ description: "Only invoices in this status." }),
    ...listPaging,
  })
  .meta({ id: "ListInvoicesQuery" });

// ---------------------------------------------------------------------------------------------
// Credits

const CREDIT_EXAMPLE = {
  object: "credit",
  id: "bcg_01k7c8m4q2f3e9v6t5r1n0p8yz",
  kind: "units",
  amount: 50000,
  remaining: 12000,
  meter: "email.recipients",
  meters: null,
  applies_to: "usage",
  source: "support",
  description: "Migration credit",
  effective_at: "2026-10-01T00:00:00.000Z",
  expires_at: "2027-01-01T00:00:00.000Z",
  voided_at: null,
  created_at: "2026-10-01T09:30:00.000Z",
} as const;

export const CreditObject = z
  .object({
    object: z.literal("credit"),
    id: z.string(),
    kind: z.enum(["amount", "units"]).meta({
      description:
        "`amount`: dollars (`amount` and `remaining` in cents); `units`: free units of `meter`.",
    }),
    amount: z.int(),
    remaining: z.int(),
    meter: Meter.nullable().meta({ description: "What a `units` credit covers." }),
    meters: z
      .array(Meter)
      .nullable()
      .meta({ description: "What an `amount` credit pays for (`null`: any usage)." }),
    applies_to: z.enum(["usage", "any"]).meta({
      description: "`any`: also fees and other charges.",
    }),
    source: z.enum(["fee", "commitment", "support", "promotion", "refund", "sla"]),
    description: z.string(),
    effective_at: Timestamp,
    expires_at: Timestamp.nullable(),
    voided_at: Timestamp.nullable(),
    created_at: Timestamp,
  })
  .meta({ id: "Credit", examples: [CREDIT_EXAMPLE] });
export type CreditObjectOutput = z.output<typeof CreditObject>;

export const CreditList = z
  .object({ object: z.literal("list"), data: z.array(CreditObject), has_more: z.boolean() })
  .meta({
    id: "CreditList",
    examples: [{ object: "list", data: [CREDIT_EXAMPLE], has_more: false }],
  });

export const ListCreditsQuery = z
  .strictObject({
    status: z.enum(["active", "all"]).optional().meta({
      description:
        "`active` (default): usable now or later, with something left; `all`: every credit, newest first.",
    }),
    ...listPaging,
  })
  .meta({ id: "ListCreditsQuery" });

// ---------------------------------------------------------------------------------------------
// Webhook events (delivered to every live environment's endpoints)

export const BILLING_EVENT_TYPES = [
  "billing.invoice_finalized",
  "billing.invoice_paid",
  "billing.invoice_payment_failed",
  "billing.invoice_voided",
  "billing.plan_changed",
  "billing.usage_threshold_reached",
  "billing.hold_placed",
  "billing.hold_lifted",
  "billing.credit_granted",
] as const;
export type BillingEventType = (typeof BILLING_EVENT_TYPES)[number];

const eventFields = {
  id: z.string().meta({
    description: "The event id, also sent as the `webhook-id` header.",
    examples: ["evt_01k7c8m4q2f3e9v6t5r1n0p8yz"],
  }),
  object: z.literal("event"),
  api_version: z.string().meta({
    description:
      "The API version this event is rendered in: the receiving endpoint's `api_version`.",
    examples: [LATEST_API_VERSION],
  }),
  created_at: Timestamp,
};

const eventData = {
  organization_id: z.string(),
  occurred_at: Timestamp.meta({ description: "When it happened: sort events by it." }),
};

const PlanChange = z.enum(["upgrade", "downgrade", "cancellation", "reverted", "contract"]);

export const BillingWebhookEvent = z
  .discriminatedUnion("type", [
    z.object({
      ...eventFields,
      type: z.enum(["billing.invoice_finalized", "billing.invoice_paid", "billing.invoice_voided"]),
      data: z.object({ ...eventData, invoice: InvoiceSummary }),
    }),
    z.object({
      ...eventFields,
      type: z.literal("billing.invoice_payment_failed"),
      data: z.object({
        ...eventData,
        invoice: InvoiceSummary,
        failure: z.object({ message: z.string() }),
      }),
    }),
    z.object({
      ...eventFields,
      type: z.literal("billing.plan_changed"),
      data: z.object({
        ...eventData,
        change: PlanChange.meta({
          description:
            "`upgrade` (in effect now), `downgrade`/`cancellation` (scheduled), `reverted` (a scheduled change was undone), `contract` (a contract changed).",
        }),
        plan: Plan.meta({ description: "The plan from `effective_at`." }),
        previous_plan: Plan,
        effective_at: Timestamp,
      }),
    }),
    z.object({
      ...eventFields,
      type: z.literal("billing.usage_threshold_reached"),
      data: z.object({
        ...eventData,
        percent: z.int().meta({ description: "The threshold crossed, e.g. 80." }),
        of: z.enum(["credit", "allowance"]).meta({
          description:
            "`credit`: the month's usage credit; `allowance`: a capped plan's included units.",
        }),
        meter: Meter.nullable().meta({ description: "The allowance's meter (`of: allowance`)." }),
        period: PeriodObject,
      }),
    }),
    z.object({
      ...eventFields,
      type: z.enum(["billing.hold_placed", "billing.hold_lifted"]),
      data: z.object({
        ...eventData,
        reason: z.enum(["delinquent", "spend_limit", "admin"]),
      }),
    }),
    z.object({
      ...eventFields,
      type: z.literal("billing.credit_granted"),
      data: z.object({ ...eventData, credit: CreditObject }),
    }),
  ])
  .meta({
    id: "BillingWebhookEvent",
    examples: [
      {
        id: "evt_01k7c8m4q2f3e9v6t5r1n0p8yz",
        object: "event",
        type: "billing.invoice_paid",
        api_version: LATEST_API_VERSION,
        created_at: INVOICE_EXAMPLE.paid_at,
        data: {
          organization_id: BILLING_EXAMPLE.organization_id,
          occurred_at: INVOICE_EXAMPLE.paid_at,
          invoice: INVOICE_EXAMPLE,
        },
      },
    ],
  });
export type BillingWebhookEventOutput = z.output<typeof BillingWebhookEvent>;
/** What the outbox stores: delivery adds `api_version` when it renders the event for an endpoint. */
export type StoredBillingWebhookEvent = BillingWebhookEventOutput extends infer E
  ? E extends unknown
    ? Omit<E, "api_version">
    : never
  : never;
