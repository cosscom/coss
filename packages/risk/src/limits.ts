/**
 * Rate limiting as a service: an environment's own buckets (`risk_limit_bucket`) and
 * `checkRiskLimit`, which charges one of them for a key with the GCRA engine coss.com limits itself
 * with (`@coss/ratelimit`'s store, in Valkey). Keys are HMACs (`limit_key`), so the store never
 * holds the customer's identifiers. A store failure answers with the bucket's `on_failure`.
 */
import { createHash } from "node:crypto";
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, count, eq } from "drizzle-orm";
import type { RiskDeps } from "./assess.ts";
import { RiskError } from "./errors.ts";
import {
  type CheckRiskLimitRequestOutput,
  type CreateRiskLimitBucketRequestOutput,
  MAX_RISK_LIMIT_BUCKETS,
  type RiskLimitBucketListOutput,
  type RiskLimitBucketOutput,
  type RiskLimitOutput,
  type UpdateRiskLimitBucketRequestOutput,
} from "./schemas.ts";

const { riskLimitBucket } = schema;

type Scope = { organizationId: string; environmentId: string };
type BucketRow = typeof riskLimitBucket.$inferSelect;

function inScope(scope: Scope) {
  return and(
    eq(riskLimitBucket.organizationId, scope.organizationId),
    eq(riskLimitBucket.environmentId, scope.environmentId),
  );
}

