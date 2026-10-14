import { createHash } from "node:crypto";
import {
  assertValidRule,
  BUCKETS,
  type BucketDefinition,
  type BucketName,
  type BucketScope,
  type LimitRule,
} from "./buckets.ts";
import type { LimitSpec } from "./gcra.ts";
import { noOverrides, type OverrideSource } from "./overrides.ts";
import type { RateLimitStore } from "./store.ts";

export type RateLimitRequest = {
  /** Buckets charged together (all or nothing). They must all have the same scope. */
  buckets: readonly BucketName[];
  /** The id the buckets count per: an API key, org, environment id, client IP or email address. */
  subject: string;
  /** Applies the organization's overrides (only to overridable buckets). */
  organizationId?: string | undefined;
  /** Tokens to take (e.g. recipients). Defaults to 1. */
  cost?: number;
  /**
   * Replaces the bucket's rule (and any override) for this call, e.g. a Hooks endpoint's own rate.
   * Single-bucket requests only.
   */
  rule?: LimitRule;
  /** Only report whether the request would be allowed. */
  peek?: boolean;
};

export type RateLimitDecision = {
  allowed: boolean;
  /** The bucket the numbers below describe: the denying one, else the one with fewest left. */
  bucket: BucketName;
  /** Bucket size (what `remaining` counts down from). */
  limit: number;
  remaining: number;
  /** Milliseconds until the bucket is full again. */
  resetMs: number;
  /** When denied: ms until a retry can succeed; `null` if the cost exceeds the bucket size. */
  retryAfterMs: number | null;
  /** True when the store failed and this bucket's explicit policy allowed the request. */
  failedOpen: boolean;
};

export type RateLimiter = {
  consume(request: RateLimitRequest): Promise<RateLimitDecision>;
  /** Gives back tokens taken by `consume` (e.g. when the charged work turned out to be a replay). */
  refund(request: RateLimitRequest): Promise<void>;
  close(): Promise<void>;
};

export type RateLimiterOptions = {
  store: RateLimitStore;
  /** Namespaces every key (`RATE_LIMIT_KEY_PREFIX`). */
  prefix?: string;
  overrides?: OverrideSource;
  /** Store failures (logged at most once per 10 s by default). */
  onStoreError?: (error: unknown) => void;
};

/** Keeps subjects (client IPs especially, which come from headers) short and free of `{}`. */
function normalizeSubject(scope: BucketScope, subject: string): string {
  if (scope === "email") return hashEmail(subject);
  if (/^[A-Za-z0-9_.:-]{1,64}$/.test(subject)) return subject;
  return createHash("sha256").update(subject).digest("hex").slice(0, 32);
}

/** Email addresses are hashed so keys never hold personal data. */
export function hashEmail(address: string): string {
  return createHash("sha256").update(address.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const prefix = opts.prefix ?? "coss";
  const overrides = opts.overrides ?? noOverrides;
  let lastLogged = 0;
  const onStoreError =
    opts.onStoreError ??
    ((error: unknown) => {
      const now = Date.now();
      if (now - lastLogged < 10_000) return;
      lastLogged = now;
      console.warn("[ratelimit] Store unavailable; applying bucket failure policy:", error);
    });

  function scopeOf(request: RateLimitRequest): BucketScope {
    const [first] = request.buckets;
    if (first === undefined) throw new Error("A rate limit request needs at least one bucket.");
    const scope = BUCKETS[first].scope;
    if (request.buckets.some((bucket) => BUCKETS[bucket].scope !== scope)) {
      // Different scopes hash to different cluster slots; they can't be charged atomically.
      throw new Error(`Buckets of one rate limit request must share a scope (${scope}).`);
    }
    if (request.rule) {
      if (request.buckets.length !== 1) {
        throw new Error("A rate limit request with its own rule charges exactly one bucket.");
      }
      assertValidRule(request.rule);
    }
    return scope;
  }

  async function resolve(request: RateLimitRequest, scope: BucketScope) {
    const custom =
      request.organizationId && !request.rule ? await overrides(request.organizationId) : {};
    // The hash tag keeps every bucket of one subject in one cluster slot.
    const tag = `{${scope}:${normalizeSubject(scope, request.subject)}}`;
    return request.buckets.map((bucket) => {
      const definition = BUCKETS[bucket];
      const rule: LimitRule =
        request.rule ?? ((definition.overridable && custom[bucket]) || definition);
      const burst = rule.burst ?? rule.limit;
      const spec: LimitSpec = {
        key: `${prefix}:rl:${tag}:${bucket}`,
        intervalMs: rule.periodMs / rule.limit,
        burst,
      };
      return { bucket, spec };
    });
  }

  return {
    async consume(request) {
      const scope = scopeOf(request);
      try {
        const resolved = await resolve(request, scope);
        const cost = request.cost ?? 1;
        const result = await opts.store.consume(
          resolved.map((entry) => entry.spec),
          { cost, peek: request.peek },
        );
        // Denied: the bucket with the longest wait (`null`, never fits, wins). Allowed: the
        // bucket with the fewest tokens left.
        let index = 0;
        result.limits.forEach((state, i) => {
          const best = result.limits[index];
          if (!best) return;
          if (!result.allowed) {
            const wait = state.retryAfterMs ?? Number.POSITIVE_INFINITY;
            const bestWait = best.retryAfterMs ?? Number.POSITIVE_INFINITY;
            if (wait > bestWait) index = i;
          } else if (state.remaining < best.remaining) {
            index = i;
          }
        });
        const chosen = resolved[index];
        const state = result.limits[index];
        if (!chosen || !state) throw new Error("Rate limit store returned no limits.");
        return {
          allowed: result.allowed,
          bucket: chosen.bucket,
          limit: chosen.spec.burst,
          remaining: state.remaining,
          resetMs: state.resetMs,
          retryAfterMs: result.allowed ? 0 : state.retryAfterMs,
          failedOpen: false,
        };
      } catch (error) {
        onStoreError(error);
        const firstName = request.buckets[0];
        if (!firstName) throw error;
        const first: BucketDefinition = BUCKETS[firstName];
        const failedOpen = request.buckets.every(
          (bucket) => BUCKETS[bucket].failureMode === "allow",
        );
        return {
          allowed: failedOpen,
          bucket: firstName,
          limit: first.burst ?? first.limit,
          remaining: failedOpen ? (first.burst ?? first.limit) : 0,
          resetMs: 0,
          retryAfterMs: failedOpen ? 0 : 1000,
          failedOpen,
        };
      }
    },

    async refund(request) {
      const scope = scopeOf(request);
      try {
        const resolved = await resolve(request, scope);
        await opts.store.consume(
          resolved.map((entry) => entry.spec),
          { cost: -(request.cost ?? 1) },
        );
      } catch (error) {
        onStoreError(error);
      }
    },

    close: () => opts.store.close(),
  };
}
