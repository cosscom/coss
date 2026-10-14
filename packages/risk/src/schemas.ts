/**
 * Risk's public wire schemas (snake_case), the reason catalog and the default policy. Plain zod,
 * no database or Node imports: `@coss/risk/schemas` is safe to load anywhere (the docs render the
 * reason catalog from it).
 */
import { z } from "zod";

export const RISK_EVENTS = ["signup", "login", "message", "checkout", "custom"] as const;
export type RiskEvent = (typeof RISK_EVENTS)[number];

export const RISK_DECISIONS = ["allow", "review", "block"] as const;
export type RiskDecision = (typeof RISK_DECISIONS)[number];

export const RISK_OUTCOMES = ["legitimate", "fraud", "abuse"] as const;
export type RiskOutcome = (typeof RISK_OUTCOMES)[number];

export const RISK_REVIEW_STATUSES = ["open", "resolved"] as const;
export const RISK_LISTS = ["allow", "block"] as const;
export type RiskList = (typeof RISK_LISTS)[number];
export const RISK_LIST_ENTRY_TYPES = ["email", "domain", "ip", "asn", "country", "user"] as const;
export type RiskListEntryType = (typeof RISK_LIST_ENTRY_TYPES)[number];

/** Signal groups that can be missing from an assessment (a lookup failed or timed out). */
export const RISK_DEGRADED_SIGNALS = [
  "email_dns",
  "domain_age",
  "ip_data",
  "velocity",
  "captcha",
] as const;
export type RiskDegradedSignal = (typeof RISK_DEGRADED_SIGNALS)[number];

/** Webhook event types: `review` decisions, and their resolution, for a queue you work through. */
export const RISK_EVENT_TYPES = ["risk.assessment.review", "risk.assessment.reviewed"] as const;
export type RiskEventType = (typeof RISK_EVENT_TYPES)[number];

// ---------------------------------------------------------------------------------------------
// The default policy: reason weights, velocity thresholds and decision thresholds.
// ---------------------------------------------------------------------------------------------

/** The windows velocity is counted over. */
export const VELOCITY_WINDOWS = ["1h", "24h"] as const;
export type VelocityWindow = (typeof VELOCITY_WINDOWS)[number];

/** What velocity is counted per (always per environment and event). */
export const VELOCITY_DIMENSIONS = ["ip", "subnet", "email_domain", "mailbox", "user"] as const;
export type VelocityDimension = (typeof VELOCITY_DIMENSIONS)[number];

/** Which events a velocity rule watches: `other` is message, checkout and custom events. */
type VelocityEventGroup = "signup" | "login" | "other";

export type VelocityRule = {
  code: string;
  events: VelocityEventGroup;
  dimension: VelocityDimension;
  window: VelocityWindow;
  /** The reason fires when the count (this event included) reaches this. */
  threshold: number;
};

export const VELOCITY_RULES: readonly VelocityRule[] = [
  {
    code: "velocity.signups_per_ip_1h",
    events: "signup",
    dimension: "ip",
    window: "1h",
    threshold: 5,
  },
  {
    code: "velocity.signups_per_ip_24h",
    events: "signup",
    dimension: "ip",
    window: "24h",
    threshold: 20,
  },
  {
    code: "velocity.signups_per_subnet_1h",
    events: "signup",
    dimension: "subnet",
    window: "1h",
    threshold: 15,
  },
  {
    code: "velocity.signups_per_email_domain_1h",
    events: "signup",
    dimension: "email_domain",
    window: "1h",
    threshold: 20,
  },
  {
    code: "velocity.signups_per_mailbox_24h",
    events: "signup",
    dimension: "mailbox",
    window: "24h",
    threshold: 3,
  },
  {
    code: "velocity.logins_per_ip_1h",
    events: "login",
    dimension: "ip",
    window: "1h",
    threshold: 30,
  },
  {
    code: "velocity.logins_per_user_1h",
    events: "login",
    dimension: "user",
    window: "1h",
    threshold: 10,
  },
  {
    code: "velocity.events_per_ip_1h",
    events: "other",
    dimension: "ip",
    window: "1h",
    threshold: 60,
  },
  {
    code: "velocity.events_per_user_1h",
    events: "other",
    dimension: "user",
    window: "1h",
    threshold: 60,
  },
];

/** Which velocity dimensions an event counts. */
export function velocityDimensionsFor(event: RiskEvent): VelocityDimension[] {
  const group = velocityGroup(event);
  return [...new Set(VELOCITY_RULES.filter((r) => r.events === group).map((r) => r.dimension))];
}

export function velocityGroup(event: RiskEvent): VelocityEventGroup {
  return event === "signup" || event === "login" ? event : "other";
}

export type ReasonDefinition = {
  /** Contribution to the score: `score = 1 − Π(1 − weight)` over the reasons that fired. */
  weight: number;
  /** What it means, for developers (never show reasons to the people being assessed). */
  description: string;
};

