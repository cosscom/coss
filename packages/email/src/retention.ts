/**
 * Deletes email data past its retention (`@coss/retention`; the worker's `retention` loop).
 * System-level: the scans span organizations; `scope` limits them to some (tests).
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, inArray, lt, notExists, notInArray, sql } from "drizzle-orm";

const { email, emailBatch, emailReputationRollup } = schema;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

/**
 * Deletes up to `limit` emails created before the cutoff, oldest first; their recipients, events,
 * links and attachments go with them (cascade). Queued and scheduled emails are kept until they
 * leave those statuses (a scheduled send of a suspended organization may wait past the cutoff).
 * Suppressions naming a deleted email keep its id. Returns the number of emails deleted.
 */
export async function purgeExpiredEmails(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.emails, opts.now);
  const expired = and(
    lt(email.createdAt, cutoff),
    notInArray(email.status, ["queued", "scheduled"]),
    opts.scope ? inArray(email.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: email.id })
    .from(email)
    .where(expired)
    .orderBy(asc(email.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(email)
    .where(and(inArray(email.id, due), expired))
    .returning({ id: email.id });
  return deleted.length;
}

/**
 * Deletes batches older than the email cutoff that have no emails left (their emails reference
 * them, so a batch goes once `purgeExpiredEmails` has taken the last one).
 */
export async function purgeEmptyEmailBatches(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.emails, opts.now);
  const empty = and(
    lt(emailBatch.createdAt, cutoff),
    notExists(
      db
        .select({ one: sql`1` })
        .from(email)
        .where(
          and(
            sql`${email.batchId} = ${emailBatch.id}`,
            sql`${email.organizationId} = ${emailBatch.organizationId}`,
          ),
        ),
    ),
    opts.scope ? inArray(emailBatch.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: emailBatch.id })
    .from(emailBatch)
    .where(empty)
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(emailBatch)
    .where(and(inArray(emailBatch.id, due), empty))
    .returning({ id: emailBatch.id });
  return deleted.length;
}

/**
 * Deletes reputation rollups past the longest window. Evaluations also drop their own
 * organization's old hours; this covers organizations that are no longer evaluated.
 */
export async function purgeExpiredReputationRollups(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.reputationRollups, opts.now);
  const expired = and(
    lt(emailReputationRollup.bucketStart, cutoff),
    opts.scope
      ? inArray(emailReputationRollup.organizationId, opts.scope.organizationIds)
      : undefined,
  );
  const due = db
    .select({
      organizationId: emailReputationRollup.organizationId,
      bucketStart: emailReputationRollup.bucketStart,
    })
    .from(emailReputationRollup)
    .where(expired)
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(emailReputationRollup)
    .where(
      and(
        sql`(${emailReputationRollup.organizationId}, ${emailReputationRollup.bucketStart}) in ${due}`,
        expired,
      ),
    )
    .returning({ organizationId: emailReputationRollup.organizationId });
  return deleted.length;
}
