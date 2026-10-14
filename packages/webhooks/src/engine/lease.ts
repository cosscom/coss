/**
 * Leases: a claimed row's `lease_expires_at` doubles as its fencing token. A late worker (its lease
 * expired and another worker reclaimed the row) must not overwrite the newer worker's result, so
 * every write that finishes an attempt also matches the lease it was claimed with.
 *
 * Leases are always bound from a JS `Date` (millisecond precision), never computed in SQL: a
 * microsecond value read back into JS would never compare equal, and every fenced write would
 * silently match nothing.
 */
import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const LEASE_MS = 2 * 60 * 1000;

/** The lease a claim at `now` takes. */
export function leaseUntil(now: Date, leaseMs: number = LEASE_MS): Date {
  return new Date(now.getTime() + leaseMs);
}

/** Matches a row that is still pending and still holds the lease it was claimed with. */
export function stillOwned(
  columns: { status: AnyPgColumn; leaseExpiresAt: AnyPgColumn },
  lease: Date | null,
): SQL | undefined {
  return and(
    eq(columns.status, "pending"),
    lease ? eq(columns.leaseExpiresAt, lease) : isNull(columns.leaseExpiresAt),
  );
}
