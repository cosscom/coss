import { db } from "@coss/db";
import { rateLimitOverride } from "@coss/db/schema";
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

export async function setRateLimitOverride(input: {
  organizationId: string;
  bucket: string;
  rule: LimitRule;
}): Promise<void> {
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
  await db
    .insert(rateLimitOverride)
    .values({ organizationId, bucket, ...values })
    .onConflictDoUpdate({
      target: [rateLimitOverride.organizationId, rateLimitOverride.bucket],
      set: values,
    });
}

/** Returns whether an override existed. */
export async function deleteRateLimitOverride(input: {
  organizationId: string;
  bucket: string;
}): Promise<boolean> {
  const deleted = await db
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
