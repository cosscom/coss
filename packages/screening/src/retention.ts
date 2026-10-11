/**
 * Deletes content screening verdicts past their retention (`@coss/retention`; the worker's
 * `retention` loop). The per-organization counters are never purged: they are the sampling
 * sequence. System-level: the scan spans organizations; `scope` limits it to some (tests).
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, inArray, lt } from "drizzle-orm";

const { contentScreening } = schema;

/** Deletes up to `limit` verdicts created before the cutoff, oldest first. */
export async function purgeExpiredScreenings(
  opts: { now?: Date; limit?: number; scope?: { organizationIds: string[] } } = {},
): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.contentScreenings, opts.now);
  const expired = and(
    lt(contentScreening.createdAt, cutoff),
    opts.scope ? inArray(contentScreening.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: contentScreening.id })
    .from(contentScreening)
    .where(expired)
    .orderBy(asc(contentScreening.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(contentScreening)
    .where(and(inArray(contentScreening.id, due), expired))
    .returning({ id: contentScreening.id });
  return deleted.length;
}
