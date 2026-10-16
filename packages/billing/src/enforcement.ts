/**
 * Plan enforcement, wired by the apps into the product packages (`PlanGate`, `UsageGate`) and the
 * rate limiter (`planRateLimits`). coss.com's own organization is never limited.
 */
import { db, type Executor, schema } from "@coss/db";
import { and, eq, sql } from "drizzle-orm";
import {
  type Entitlements,
  FEATURE_LABELS,
  type FeatureKey,
  LIMIT_LABELS,
  type LimitKey,
  RATE_LIMIT_KEYS,
  type RateLimitRule,
} from "./catalog/entitlements.ts";
import { METERS, type MeterKey } from "./catalog/meters.ts";
import { PLAN_KEYS, PLANS, type PlanKey } from "./catalog/plans.ts";
import { meterAvailability } from "./engine/terms.ts";
import { BillingError } from "./errors.ts";
import type { PlanGate, UsageGate } from "./gate.ts";
import { billingStateAt, creatableEntitlements } from "./resolve.ts";
import { periodOf } from "./time.ts";

const { billingQuota } = schema;

/** The cheapest self-serve plan (or Enterprise) that has a feature, for messages. */
export function planWith(predicate: (entitlements: Entitlements) => boolean): PlanKey {
  return PLAN_KEYS.find((key) => predicate(PLANS[key].entitlements)) ?? "enterprise";
}

export function featureUnavailable(feature: FeatureKey): BillingError {
  const plan = PLANS[planWith((e) => e.features[feature])].name;
  return new BillingError(
    "plan_feature_unavailable",
    `${FEATURE_LABELS[feature]} ${feature === "auditLog" ? "is" : "are"} available on the ${plan} plan and above.`,
  );
}

export function limitReached(limit: LimitKey, value: number): BillingError {
  return new BillingError(
    "plan_limit_reached",
    `Your plan allows ${value.toLocaleString("en-US")} ${LIMIT_LABELS[limit].toLowerCase()}. Upgrade to add more.`,
  );
}

/** What the organization may create now (see `creatableEntitlements`). */
export async function entitlementsFor(
  organizationId: string,
  now: Date = new Date(),
  executor: Executor = db,
): Promise<Entitlements> {
  return creatableEntitlements(await billingStateAt(organizationId, now, executor));
}

export function createPlanGate(opts: { systemOrganizationId?: string | null } = {}): PlanGate {
  const exempt = (organizationId: string) => organizationId === opts.systemOrganizationId;
  return {
    async requireFeature(organizationId, feature) {
      if (exempt(organizationId)) return;
      const entitlements = await entitlementsFor(organizationId);
      if (!entitlements.features[feature]) throw featureUnavailable(feature);
    },
    async requireCapacity(organizationId, limit, current, count = 1) {
      if (exempt(organizationId)) return;
      const value = (await entitlementsFor(organizationId)).limits[limit];
      if (value !== null && current + count > value) throw limitReached(limit, value);
    },
    async limit(organizationId, limit) {
      if (exempt(organizationId)) return null;
      return (await entitlementsFor(organizationId)).limits[limit];
    },
  };
}

type CapCache = Map<string, { capped: boolean; expiresAt: number }>;

/**
 * Hard per-period caps (Free's 3,000 emails), reserved in the send's transaction. Organizations
 * believed uncapped skip the database for `ttlMs`; capped ones read their plan on every send, so
 * an upgrade lifts the cap at once.
 */
export function createUsageGate(
  opts: { systemOrganizationId?: string | null; ttlMs?: number } = {},
): UsageGate {
  const ttlMs = opts.ttlMs ?? 60_000;
  const cache: CapCache = new Map();
  return {
    async reserve(tx, input) {
      if (input.quantity <= 0 || input.organizationId === opts.systemOrganizationId) return;
      const cacheKey = `${input.organizationId}:${input.meter}`;
      const cached = cache.get(cacheKey);
      if (cached && !cached.capped && cached.expiresAt > Date.now()) return;
      const now = new Date();
      const state = await billingStateAt(input.organizationId, now, tx);
      const availability = meterAvailability(state.terms, input.meter);
      if (availability === "requires_commitment" || availability === "not_priced") {
        throw new BillingError(
          "plan_feature_unavailable",
          `${METERS[input.meter].label} needs a contract. Contact sales.`,
        );
      }
      const cap = state.terms.usageCaps[input.meter];
      cache.set(cacheKey, { capped: cap !== undefined, expiresAt: Date.now() + ttlMs });
      if (cap === undefined) return;
      await reserveUnderCap(tx, {
        organizationId: input.organizationId,
        meter: input.meter,
        quantity: input.quantity,
        cap,
        periodStart: periodOf(now).start,
        plan: state.terms.plan,
      });
    },
  };
}

async function reserveUnderCap(
  tx: Executor,
  input: {
    organizationId: string;
    meter: MeterKey;
    quantity: number;
    cap: number;
    periodStart: Date;
    plan: PlanKey;
  },
): Promise<void> {
  // One statement: the row's lock serializes concurrent sends, so the cap can't be overshot.
  const reserved = await tx
    .insert(billingQuota)
    .values({
      organizationId: input.organizationId,
      meter: input.meter,
      periodStart: input.periodStart,
      reserved: input.quantity,
    })
    .onConflictDoUpdate({
      target: [billingQuota.organizationId, billingQuota.meter, billingQuota.periodStart],
      set: { reserved: sql`${billingQuota.reserved} + excluded.reserved`, updatedAt: new Date() },
      setWhere: sql`${billingQuota.reserved} + excluded.reserved <= ${input.cap}`,
    })
    .returning({ reserved: billingQuota.reserved });
  // Nothing returned: the update's condition failed. A first reservation over the cap was
  // inserted, but the error below rolls the send's transaction (and it) back.
  if (reserved[0] !== undefined && reserved[0].reserved <= input.cap) return;
  const meter = METERS[input.meter];
  throw new BillingError(
    "usage_limit_exceeded",
    input.cap === 0
      ? `${meter.label} isn't included in the ${PLANS[input.plan].name} plan. Upgrade to use it.`
      : `The ${PLANS[input.plan].name} plan includes ${input.cap.toLocaleString("en-US")} ${meter.label.toLowerCase()} ${meter.units} a month, and this would go past it. Upgrade to keep sending.`,
  );
}

/** Units reserved against a cap this period (dashboard progress). */
export async function reservedThisPeriod(
  organizationId: string,
  meter: MeterKey,
  now: Date = new Date(),
): Promise<number> {
  const [row] = await db
    .select({ reserved: billingQuota.reserved })
    .from(billingQuota)
    .where(
      and(
        eq(billingQuota.organizationId, organizationId),
        eq(billingQuota.meter, meter),
        eq(billingQuota.periodStart, periodOf(now).start),
      ),
    );
  return row?.reserved ?? 0;
}

/**
 * The organization's plan rate limits, for `@coss/ratelimit`'s plan layer (an admin override
 * still wins). Keys are bucket names.
 */
export async function planRateLimits(
  organizationId: string,
  opts: { systemOrganizationId?: string | null } = {},
): Promise<Record<string, RateLimitRule>> {
  if (organizationId === opts.systemOrganizationId) return {};
  const { terms } = await billingStateAt(organizationId, new Date());
  const rules: Record<string, RateLimitRule> = {};
  for (const key of RATE_LIMIT_KEYS) rules[key] = terms.entitlements.rateLimits[key];
  return rules;
}