/**
 * Every reason an assessment can give. Reasons with weight 0 don't move the score: they explain a
 * decision made by a list, or point at a likely integration mistake.
 */
export const REASONS = {
  "email.invalid": {
    weight: 0.6,
    description: "The email address is not syntactically valid.",
  },
  "email.disposable": {
    weight: 0.7,
    description: "The email domain (or a parent domain) belongs to a disposable-mail service.",
  },
  "email.undeliverable": {
    weight: 0.6,
    description:
      "The email domain can't receive mail: it doesn't exist, has a null MX, or has no MX, A or AAAA record.",
  },
  "email.role_account": {
    weight: 0.15,
    description:
      "A shared or system mailbox (`info@`, `admin@`, `noreply@`…) rather than a person.",
  },
  "email.typo": {
    weight: 0.2,
    description:
      "The domain looks like a typo of a popular one; `suggestion` holds the likely domain, which you may show the user.",
  },
  "email.domain_new": {
    weight: 0.35,
    description:
      "The email domain was registered in the last 30 days (from its registry, over RDAP).",
  },
  "ip.tor": { weight: 0.5, description: "The IP address is a Tor exit node." },
  "ip.vpn_network": {
    weight: 0.3,
    description:
      "The IP address belongs to a network mostly used by commercial VPN and proxy services (`provider`).",
  },
  "ip.hosting_provider": {
    weight: 0.25,
    description:
      "The IP address belongs to a cloud or hosting provider (`provider`): usually a script or a proxy, rarely a person.",
  },
  "ip.private": {
    weight: 0,
    description:
      "The IP address is private or reserved: you probably passed your load balancer's or proxy's address instead of the client's.",
  },
  "velocity.signups_per_ip_1h": {
    weight: 0.35,
    description: "Many sign-ups from this IP address in the last hour (`value`).",
  },
  "velocity.signups_per_ip_24h": {
    weight: 0.3,
    description: "Many sign-ups from this IP address in the last 24 hours (`value`).",
  },
  "velocity.signups_per_subnet_1h": {
    weight: 0.25,
    description: "Many sign-ups from this IPv4 /24 or IPv6 /64 in the last hour (`value`).",
  },
  "velocity.signups_per_email_domain_1h": {
    weight: 0.2,
    description: "Many sign-ups with this (non-free) email domain in the last hour (`value`).",
  },
  "velocity.signups_per_mailbox_24h": {
    weight: 0.3,
    description:
      "Repeated sign-up attempts for the same mailbox (dots and `+tags` folded) in the last 24 hours (`value`).",
  },
  "velocity.logins_per_ip_1h": {
    weight: 0.3,
    description: "Many logins from this IP address in the last hour (`value`).",
  },
  "velocity.logins_per_user_1h": {
    weight: 0.3,
    description: "Many logins to this user in the last hour (`value`).",
  },
  "velocity.events_per_ip_1h": {
    weight: 0.25,
    description: "Many events of this kind from this IP address in the last hour (`value`).",
  },
  "velocity.events_per_user_1h": {
    weight: 0.25,
    description: "Many events of this kind from this user in the last hour (`value`).",
  },
  "duplicate.canonical_mailbox": {
    weight: 0.5,
    description:
      "Another sign-up in this environment already used the same mailbox, with dots and `+tags` folded (`previous_user`, `previous_assessment`).",
  },
  "history.fraud_mailbox": {
    weight: 0.7,
    description: "This mailbox was in an assessment you reported as fraud or abuse.",
  },
  "history.fraud_user": {
    weight: 0.8,
    description: "This user was in an assessment you reported as fraud or abuse.",
  },
  "history.fraud_ip": {
    weight: 0.45,
    description:
      "This IP address was in an assessment you reported as fraud or abuse in the last 30 days.",
  },
  "history.fraud_subnet": {
    weight: 0.2,
    description:
      "This IPv4 /24 or IPv6 /64 was in an assessment you reported as fraud or abuse in the last 30 days.",
  },
  "login.new_country": {
    weight: 0.3,
    description:
      "A login from a country this user never logged in from before in this environment.",
  },
  "login.new_network": {
    weight: 0.15,
    description:
      "A login from a network (ASN) this user never logged in from before in this environment.",
  },
  "captcha.failed": {
    weight: 0.6,
    description:
      "The captcha token was refused by the provider (expired, reused, or never solved).",
  },
  "captcha.missing": {
    weight: 0.4,
    description: "No captcha token, while your settings require one (`captcha.required`).",
  },
  "rule.matched": {
    weight: 0,
    description:
      "One of your rules matched (`rule`, `name`): its action is the decision, unless a list decided.",
  },
  "list.blocked": {
    weight: 0,
    description: "An entry of your block list matched (`entry`, `type`): the decision is `block`.",
  },
  "list.allowed": {
    weight: 0,
    description:
      "An entry of your allow list matched (`entry`, `type`): the decision is `allow`, whatever else fired.",
  },
} as const satisfies Record<string, ReasonDefinition>;