export function toRiskLimitBucketObject(row: BucketRow): RiskLimitBucketOutput {
  return {
    object: "risk_limit_bucket",
    id: row.id,
    name: row.name,
    limit: row.limit,
    period_seconds: Math.round(row.periodMs / 1000),
    burst: row.burst,
    on_failure: row.onFailure,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function listRiskLimitBuckets(scope: Scope): Promise<RiskLimitBucketListOutput> {
  const rows = await db
    .select()
    .from(riskLimitBucket)
    .where(inScope(scope))
    .orderBy(asc(riskLimitBucket.name));
  return { object: "list", data: rows.map(toRiskLimitBucketObject), has_more: false };
}

export async function getRiskLimitBucket(
  scope: Scope,
  id: string,
): Promise<RiskLimitBucketOutput | null> {
  if (!isId("rsklb", id)) return null;
  const [row] = await db
    .select()
    .from(riskLimitBucket)
    .where(and(inScope(scope), eq(riskLimitBucket.id, id)))
    .limit(1);
  return row ? toRiskLimitBucketObject(row) : null;
}

function nameTaken(name: string): RiskError {
  return new RiskError(
    "limit_bucket_name_taken",
    `This environment already has a bucket named "${name}".`,
    { param: "name" },
  );
}

/** `null` when the environment isn't in the organization. */
export async function createRiskLimitBucket(
  scope: Scope,
  params: CreateRiskLimitBucketRequestOutput,
): Promise<RiskLimitBucketOutput | null> {
  return db.transaction(async (tx) => {
    const [environment] = await tx
      .select({ projectId: schema.environment.projectId })
      .from(schema.environment)
      .where(
        and(
          eq(schema.environment.id, scope.environmentId),
          eq(schema.environment.organizationId, scope.organizationId),
        ),
      )
      // Serializes creates, so the limit and the name check hold under concurrency.
      .for("update")
      .limit(1);
    if (!environment) return null;
    const [existing] = await tx
      .select({ total: count() })
      .from(riskLimitBucket)
      .where(inScope(scope));
    if ((existing?.total ?? 0) >= MAX_RISK_LIMIT_BUCKETS) {
      throw new RiskError(
        "too_many_limit_buckets",
        `An environment can have at most ${MAX_RISK_LIMIT_BUCKETS} rate limit buckets.`,
      );
    }
    const [row] = await tx
      .insert(riskLimitBucket)
      .values({
        ...scope,
        projectId: environment.projectId,
        name: params.name,
        limit: params.limit,
        periodMs: params.period_seconds * 1000,
        burst: params.burst ?? params.limit,
        onFailure: params.on_failure ?? "allow",
      })
      .onConflictDoNothing({ target: [riskLimitBucket.environmentId, riskLimitBucket.name] })
      .returning();
    if (!row) throw nameTaken(params.name);
    return toRiskLimitBucketObject(row);
  });
}

export async function updateRiskLimitBucket(
  scope: Scope,
  id: string,
  params: UpdateRiskLimitBucketRequestOutput,
): Promise<RiskLimitBucketOutput | null> {
  if (!isId("rsklb", id)) return null;
  const [row] = await db
    .update(riskLimitBucket)
    .set({
      ...(params.limit === undefined ? {} : { limit: params.limit }),
      ...(params.period_seconds === undefined ? {} : { periodMs: params.period_seconds * 1000 }),
      ...(params.burst === undefined ? {} : { burst: params.burst }),
      ...(params.on_failure === undefined ? {} : { onFailure: params.on_failure }),
      updatedAt: new Date(),
    })
    .where(and(inScope(scope), eq(riskLimitBucket.id, id)))
    .returning();
  return row ? toRiskLimitBucketObject(row) : null;
}

export async function deleteRiskLimitBucket(
  scope: Scope,
  id: string,
): Promise<RiskLimitBucketOutput | null> {
  if (!isId("rsklb", id)) return null;
  const [row] = await db
    .delete(riskLimitBucket)
    .where(and(inScope(scope), eq(riskLimitBucket.id, id)))
    .returning();
  return row ? toRiskLimitBucketObject(row) : null;
}

/** The store key of one key's state in a bucket: one key per call, so cluster-safe. */
export function limitStoreKey(prefix: string, bucketId: string, keyHash: string): string {
  return `${prefix}:risk:l:{${bucketId}:${keyHash}}`;
}

/** How long a retry with the same `Idempotency-Key` gets the original answer instead of a charge. */
export const LIMIT_IDEMPOTENCY_TTL_MS = 60 * 60_000;

/**
 * `POST /v1/risk/limits`: charges `cost` tokens from the key's bucket. Throws `not_found` for an
 * unknown bucket. Bucket changes apply to the next call: a new rate or size is read every time.
 * With an `idempotencyKey`, a retry of an allowed check within the hour is answered again without
 * a second charge.
 */
export async function checkRiskLimit(
  deps: Pick<RiskDeps, "hash" | "keyPrefix" | "limits">,
  scope: Scope,
  params: CheckRiskLimitRequestOutput,
  opts: { idempotencyKey?: string | null } = {},
): Promise<RiskLimitOutput> {
  const [bucket] = await db
    .select()
    .from(riskLimitBucket)
    .where(and(inScope(scope), eq(riskLimitBucket.name, params.bucket)))
    .limit(1);
  if (!bucket) {
    throw new RiskError("not_found", `No rate limit bucket named "${params.bucket}" exists.`, {
      param: "bucket",
    });
  }
  const failed = (): RiskLimitOutput => ({
    object: "risk_limit",
    bucket: bucket.name,
    allowed: bucket.onFailure === "allow",
    limit: bucket.burst,
    remaining: bucket.onFailure === "allow" ? bucket.burst : 0,
    reset_ms: 0,
    retry_after_ms: bucket.onFailure === "allow" ? 0 : null,
    degraded: true,
  });
  if (!deps.limits) return failed();
  const keyHash = deps.hash(scope.environmentId, "limit_key", params.key);
  const storeKey = limitStoreKey(deps.keyPrefix, bucket.id, keyHash);
  try {
    const result = await deps.limits.consume(
      [{ key: storeKey, intervalMs: bucket.periodMs / bucket.limit, burst: bucket.burst }],
      {
        cost: params.cost ?? 1,
        ...(opts.idempotencyKey
          ? {
              idempotency: {
                // Same hash tag as the bucket's key (one cluster slot).
                key: `${storeKey}:i:${createHash("sha256").update(opts.idempotencyKey).digest("base64url").slice(0, 32)}`,
                ttlMs: LIMIT_IDEMPOTENCY_TTL_MS,
              },
            }
          : {}),
      },
    );
    const [state] = result.limits;
    if (!state) return failed();
    return {
      object: "risk_limit",
      bucket: bucket.name,
      allowed: result.allowed,
      limit: bucket.burst,
      remaining: state.remaining,
      reset_ms: state.resetMs,
      retry_after_ms: state.retryAfterMs,
      degraded: false,
    };
  } catch (error) {
    console.warn(
      "[risk] Rate limit store is unavailable:",
      error instanceof Error ? error.message : error,
    );
    return failed();
  }
}
