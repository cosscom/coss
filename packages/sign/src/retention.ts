/**
 * Purges for Sign's own short-lived rows (requests, documents and their trail are kept until the
 * customer deletes them, `RETENTION_POLICY` `signature_requests`). System-level, like every purge:
 * `{ now, limit, scope }`, the oldest batch, the condition re-checked in the delete.
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, lt, sql } from "drizzle-orm";

const { signBuilderSession, signSession } = schema;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

/** Signing and builder sessions expired more than `RETENTION_DAYS.signSessions` ago. */
export async function purgeExpiredSignSessions(opts: PurgeOptions = {}): Promise<number> {
  const now = opts.now ?? new Date();
  const cutoff = retentionCutoff(RETENTION_DAYS.signSessions, now);
  const limit = opts.limit ?? 1000;
  let deleted = 0;
  for (const table of [signSession, signBuilderSession]) {
    const ids = db
      .select({ id: table.id })
      .from(table)
      .where(
        and(
          lt(table.expiresAt, cutoff),
          opts.scope
            ? sql`${table.organizationId} = any(${sql.param(opts.scope.organizationIds)}::text[])`
            : undefined,
        ),
      )
      .limit(limit);
    const rows = await db
      .delete(table)
      .where(and(sql`${table.id} in ${ids}`, lt(table.expiresAt, cutoff)))
      .returning({ id: table.id });
    deleted += rows.length;
  }
  return deleted;
}