export type RiskReasonCode = keyof typeof REASONS;
export const RISK_REASON_CODES = Object.keys(REASONS) as [RiskReasonCode, ...RiskReasonCode[]];

/** At or above: `review`; at or above `block`: `block` (unless a list or a rule decided). */
export const DEFAULT_THRESHOLDS = { review: 0.5, block: 0.85 } as const;

/** Reasons that report a decision rather than a signal: they can't be turned off. */
export const DECISION_REASON_CODES = ["list.blocked", "list.allowed", "rule.matched"] as const;
export const DISABLEABLE_REASON_CODES = RISK_REASON_CODES.filter(
  (code) => !(DECISION_REASON_CODES as readonly string[]).includes(code),
) as [RiskReasonCode, ...RiskReasonCode[]];

/** How long a domain counts as new (`email.domain_new`). */
export const NEW_DOMAIN_DAYS = 30;

// ---------------------------------------------------------------------------------------------
// Rules: the fields a condition can test (evaluated by `rules.ts`).
// ---------------------------------------------------------------------------------------------

export type RuleFieldType = "boolean" | "number" | "string";

export const RULE_FIELDS = {
  "email.valid": { type: "boolean", label: "Email is valid" },
  "email.disposable": { type: "boolean", label: "Email is disposable" },
  "email.undeliverable": { type: "boolean", label: "Email domain can't receive mail" },
  "email.role_account": { type: "boolean", label: "Email is a role account" },
  "email.free_provider": { type: "boolean", label: "Email is at a free provider" },
  "email.typo": { type: "boolean", label: "Email domain looks like a typo" },
  "email.domain_new": { type: "boolean", label: "Email domain is new" },
  "email.domain": { type: "string", label: "Email domain" },
  "email.domain_age_days": { type: "number", label: "Email domain age (days)" },
  "ip.tor": { type: "boolean", label: "IP is a Tor exit" },
  "ip.hosting": { type: "boolean", label: "IP is a cloud or hosting network" },
  "ip.vpn": { type: "boolean", label: "IP is a VPN network" },
  "ip.private": { type: "boolean", label: "IP is private" },
  "ip.country": { type: "string", label: "IP country (ISO code)" },
  "ip.asn": { type: "string", label: "IP network (AS number)" },
  "ip.hosting_provider": { type: "string", label: "IP hosting provider" },
  "captcha.passed": { type: "boolean", label: "Captcha passed" },
  "duplicate.canonical_mailbox": { type: "boolean", label: "Mailbox already has an account" },
  "history.fraud": { type: "boolean", label: "Seen in fraud before" },
  "login.new_country": { type: "boolean", label: "Login from a new country" },
  "login.new_network": { type: "boolean", label: "Login from a new network" },
  score: { type: "number", label: "Score (0-1)" },
  "velocity.ip_1h": { type: "number", label: "Events from the IP (1 h)" },
  "velocity.ip_24h": { type: "number", label: "Events from the IP (24 h)" },
  "velocity.subnet_1h": { type: "number", label: "Events from the subnet (1 h)" },
  "velocity.subnet_24h": { type: "number", label: "Events from the subnet (24 h)" },
  "velocity.email_domain_1h": { type: "number", label: "Events with the email domain (1 h)" },
  "velocity.email_domain_24h": { type: "number", label: "Events with the email domain (24 h)" },
  "velocity.mailbox_1h": { type: "number", label: "Events with the mailbox (1 h)" },
  "velocity.mailbox_24h": { type: "number", label: "Events with the mailbox (24 h)" },
  "velocity.user_1h": { type: "number", label: "Events of the user (1 h)" },
  "velocity.user_24h": { type: "number", label: "Events of the user (24 h)" },
} as const satisfies Record<string, { type: RuleFieldType; label: string }>;

export type RuleField = keyof typeof RULE_FIELDS;
export const RULE_FIELD_NAMES = Object.keys(RULE_FIELDS) as [RuleField, ...RuleField[]];

