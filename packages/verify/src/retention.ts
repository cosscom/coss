/**
 * Verify's purge: verifications (the phone number or address, what happened, their sends) after
 * `RETENTION_DAYS.verifications`. System-level, like every purge: `{ now, limit, scope }`, the
 * oldest batch, the condition re-checked in the delete; sends cascade.
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, lt, sql } from "drizzle-orm";

const { verifyRequest } = schema;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

export async function purgeExpiredVerifications(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.verifications, opts.now ?? new Date());
  const ids = db
    .select({ id: verifyRequest.id })
    .from(verifyRequest)
    .where(
      and(
        lt(verifyRequest.createdAt, cutoff),
        opts.scope
          ? sql`${verifyRequest.organizationId} = any(${sql.param(opts.scope.organizationIds)}::text[])`
          : undefined,
      ),
    )
    .orderBy(asc(verifyRequest.createdAt))
    .limit(opts.limit ?? 1000);
  const rows = await db
    .delete(verifyRequest)
    .where(and(sql`${verifyRequest.id} in ${ids}`, lt(verifyRequest.createdAt, cutoff)))
    .returning({ id: verifyRequest.id });
  return rows.length;
}
