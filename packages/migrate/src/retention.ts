/**
 * Purges (the worker's `retention` loop): finished imports after `RETENTION_DAYS.migrations` (their
 * items cascade), and imports never started after `RETENTION_DAYS.migrationDrafts` (with the key
 * they hold). What an import created is the customer's and is never purged here.
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, inArray, lt, type SQL, sql } from "drizzle-orm";

const { migration } = schema;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

async function purge(where: SQL | undefined, opts: PurgeOptions): Promise<number> {
  const expired = and(
    where,
    opts.scope ? inArray(migration.organizationId, opts.scope.organizationIds) : undefined,
  );
  const ids = db
    .select({ id: migration.id })
    .from(migration)
    .where(expired)
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(migration)
    .where(and(sql`${migration.id} in ${ids}`, expired))
    .returning({ id: migration.id });
  return deleted.length;
}

export function purgeExpiredMigrations(opts: PurgeOptions = {}): Promise<number> {
  return purge(
    and(
      inArray(migration.status, ["completed", "failed", "canceled"]),
      lt(migration.createdAt, retentionCutoff(RETENTION_DAYS.migrations, opts.now)),
    ),
    opts,
  );
}

export function purgeAbandonedMigrationDrafts(opts: PurgeOptions = {}): Promise<number> {
  return purge(
    and(
      inArray(migration.status, ["inspecting", "ready"]),
      lt(migration.createdAt, retentionCutoff(RETENTION_DAYS.migrationDrafts, opts.now)),
    ),
    opts,
  );
}