export const RULE_OPERATORS = {
  boolean: ["is"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte"],
  string: ["eq", "neq", "in", "not_in"],
} as const satisfies Record<RuleFieldType, readonly string[]>;

export const MAX_RISK_RULES = 50;
export const MAX_RULE_CONDITIONS = 20;

// ---------------------------------------------------------------------------------------------
// Wire schemas.
// ---------------------------------------------------------------------------------------------

const ASSESSMENT_ID_EXAMPLE = "rsk_01k7c8m4q2f3e9v6t5r1n0p8yz";

export const RiskEventEnum = z.enum(RISK_EVENTS).meta({
  id: "RiskEvent",
  description:
    "What is being assessed. `custom` events are named by `event_name`; velocity is counted per event.",
});
export const RiskDecisionEnum = z.enum(RISK_DECISIONS).meta({
  id: "RiskDecision",
  description:
    "`allow`: go ahead. `review`: suspicious; let it through with limits, or hold it for a person. `block`: refuse it.",
});
export const RiskOutcomeEnum = z.enum(RISK_OUTCOMES).meta({
  id: "RiskOutcome",
  description:
    "What really happened: `legitimate`, `fraud`, or `abuse` (spam, free-tier abuse and the like).",
});
export const RiskListEnum = z.enum(RISK_LISTS).meta({ id: "RiskList" });
export const RiskListEntryTypeEnum = z.enum(RISK_LIST_ENTRY_TYPES).meta({
  id: "RiskListEntryType",
  description:
    "`email` (matched by mailbox, dots and `+tags` folded), `domain` (subdomains included), `ip` (an address or CIDR range), `asn`, `country` (ISO 3166-1 alpha-2), `user` (your user id).",
});

const UserId = z.string().min(1).max(256);
const EventName = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._-]{0,63}$/, "Use 1-64 lower-case letters, digits, `.`, `_` or `-`.");

export const CreateRiskAssessmentRequest = z
  .strictObject({
    event: RiskEventEnum,
    event_name: EventName.optional().meta({
      description: "Required for `custom` events (e.g. `invite_sent`), not allowed otherwise.",
    }),
    user: z
      .strictObject({
        id: UserId.optional().meta({
          description:
            "Your id for the user, when it exists (logins always; sign-ups once the account is created).",
        }),
        email: z.string().min(1).max(320).optional().meta({
          description: "The email address the user gave. Checked as given, even if invalid.",
        }),
      })
      .optional(),
    ip: z
      .union([z.ipv4(), z.ipv6()])
      .optional()
      .meta({ description: "The client's IP address (not your server's or proxy's)." }),
    user_agent: z.string().max(1024).optional().meta({ description: "The client's user agent." }),
    captcha: z
      .strictObject({
        token: z.string().min(1).max(4096).meta({
          description:
            "The token your captcha widget (Turnstile or hCaptcha, set in the environment's risk settings) gave the browser. Verified once: don't reuse it.",
        }),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.event === "custom" && !value.event_name) {
      ctx.addIssue({
        code: "custom",
        path: ["event_name"],
        message: "Name custom events with `event_name`.",
      });
    }
    if (value.event !== "custom" && value.event_name !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["event_name"],
        message: "`event_name` is only for `custom` events.",
      });
    }
  })
  .meta({
    id: "CreateRiskAssessmentRequest",
    examples: [
      {
        event: "signup",
        user: { email: "ada@gmail.con" },
        ip: "203.0.113.7",
        user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15",
      },
    ],
  });
export type CreateRiskAssessmentRequestInput = z.input<typeof CreateRiskAssessmentRequest>;
export type CreateRiskAssessmentRequestOutput = z.output<typeof CreateRiskAssessmentRequest>;

export const RiskReason = z
  .object({
    code: z.enum(RISK_REASON_CODES),
    message: z.string(),
    value: z.number().optional().meta({ description: "The count behind a `velocity.*` reason." }),
    threshold: z
      .number()
      .optional()
      .meta({ description: "The count a `velocity.*` reason fires at." }),
    window: z.enum(VELOCITY_WINDOWS).optional(),
    suggestion: z.string().optional().meta({ description: "`email.typo`: the likely domain." }),
    provider: z
      .string()
      .optional()
      .meta({ description: "`ip.hosting_provider`, `ip.vpn_network`: the network's operator." }),
    previous_user: z.string().nullable().optional().meta({
      description:
        "`duplicate.canonical_mailbox`: your id of the user who has the mailbox, if known.",
    }),
    previous_assessment: z.string().optional().meta({
      description: "`duplicate.canonical_mailbox`: the assessment that first saw the mailbox.",
    }),
    entry: z.string().optional().meta({ description: "`list.*`: the matching list entry." }),
    rule: z.string().optional().meta({ description: "`rule.matched`: the rule's id." }),
    name: z.string().optional().meta({ description: "`rule.matched`: the rule's name." }),
    type: RiskListEntryTypeEnum.optional().meta({ description: "`list.*`: what matched." }),
  })
  .meta({ id: "RiskReason" });
export type RiskReasonOutput = z.output<typeof RiskReason>;

export const RiskEmailSignals = z
  .object({
    domain: z.string().nullable().meta({
      description: "`null` once the address is removed (90 days after the assessment).",
    }),
    valid: z.boolean(),
    disposable: z.boolean(),
    deliverability: z.enum(["deliverable", "undeliverable", "unknown"]).meta({
      description: "From DNS (MX, A, AAAA). `unknown` when the lookup failed or timed out.",
    }),
    role_account: z.boolean(),
    free_provider: z.boolean(),
    suggestion: z.string().nullable(),
    domain_age_days: z.number().int().nullable().meta({
      description:
        "Days since the domain was registered (RDAP); `null` when unknown or not looked up (free providers, disposable domains).",
    }),
  })
  .meta({ id: "RiskEmailSignals" });

