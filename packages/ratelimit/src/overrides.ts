import { db, type Executor } from "@coss/db";
import { adminAuditEvent, organization, rateLimitOverride } from "@coss/db/schema";
import { and, eq } from "drizzle-orm";
import {
  assertValidRule,
  type BucketName,
  isOverridableBucket,
  type LimitRule,
} from "./buckets.ts";

export type OverrideRules = Partial<Record<BucketName, LimitRule>>;

/** Resolves an organization's overrides. The limiter calls it on every org-scoped check. */
export type OverrideSource = (organizationId: string) => Promise<OverrideRules>;

export const noOverrides: OverrideSource = async () => ({});

/** An organization's plan rules (`@coss/billing`'s `planRateLimits`), keyed by bucket name. */
export type PlanRuleSource = (
  organizationId: string,
) => Promise<Partial<Record<string, LimitRule>>>;

/**
 * The plan layer: an organization's plan sets its (overridable) buckets' rules, and an admin
 * override still wins. Without plan rules (or when they fail to load), the defaults apply.
 */
export function withPlanRules(
  planRules: PlanRuleSource,
  load: OverrideSource = listRateLimitOverrides,
): OverrideSource {
  return async (organizationId) => {
    const [plan, overrides] = await Promise.all([
      planRules(organizationId).catch((error: unknown) => {
        console.warn("[ratelimit] Loading plan rate limits failed; using defaults:", error);
        return {};
      }),
      load(organizationId),
    ]);
    const rules: OverrideRules = {};
    for (const [bucket, rule] of Object.entries(plan)) {
      if (rule && isOverridableBucket(bucket)) rules[bucket] = rule;
    }
    return { ...rules, ...overrides };
  };
}

export async function listRateLimitOverrides(organizationId: string): Promise<OverrideRules> {
  const rows = await db
    .select()
    .from(rateLimitOverride)
    .where(eq(rateLimitOverride.organizationId, organizationId));
  const rules: OverrideRules = {};
  for (const row of rows) {
    // Rows for buckets that were since removed or made non-overridable are ignored.
    if (!isOverridableBucket(row.bucket)) continue;
    rules[row.bucket] = {
      limit: row.limit,
      periodMs: row.periodMs,
      ...(row.burst === null ? {} : { burst: row.burst }),
    };
  }
  return rules;
}

export async function setRateLimitOverride(
  input: {
    organizationId: string;
    bucket: string;
    rule: LimitRule;
  },
  executor: Executor = db,
): Promise<void> {
  const { organizationId, bucket, rule } = input;
  if (!isOverridableBucket(bucket)) {
    throw new RangeError(`"${bucket}" is not a bucket organizations can override.`);
  }
  assertValidRule(rule);
  const values = {
    limit: rule.limit,
    periodMs: rule.periodMs,
    burst: rule.burst ?? null,
  };
  await executor
    .insert(rateLimitOverride)
    .values({ organizationId, bucket, ...values })
    .onConflictDoUpdate({
      target: [rateLimitOverride.organizationId, rateLimitOverride.bucket],
      set: values,
    });
}

/** Returns whether an override existed. */
export async function deleteRateLimitOverride(
  input: {
    organizationId: string;
    bucket: string;
  },
  executor: Executor = db,
): Promise<boolean> {
  const deleted = await executor
    .delete(rateLimitOverride)
    .where(
      and(
        eq(rateLimitOverride.organizationId, input.organizationId),
        eq(rateLimitOverride.bucket, input.bucket),
      ),
    )
    .returning({ id: rateLimitOverride.id });
  return deleted.length > 0;
}

/** The platform admin changing an override; the email is copied into the audit log. */
export type OverrideActor = { userId: string; email: string };

/**
 * Sets (`rule`) or removes (`rule: null`) an override for a platform admin, recording an
 * `admin_audit_event` (`rate_limit.override_set` / `rate_limit.override_reset`, with the bucket and
 * the previous and new rules) in the same transaction. Removing a missing override records nothing
 * and returns false. Call it only after checking that the caller is a platform admin.
 */
export async function changeRateLimitOverride(input: {
  organizationId: string;
  bucket: string;
  rule: LimitRule | null;
  actor: OverrideActor;
  reason?: string | null;
}): Promise<boolean> {
  const { organizationId, bucket, rule } = input;
  if (!isOverridableBucket(bucket)) {
    throw new RangeError(`"${bucket}" is not a bucket organizations can override.`);
  }
  if (rule) assertValidRule(rule);
  return db.transaction(async (tx) => {
    // An override may not exist yet. Lock its organization before reading so concurrent
    // admin changes record the rule they actually replace, including the first creation.
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for("update");
    const [row] = await tx
      .select()
      .from(rateLimitOverride)
      .where(
        and(
          eq(rateLimitOverride.organizationId, organizationId),
          eq(rateLimitOverride.bucket, bucket),
        ),
      )
      .for("update");
    if (!row && !rule) return false;
    if (rule) await setRateLimitOverride({ organizationId, bucket, rule }, tx);
    else await deleteRateLimitOverride({ organizationId, bucket }, tx);
    await tx.insert(adminAuditEvent).values({
      actorUserId: input.actor.userId,
      actorEmail: input.actor.email,
      action: rule ? "rate_limit.override_set" : "rate_limit.override_reset",
      targetType: "organization",
      targetId: organizationId,
      organizationId,
      reason: input.reason?.trim() || null,
      metadata: {
        bucket,
        previous: row
          ? { limit: row.limit, periodMs: row.periodMs, burst: row.burst ?? row.limit }
          : null,
        rule: rule ? { ...rule, burst: rule.burst ?? rule.limit } : null,
      },
    });
    return true;
  });
}

/**
 * Caches each organization's overrides in-process for `ttlMs` (an override change takes up to that
 * long to apply). A failed lookup falls back to the defaults without caching the failure.
 */
export function cachedOverrides(
  opts: { ttlMs?: number; load?: OverrideSource; now?: () => number } = {},
): OverrideSource {
  const ttlMs = opts.ttlMs ?? 60_000;
  const load = opts.load ?? listRateLimitOverrides;
  const now = opts.now ?? Date.now;
  const cache = new Map<string, { rules: Promise<OverrideRules>; expiresAt: number }>();

  return async (organizationId) => {
    const cached = cache.get(organizationId);
    if (cached && cached.expiresAt > now()) return cached.rules;
    if (cache.size > 10_000) cache.clear();
    const rules = load(organizationId).catch((error: unknown) => {
      cache.delete(organizationId);
      console.warn("[ratelimit] Loading rate limit overrides failed; using defaults:", error);
      return {};
    });
    cache.set(organizationId, { rules, expiresAt: now() + ttlMs });
    return rules;
  };
}
