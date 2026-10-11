/**
 * Deletes account data past its retention (`@coss/retention`; the worker's `retention` loop).
 * System-level: the scans span organizations and users. Imports only `@coss/db` (no Better Auth
 * instance), so the worker can use it without the dashboard's auth configuration.
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, inArray, lt, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

const { adminAuditEvent, invitation, session, verification } = schema;

type Limit = { now?: Date; limit?: number };

/** `DELETE … WHERE id IN (up to limit ids matching where, oldest first)`; the number deleted. */
async function deleteBatch(
  table: PgTable & { id: PgColumn },
  where: SQL | undefined,
  oldestFirst: PgColumn,
  limit: number,
): Promise<number> {
  const due = db
    .select({ id: table.id })
    .from(table)
    .where(where)
    .orderBy(asc(oldestFirst))
    .limit(limit);
  const deleted = await db
    .delete(table)
    .where(and(inArray(table.id, due), where))
    .returning({ id: table.id });
  return deleted.length;
}

/**
 * Deletes sessions, verification tokens (email verification, password reset) and invitations
 * that expired before the cutoff, up to `limit` of each. `scope` limits each table to some users,
 * identifiers or organizations (tests); a table it doesn't name is left alone.
 */
export async function purgeExpiredAuthRows(
  opts: Limit & {
    scope?: { userIds?: string[]; identifiers?: string[]; organizationIds?: string[] };
  } = {},
): Promise<{ sessions: number; verifications: number; invitations: number }> {
  const cutoff = retentionCutoff(RETENTION_DAYS.expiredAuth, opts.now);
  const limit = opts.limit ?? 1000;
  const { scope } = opts;
  return {
    sessions: await deleteBatch(
      session,
      and(
        lt(session.expiresAt, cutoff),
        scope ? inArray(session.userId, scope.userIds ?? []) : undefined,
      ),
      session.expiresAt,
      limit,
    ),
    verifications: await deleteBatch(
      verification,
      and(
        lt(verification.expiresAt, cutoff),
        scope ? inArray(verification.identifier, scope.identifiers ?? []) : undefined,
      ),
      verification.expiresAt,
      limit,
    ),
    invitations: await deleteBatch(
      invitation,
      and(
        lt(invitation.expiresAt, cutoff),
        scope ? inArray(invitation.organizationId, scope.organizationIds ?? []) : undefined,
      ),
      invitation.expiresAt,
      limit,
    ),
  };
}

/**
 * Deletes platform admin audit events created before the cutoff. `scope` limits the scan to
 * events naming some organizations (tests).
 */
export async function purgeExpiredAdminAuditEvents(
  opts: Limit & { scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.adminAuditLog, opts.now);
  return deleteBatch(
    adminAuditEvent,
    and(
      lt(adminAuditEvent.createdAt, cutoff),
      opts.scope ? inArray(adminAuditEvent.organizationId, opts.scope.organizationIds) : undefined,
    ),
    adminAuditEvent.createdAt,
    opts.limit ?? 1000,
  );
}