export const RiskCaptchaSignals = z
  .object({
    provided: z.boolean(),
    passed: z.boolean().nullable().meta({
      description:
        "`null` when it couldn't be checked (no captcha configured, or the provider was unreachable).",
    }),
  })
  .meta({ id: "RiskCaptchaSignals" });

export const RiskLoginSignals = z
  .object({
    new_country: z.boolean(),
    new_network: z.boolean(),
  })
  .meta({
    id: "RiskLoginSignals",
    description: "Logins of a user with history: whether the country or network is new for them.",
  });

export const RiskIpSignals = z
  .object({
    version: z.union([z.literal(4), z.literal(6)]),
    private: z.boolean(),
    tor: z.boolean(),
    hosting: z.boolean(),
    hosting_provider: z.string().nullable(),
    hosting_kind: z.enum(["cloud", "hosting", "vpn"]).nullable(),
    asn: z.number().int().nullable(),
    as_name: z.string().nullable(),
    country: z.string().nullable().meta({ description: "ISO 3166-1 alpha-2." }),
  })
  .meta({ id: "RiskIpSignals" });

export const RiskVelocitySignals = z.record(z.string(), z.number().int()).meta({
  id: "RiskVelocitySignals",
  description:
    "Events of the same kind in this environment, this one included, keyed `<dimension>_<window>` (e.g. `ip_1h`, `mailbox_24h`).",
});

const ASSESSMENT_EXAMPLE = {
  object: "risk_assessment",
  id: ASSESSMENT_ID_EXAMPLE,
  event: "signup",
  event_name: null,
  decision: "review",
  score: 0.62,
  reasons: [
    {
      code: "email.typo",
      message: "The domain looks like a typo of gmail.com.",
      suggestion: "gmail.com",
    },
    {
      code: "velocity.signups_per_ip_1h",
      message: "7 sign-ups from this IP address in the last hour.",
      value: 7,
      threshold: 5,
      window: "1h",
    },
  ],
  signals: {
    email: {
      domain: "gmail.con",
      valid: true,
      disposable: false,
      deliverability: "deliverable",
      role_account: false,
      free_provider: false,
      suggestion: "gmail.com",
      domain_age_days: 9,
    },
    ip: {
      version: 4,
      private: false,
      tor: false,
      hosting: false,
      hosting_provider: null,
      hosting_kind: null,
      asn: 64500,
      as_name: "Example Broadband",
      country: "GB",
    },
    velocity: { ip_1h: 7, ip_24h: 9, subnet_1h: 7, mailbox_24h: 1 },
    captcha: { provided: true, passed: true },
    login: null,
  },
  user: { id: null, email: "ada@gmail.con" },
  ip: "203.0.113.7",
  degraded: [],
  outcome: null,
  review_status: "open",
  created_at: "2026-01-15T09:30:00.000Z",
} as const;

export const RiskAssessment = z
  .object({
    object: z.literal("risk_assessment"),
    id: z.string().meta({ examples: [ASSESSMENT_ID_EXAMPLE] }),
    event: RiskEventEnum,
    event_name: z.string().nullable(),
    decision: RiskDecisionEnum,
    score: z.number().min(0).max(1).meta({
      description:
        "0-1: how risky the signals are together. Lists can decide regardless of the score.",
    }),
    reasons: z.array(RiskReason).meta({ description: "Why, most significant first." }),
    signals: z.object({
      email: z.union([RiskEmailSignals, z.null()]),
      ip: z.union([RiskIpSignals, z.null()]),
      velocity: z.union([RiskVelocitySignals, z.null()]).meta({
        description: "`null` when velocity was unavailable (see `degraded`).",
      }),
      captcha: z.union([RiskCaptchaSignals, z.null()]),
      login: z.union([RiskLoginSignals, z.null()]),
    }),
    user: z.object({
      id: z.string().nullable(),
      email: z.string().nullable().meta({
        description: "`null` once removed (90 days after the assessment) or when none was given.",
      }),
    }),
    ip: z.string().nullable().meta({ description: "`null` once removed (90 days after)." }),
    degraded: z.array(z.enum(RISK_DEGRADED_SIGNALS)).meta({
      description:
        "Signal groups that were unavailable for this assessment (it was made without them).",
    }),
    outcome: z.union([RiskOutcomeEnum, z.null()]).meta({
      description: "The latest outcome you reported with feedback.",
    }),
    review_status: z.union([z.enum(RISK_REVIEW_STATUSES), z.null()]).meta({
      description: "`open` for `review` decisions until you send feedback, then `resolved`.",
    }),
    created_at: z.iso.datetime(),
  })
  .meta({ id: "RiskAssessment", examples: [ASSESSMENT_EXAMPLE] });
