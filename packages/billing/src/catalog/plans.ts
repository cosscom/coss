/**
 * The plans. A plan's monthly fee is credit spendable on any product's usage, so a month costs
 * the larger of the fee and the usage (plus add-ons). Free has no credit but includes 3,000
 * emails a month and blocks usage beyond its allowance.
 */
import { type Entitlements, perDay, perSecond } from "./entitlements.ts";
import type { MeterKey } from "./meters.ts";

export const PLAN_KEYS = ["free", "pro", "scale", "enterprise"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  description: string;
  /** Upgrades go to a higher rank, downgrades to a lower one. */
  rank: number;
  /** Whether customers can switch to it from the dashboard (Enterprise is sold by sales). */
  selfServe: boolean;
  /** Monthly fee, also the month's spendable usage credit. Enterprise's is a starting point. */
  feeCents: bigint;
  /** Units included every month, whatever the credit. */
  includedUnits: Readonly<Partial<Record<MeterKey, number>>>;
  /** `blocked`: usage stops at the included units (no payment method on file). */
  overage: "billed" | "blocked";
  /** Term of a new contract on this plan, in months (`null`: month to month). */
  termMonths: number | null;
  entitlements: Entitlements;
  /** Shown on the plan picker and in the docs. */
  highlights: readonly string[];
};

export const PLANS = {
  free: {
    key: "free",
    name: "Free",
    description: "For trying COSS and side projects.",
    rank: 0,
    selfServe: true,
    feeCents: 0n,
    includedUnits: { "email.recipients": 3_000 },
    overage: "blocked",
    termMonths: null,
    entitlements: {
      features: {
        trackingDomains: false,
        auditLog: false,
        logDrains: false,
        sso: false,
        scim: false,
        dedicatedIps: false,
      },
      limits: { domains: 1, members: 3, webhookEndpointsPerEnvironment: 2 },
      rateLimits: {
        "email.recipients.second": perSecond(2, 50),
        "email.recipients.day": perDay(3_000),
      },
    },
    highlights: ["3,000 emails per month", "1 domain", "3 team members"],
  },
  pro: {
    key: "pro",
    name: "Pro",
    description: "For production apps. $25 a month, all of it spendable on usage.",
    rank: 1,
    selfServe: true,
    feeCents: 2_500n,
    includedUnits: {},
    overage: "billed",
    termMonths: null,
    entitlements: {
      features: {
        trackingDomains: true,
        auditLog: true,
        logDrains: false,
        sso: false,
        scim: false,
        dedicatedIps: false,
      },
      limits: { domains: 10, members: 10, webhookEndpointsPerEnvironment: 10 },
      rateLimits: {
        "email.recipients.second": perSecond(14, 100),
        "email.recipients.day": perDay(100_000),
      },
    },
    highlights: [
      "$25 of usage included",
      "10 domains",
      "10 team members",
      "Custom tracking domains",
      "Audit log",
    ],
  },
  scale: {
    key: "scale",
    name: "Scale",
    description: "For growing teams. $250 a month, all of it spendable on usage.",
    rank: 2,
    selfServe: true,
    feeCents: 25_000n,
    includedUnits: {},
    overage: "billed",
    termMonths: null,
    entitlements: {
      features: {
        trackingDomains: true,
        auditLog: true,
        logDrains: true,
        sso: true,
        scim: false,
        dedicatedIps: false,
      },
      limits: { domains: 100, members: null, webhookEndpointsPerEnvironment: 10 },
      rateLimits: {
        "email.recipients.second": perSecond(50, 200),
        "email.recipients.day": perDay(1_000_000),
      },
    },
    highlights: [
      "$250 of usage included",
      "100 domains",
      "Unlimited team members",
      "Log drains",
      "Single sign-on",
    ],
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description: "Annual commitments, custom pricing and terms. From $2,000 a month.",
    rank: 3,
    selfServe: false,
    feeCents: 200_000n,
    includedUnits: {},
    overage: "billed",
    termMonths: 12,
    entitlements: {
      features: {
        trackingDomains: true,
        auditLog: true,
        logDrains: true,
        sso: true,
        scim: true,
        dedicatedIps: false,
      },
      limits: { domains: null, members: null, webhookEndpointsPerEnvironment: 10 },
      rateLimits: {
        "email.recipients.second": perSecond(100, 500),
        "email.recipients.day": perDay(5_000_000),
      },
    },
    highlights: [
      "Volume pricing and commitments",
      "Directory sync (SCIM)",
      "SMS",
      "Invoicing and direct debit",
    ],
  },
} as const satisfies Record<PlanKey, PlanDefinition>;

export function isPlanKey(value: string): value is PlanKey {
  return Object.hasOwn(PLANS, value);
}

export function planDefinition(key: PlanKey): PlanDefinition {
  return PLANS[key];
}

export const SELF_SERVE_PLANS: readonly PlanKey[] = PLAN_KEYS.filter((key) => PLANS[key].selfServe);
