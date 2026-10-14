/**
 * Idempotency keys shared by every product: a request repeated with the same key replays the row
 * the first one created instead of creating another. Each product keeps its own key column or table
 * (a unique index arbitrates races) and passes the callbacks below.
 */
import { createHash } from "node:crypto";
import { db, type Transaction } from "./client.ts";

/** How long a key replays its request; afterwards the key may be reused for a new one. */
export const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_IDEMPOTENCY_ATTEMPTS = 5;

export type IdempotencyErrorCode = "request_in_progress" | "idempotency_key_reused";

/** The key is held by a request in flight (409, retry shortly), or was used with another body (422). */
export class IdempotencyError extends Error {
  readonly code: IdempotencyErrorCode;

  constructor(code: IdempotencyErrorCode, message: string) {
    super(message);
    this.name = "IdempotencyError";
    this.code = code;
  }
}

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

/** Fingerprint of a parsed request, compared when its idempotency key is reused. */
export function requestHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

/**
 * Inserts under an idempotency key, or replays the row that already holds it. The product's unique
 * index on the key arbitrates races: exactly one request inserts, every other one waits for its
 * commit, sees `DO NOTHING` (`insert` returns nothing) and replays the winner's row, whatever its
 * state.
 */
export async function withIdempotencyKey<
  Row extends { createdAt: Date; requestHash: string | null },
>(op: {
  requestHash: string;
  retentionMs?: number;
  now?: () => number;
  insert: (tx: Transaction) => Promise<Row | undefined>;
  existing: () => Promise<Row | undefined>;
  /** Compare-and-set the key off an expired row. */
  release: (tx: Transaction, existing: Row) => Promise<unknown>;
}): Promise<{ row: Row; replayed: boolean }> {
  const now = op.now ?? Date.now;
  let inserted = await db.transaction((tx) => op.insert(tx));
  for (let attempt = 1; !inserted; attempt++) {
    if (attempt > MAX_IDEMPOTENCY_ATTEMPTS) {
      throw new IdempotencyError(
        "request_in_progress",
        "This idempotency key is busy. Retry shortly.",
      );
    }
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
    if (existing.requestHash !== op.requestHash) {
      throw new IdempotencyError(
        "idempotency_key_reused",
        "This idempotency key was already used with a different request body.",
      );
    }
    return { row: existing, replayed: true };
  }
  return { row: inserted, replayed: false };
}