export type RiskAssessmentOutput = z.output<typeof RiskAssessment>;

export const DEFAULT_RISK_LIST_LIMIT = 50;
export const MAX_RISK_LIST_LIMIT = 100;

const Limit = z.coerce
  .number()
  .int()
  .min(1)
  .max(MAX_RISK_LIST_LIMIT)
  .optional()
  .meta({ description: `1-${MAX_RISK_LIST_LIMIT}, default ${DEFAULT_RISK_LIST_LIMIT}.` });
const After = z
  .string()
  .optional()
  .meta({ description: "Cursor: the `id` of the last entry of the previous page." });

export const ListRiskAssessmentsQuery = z.strictObject({
  event: RiskEventEnum.optional(),
  decision: RiskDecisionEnum.optional(),
  user_id: UserId.optional().meta({ description: "Only assessments of this user." }),
  review_status: z
    .enum(RISK_REVIEW_STATUSES)
    .optional()
    .meta({ description: "`open`: the review queue." }),
  limit: Limit,
  after: After,
});
export type ListRiskAssessmentsQueryOutput = z.output<typeof ListRiskAssessmentsQuery>;

export const RiskAssessmentList = z
  .object({
    object: z.literal("list"),
    data: z.array(RiskAssessment),
    has_more: z.boolean(),
  })
  .meta({
    id: "RiskAssessmentList",
    examples: [{ object: "list", data: [ASSESSMENT_EXAMPLE], has_more: false }],
  });
export type RiskAssessmentListOutput = z.output<typeof RiskAssessmentList>;

export const CreateRiskFeedbackRequest = z
  .strictObject({
    outcome: RiskOutcomeEnum,
    note: z.string().max(500).optional().meta({ description: "For your team; never shared." }),
  })
  .meta({ id: "CreateRiskFeedbackRequest", examples: [{ outcome: "fraud" }] });
export type CreateRiskFeedbackRequestOutput = z.output<typeof CreateRiskFeedbackRequest>;

export const CreateRiskListEntryRequest = z
  .strictObject({
    list: RiskListEnum,
    type: RiskListEntryTypeEnum,
    value: z.string().min(1).max(320),
    note: z.string().max(500).optional(),
    expires_at: z.iso
      .datetime({ offset: true })
      .optional()
      .meta({ description: "The entry stops matching at this time (it is kept until deleted)." }),
  })
  .meta({
    id: "CreateRiskListEntryRequest",
    examples: [{ list: "block", type: "domain", value: "evil.example", note: "Card testing" }],
  });
export type CreateRiskListEntryRequestOutput = z.output<typeof CreateRiskListEntryRequest>;

const LIST_ENTRY_EXAMPLE = {
  object: "risk_list_entry",
  id: "rskle_01k7c8m4q2f3e9v6t5r1n0p8yz",
  list: "block",
  type: "domain",
  value: "evil.example",
  note: "Card testing",
  expires_at: null,
  created_at: "2026-01-15T09:30:00.000Z",
} as const;

export const RiskListEntry = z
  .object({
    object: z.literal("risk_list_entry"),
    id: z.string(),
    list: RiskListEnum,
    type: RiskListEntryTypeEnum,
    value: z.string().meta({
      description: "Normalized: emails as their mailbox, CIDR ranges canonical, ASNs as numbers.",
    }),
    note: z.string().nullable(),
    expires_at: z.iso.datetime().nullable(),
    created_at: z.iso.datetime(),
  })
  .meta({ id: "RiskListEntry", examples: [LIST_ENTRY_EXAMPLE] });
export type RiskListEntryOutput = z.output<typeof RiskListEntry>;

export const ListRiskListEntriesQuery = z.strictObject({
  list: RiskListEnum.optional(),
  type: RiskListEntryTypeEnum.optional(),
  limit: Limit,
  after: After,
});
export type ListRiskListEntriesQueryOutput = z.output<typeof ListRiskListEntriesQuery>;

export const RiskListEntryList = z
  .object({ object: z.literal("list"), data: z.array(RiskListEntry), has_more: z.boolean() })
  .meta({
    id: "RiskListEntryList",
    examples: [{ object: "list", data: [LIST_ENTRY_EXAMPLE], has_more: false }],
  });
export type RiskListEntryListOutput = z.output<typeof RiskListEntryList>;

export const DeletedRiskListEntry = z
  .object({ object: z.literal("risk_list_entry"), id: z.string(), deleted: z.literal(true) })
  .meta({ id: "DeletedRiskListEntry" });

