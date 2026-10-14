/**
 * `Idempotency-Key` support shared by products whose creates aren't naturally idempotent (email
 * sends, risk assessments): a row holds the key and the fingerprint of the request that created
 * it, under a unique `(environment_id, idempotency_key)` index.
 */
import { createHash } from "node:crypto";
import { db, type Transaction } from "./client.ts";

/** A key can be reused for a different request once the row holding it is this old. */
export const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000;

/** Each retry means another request changed the key's owner under us; this never loops in practice. */
const MAX_IDEMPOTENCY_ATTEMPTS = 5;

/** JSON with object keys sorted (by code unit) at every level; `undefined` members are dropped. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const members = Object.entries(value)
      .filter(([, member]) => member !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, member]) => `${JSON.stringify(key)}:${canonicalJson(member)}`);
    return `{${members.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Fingerprint of a parsed request body, compared when an idempotency key is reused. */
export function requestHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

/** Whether `existing` (found under the key) replays a request with this fingerprint. */
export function isReplayOf(
  existing: { createdAt: Date; requestHash: string | null },
  requestHash: string | null,
  retentionMs = IDEMPOTENCY_KEY_TTL_MS,
): boolean {
  return (
    existing.requestHash === requestHash && Date.now() - existing.createdAt.getTime() <= retentionMs
  );
}

/** The product errors for a busy key and a key reused with another body. */
export type IdempotencyErrors = {
  inProgress: () => Error;
  reused: () => Error;
};

/**
 * Inserts under an idempotency key, or replays the row that already holds it. The unique
 * (environment_id, idempotency_key) index arbitrates races: exactly one request inserts, every
 * other one waits for its commit, sees `DO NOTHING` (`insert` returns nothing) and replays the
 * winner's row, whatever its status (a queued email is replayed as queued).
 */
export async function withIdempotencyKey<
  Row extends { createdAt: Date; requestHash: string | null },
>(op: {
  requestHash: string;
  retentionMs?: number;
  /** The clock, for tests. */
  now?: () => number;
  insert: (tx: Transaction) => Promise<Row | undefined>;
  existing: () => Promise<Row | undefined>;
  /** Compare-and-set the key off an expired row. */
  release: (tx: Transaction, existing: Row) => Promise<unknown>;
  errors: IdempotencyErrors;
}): Promise<{ row: Row; replayed: boolean }> {
  const now = op.now ?? Date.now;
  let inserted = await db.transaction((tx) => op.insert(tx));
  for (let attempt = 1; !inserted; attempt++) {
    if (attempt > MAX_IDEMPOTENCY_ATTEMPTS) throw op.errors.inProgress();
    const existing = await op.existing();
    if (!existing) {
      // Its owner expired and released the key between our insert and select.
      inserted = await db.transaction((tx) => op.insert(tx));
      continue;
    }
    if (now() - existing.createdAt.getTime() > (op.retentionMs ?? IDEMPOTENCY_KEY_TTL_MS)) {
      // Expired: move the key to a new row atomically. The compare-and-set on the old row makes
      // concurrent requests with the same expired key queue up behind each other.
      inserted = await db.transaction(async (tx) => {
        await op.release(tx, existing);
        return op.insert(tx);
      });
      continue;
    }
    if (existing.requestHash !== op.requestHash) throw op.errors.reused();
    return { row: existing, replayed: true };
  }
  return { row: inserted, replayed: false };
}