export const ForgottenRiskUser = z
  .object({
    object: z.literal("risk_user"),
    id: z.string().meta({ description: "Your user id." }),
    deleted: z.literal(true),
  })
  .meta({
    id: "ForgottenRiskUser",
    examples: [{ object: "risk_user", id: "u_42", deleted: true }],
  });

export const RiskWebhookEvent = z
  .object({
    id: z.string().meta({
      description: "The event id, also sent as the `webhook-id` header.",
      example: "evt_01k7c8m4q2f3e9v6t5r1n0p8yz",
    }),
    object: z.literal("event"),
    type: z.enum(RISK_EVENT_TYPES),
    api_version: z.string().meta({
      description:
        "The API version (`Coss-Version`) this event is rendered in: the receiving endpoint's `api_version`.",
    }),
    created_at: z.iso.datetime(),
    data: z.object({
      assessment_id: z.string(),
      event: RiskEventEnum,
      event_name: z.string().nullable(),
      decision: RiskDecisionEnum,
      score: z.number(),
      reasons: z.array(RiskReason),
      user_id: z.string().nullable(),
      outcome: z.union([RiskOutcomeEnum, z.null()]).meta({
        description: "`risk.assessment.reviewed`: the outcome that resolved the review.",
      }),
      occurred_at: z.iso.datetime(),
    }),
  })
  .meta({ id: "RiskWebhookEvent" });
export type RiskWebhookEventOutput = z.output<typeof RiskWebhookEvent>;
/** What the outbox stores: delivery adds `api_version` when it renders the event for an endpoint. */
export type StoredRiskWebhookEvent = Omit<RiskWebhookEventOutput, "api_version">;

// ---------------------------------------------------------------------------------------------
// Settings.
// ---------------------------------------------------------------------------------------------

export const RISK_CAPTCHA_PROVIDERS = ["turnstile", "hcaptcha"] as const;
export type RiskCaptchaProvider = (typeof RISK_CAPTCHA_PROVIDERS)[number];

const Threshold = z.number().gt(0).max(1);

const SETTINGS_EXAMPLE = {
  object: "risk_settings",
  review_threshold: 0.5,
  block_threshold: 0.85,
  disabled_reasons: ["email.role_account"],
  captcha: { provider: "turnstile", required: true },
  updated_at: "2026-01-15T09:30:00.000Z",
} as const;

export const RiskSettings = z
  .object({
    object: z.literal("risk_settings"),
    review_threshold: z.number().meta({ description: "Scores at or above it are `review`." }),
    block_threshold: z.number().meta({ description: "Scores at or above it are `block`." }),
    disabled_reasons: z.array(z.enum(DISABLEABLE_REASON_CODES)).meta({
      description: "Reasons that never fire in this environment (they don't count in the score).",
    }),
    captcha: z
      .union([
        z.object({ provider: z.enum(RISK_CAPTCHA_PROVIDERS), required: z.boolean() }),
        z.null(),
      ])
      .meta({
        description: "The captcha provider assessments verify tokens with (never the secret).",
      }),
    updated_at: z.iso.datetime().nullable().meta({ description: "`null` while on the defaults." }),
  })
  .meta({ id: "RiskSettings", examples: [SETTINGS_EXAMPLE] });
export type RiskSettingsOutput = z.output<typeof RiskSettings>;

export const UpdateRiskSettingsRequest = z
  .strictObject({
    review_threshold: Threshold.optional(),
    block_threshold: Threshold.optional(),
    disabled_reasons: z.array(z.enum(DISABLEABLE_REASON_CODES)).max(100).optional(),
    captcha: z
      .union([
        z.strictObject({
          provider: z.enum(RISK_CAPTCHA_PROVIDERS),
          secret: z.string().min(1).max(1024).optional().meta({
            description:
              "The provider's secret key. Required when setting a provider for the first time or changing it; stored encrypted and never returned.",
          }),
          required: z.boolean().optional().meta({
            description:
              "Assessments without a `captcha` token get `captcha.missing`. Default false.",
          }),
        }),
        z.null(),
      ])
      .optional()
      .meta({ description: "`null` turns captcha verification off and deletes the secret." }),
  })
  .meta({
    id: "UpdateRiskSettingsRequest",
    examples: [
      {
        block_threshold: 0.9,
        captcha: { provider: "turnstile", secret: "0x4AAA…", required: true },
      },
    ],
  });
export type UpdateRiskSettingsRequestOutput = z.output<typeof UpdateRiskSettingsRequest>;

// ---------------------------------------------------------------------------------------------
// Rules.
// ---------------------------------------------------------------------------------------------

const RuleValue = z.union([
  z.boolean(),
  z.number(),
  z.string().max(320),
  z.array(z.string().max(320)).min(1).max(100),
]);

export const RiskRuleCondition = z
  .strictObject({
    field: z.enum(RULE_FIELD_NAMES),
    operator: z.enum(["is", "eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in"]),
    value: RuleValue,
  })
  .superRefine((condition, ctx) => {
    const { type } = RULE_FIELDS[condition.field];
    const operators: readonly string[] = RULE_OPERATORS[type];
    if (!operators.includes(condition.operator)) {
      ctx.addIssue({
        code: "custom",
        path: ["operator"],
        message: `${condition.field} takes ${operators.join(", ")}.`,
      });
      return;
    }
    const value = condition.value;
    const ok =
      type === "boolean"
        ? typeof value === "boolean"
        : type === "number"
          ? typeof value === "number" && Number.isFinite(value)
          : condition.operator === "in" || condition.operator === "not_in"
            ? Array.isArray(value)
            : typeof value === "string";
    if (!ok) {
      const expected =
        type === "boolean"
          ? "true or false"
          : type === "number"
            ? "a number"
            : condition.operator === "in" || condition.operator === "not_in"
              ? "a list of strings"
              : "a string";
      ctx.addIssue({ code: "custom", path: ["value"], message: `Expected ${expected}.` });
    }
  })
  .meta({
    id: "RiskRuleCondition",
    description:
      "A test of one field. A field without a value (no IP, no email…) never matches, whatever the operator.",
  });
export type RiskRuleConditionOutput = z.output<typeof RiskRuleCondition>;

const RuleName = z.string().trim().min(1).max(100);

const RULE_EXAMPLE = {
  object: "risk_rule",
  id: "rskrule_01k7c8m4q2f3e9v6t5r1n0p8yz",
  name: "Disposable email from a data center",
  enabled: true,
  position: 0,
  events: ["signup"],
  match: "all",
  conditions: [
    { field: "email.disposable", operator: "is", value: true },
    { field: "ip.hosting", operator: "is", value: true },
  ],
  action: "block",
  created_at: "2026-01-15T09:30:00.000Z",
  updated_at: "2026-01-15T09:30:00.000Z",
} as const;

export const RiskRule = z
  .object({
    object: z.literal("risk_rule"),
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    position: z.number().int().meta({ description: "Rules are tried in ascending order." }),
    events: z
      .array(RiskEventEnum)
      .meta({ description: "Events it applies to; empty: every event." }),
    match: z.enum(["all", "any"]).meta({
      description: "`all`: every condition must hold. `any`: one is enough.",
    }),
    conditions: z.array(RiskRuleCondition),
    action: RiskDecisionEnum,
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime(),
  })
  .meta({ id: "RiskRule", examples: [RULE_EXAMPLE] });
export type RiskRuleOutput = z.output<typeof RiskRule>;

export const CreateRiskRuleRequest = z
  .strictObject({
    name: RuleName,
    enabled: z.boolean().optional(),
    position: z.number().int().min(0).max(10_000).optional().meta({ description: "Default 0." }),
    events: z.array(RiskEventEnum).max(RISK_EVENTS.length).optional(),
    match: z.enum(["all", "any"]).optional().meta({ description: "Default `all`." }),
    conditions: z.array(RiskRuleCondition).min(1).max(MAX_RULE_CONDITIONS),
    action: RiskDecisionEnum,
  })
  .meta({
    id: "CreateRiskRuleRequest",
    examples: [
      {
        name: "Disposable email from a data center",
        events: ["signup"],
        conditions: [
          { field: "email.disposable", operator: "is", value: true },
          { field: "ip.hosting", operator: "is", value: true },
        ],
        action: "block",
      },
    ],
  });
export type CreateRiskRuleRequestOutput = z.output<typeof CreateRiskRuleRequest>;

export const UpdateRiskRuleRequest = z
  .strictObject({
    name: RuleName.optional(),
    enabled: z.boolean().optional(),
    position: z.number().int().min(0).max(10_000).optional(),
    events: z.array(RiskEventEnum).max(RISK_EVENTS.length).optional(),
    match: z.enum(["all", "any"]).optional(),
    conditions: z.array(RiskRuleCondition).min(1).max(MAX_RULE_CONDITIONS).optional(),
    action: RiskDecisionEnum.optional(),
  })
  .meta({ id: "UpdateRiskRuleRequest", examples: [{ enabled: false }] });
export type UpdateRiskRuleRequestOutput = z.output<typeof UpdateRiskRuleRequest>;

export const RiskRuleList = z
  .object({ object: z.literal("list"), data: z.array(RiskRule), has_more: z.literal(false) })
  .meta({
    id: "RiskRuleList",
    description: `Every rule of the environment (at most ${MAX_RISK_RULES}), in evaluation order.`,
    examples: [{ object: "list", data: [RULE_EXAMPLE], has_more: false }],
  });
export type RiskRuleListOutput = z.output<typeof RiskRuleList>;

export const DeletedRiskRule = z
  .object({ object: z.literal("risk_rule"), id: z.string(), deleted: z.literal(true) })
  .meta({ id: "DeletedRiskRule" });
