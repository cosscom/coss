/**
 * Deletes email data past its retention (`@coss/retention`; the worker's `retention` loop).
 * System-level: the scans span organizations; `scope` limits them to some (tests).
 */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, eq, inArray, lt, ne, notExists, notInArray, sql } from "drizzle-orm";
import { releaseContacts } from "./contacts.ts";

const {
  contact,
  dmarcNotification,
  dmarcReport,
  dmarcReportRecord,
  dedicatedIpDeliveryRollup,
  email,
  emailBatch,
  emailReputationRollup,
  inboundDropCounter,
  inboundFakeObject,
  receivedEmail,
} = schema;

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

/** Deletes up to `limit` hourly dedicated IP delivery counts past their retention, oldest first. */
export async function purgeExpiredDedicatedIpRollups(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.dedicatedIpRollups, opts.now);
  const expired = and(
    lt(dedicatedIpDeliveryRollup.hour, cutoff),
    opts.scope
      ? inArray(dedicatedIpDeliveryRollup.organizationId, opts.scope.organizationIds)
      : undefined,
  );
  const due = db
    .select({
      organizationId: dedicatedIpDeliveryRollup.organizationId,
      hour: dedicatedIpDeliveryRollup.hour,
      sendingIp: dedicatedIpDeliveryRollup.sendingIp,
    })
    .from(dedicatedIpDeliveryRollup)
    .where(expired)
    .orderBy(asc(dedicatedIpDeliveryRollup.hour))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(dedicatedIpDeliveryRollup)
    .where(
      and(
        sql`(${dedicatedIpDeliveryRollup.organizationId}, ${dedicatedIpDeliveryRollup.hour}, ${dedicatedIpDeliveryRollup.sendingIp}) in ${due}`,
        expired,
      ),
    )
    .returning({ organizationId: dedicatedIpDeliveryRollup.organizationId });
  return deleted.length;
}

/**
 * Deletes up to `limit` received emails created before the cutoff, oldest first (attachment rows
 * cascade). Their content in S3 expires with the bucket's lifecycle rule (`ses:bootstrap`, a day
 * later); the fake store's is purged by `purgeExpiredFakeInboundObjects`.
 */
export async function purgeExpiredReceivedEmails(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.receivedEmails, opts.now);
  const expired = and(
    lt(receivedEmail.createdAt, cutoff),
    opts.scope ? inArray(receivedEmail.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: receivedEmail.id })
    .from(receivedEmail)
    .where(expired)
    .orderBy(asc(receivedEmail.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(receivedEmail)
    .where(and(inArray(receivedEmail.id, due), expired))
    .returning({ id: receivedEmail.id });
  return deleted.length;
}

/**
 * The fake content store's lifecycle rule: objects older than the received email retention plus
 * a day (the same as the S3 bucket's), including any whose row was never written.
 */
export async function purgeExpiredFakeInboundObjects(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.receivedEmails + 1, opts.now);
  const expired = and(
    lt(inboundFakeObject.createdAt, cutoff),
    opts.scope ? inArray(inboundFakeObject.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ key: inboundFakeObject.key })
    .from(inboundFakeObject)
    .where(expired)
    .orderBy(asc(inboundFakeObject.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(inboundFakeObject)
    .where(and(inArray(inboundFakeObject.key, due), expired))
    .returning({ key: inboundFakeObject.key });
  return deleted.length;
}

/** Deletes daily inbound drop counts older than the received email retention. */
export async function purgeExpiredInboundDropCounters(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.receivedEmails, opts.now);
  const expired = and(
    lt(inboundDropCounter.updatedAt, cutoff),
    opts.scope ? inArray(inboundDropCounter.organizationId, opts.scope.organizationIds) : undefined,
  );
  const deleted = await db
    .delete(inboundDropCounter)
    .where(expired)
    .returning({ organizationId: inboundDropCounter.organizationId });
  return deleted.length;
}

/**
 * Deletes expired DMARC reports (created before the cutoff): up to `limit` of their records
 * first, then, once none are left, up to `limit` reports. A report holds up to 10,000 records,
 * so letting the cascade delete them would make one step unbounded. Returns the rows deleted.
 */
export async function purgeExpiredDmarcReports(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.dmarcReports, opts.now);
  const limit = opts.limit ?? 1000;
  const expired = and(
    lt(dmarcReport.createdAt, cutoff),
    opts.scope ? inArray(dmarcReport.organizationId, opts.scope.organizationIds) : undefined,
  );
  const expiredReports = db.select({ id: dmarcReport.id }).from(dmarcReport).where(expired);
  const dueRecords = db
    .select({ id: dmarcReportRecord.id })
    .from(dmarcReportRecord)
    .where(inArray(dmarcReportRecord.dmarcReportId, expiredReports))
    .limit(limit);
  const records = await db
    .delete(dmarcReportRecord)
    .where(inArray(dmarcReportRecord.id, dueRecords))
    .returning({ id: dmarcReportRecord.id });
  if (records.length >= limit) return records.length;
  const due = db
    .select({ id: dmarcReport.id })
    .from(dmarcReport)
    .where(expired)
    .orderBy(asc(dmarcReport.createdAt))
    .limit(limit - records.length);
  const reports = await db
    .delete(dmarcReport)
    .where(and(inArray(dmarcReport.id, due), expired))
    .returning({ id: dmarcReport.id });
  return records.length + reports.length;
}

/** Deletes settled DMARC notifications created before the cutoff, oldest first. */
export async function purgeExpiredDmarcNotifications(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.dmarcNotifications, opts.now);
  const expired = and(
    lt(dmarcNotification.createdAt, cutoff),
    ne(dmarcNotification.status, "pending"),
    opts.scope ? inArray(dmarcNotification.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: dmarcNotification.id })
    .from(dmarcNotification)
    .where(expired)
    .orderBy(asc(dmarcNotification.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(dmarcNotification)
    .where(and(inArray(dmarcNotification.id, due), expired))
    .returning({ id: dmarcNotification.id });
  return deleted.length;
}

/**
 * Deletes contacts still `pending` (double opt-in never confirmed) past the retention, and gives
 * their environments' counters back. Memberships and topic choices cascade.
 */
export async function purgeExpiredPendingContacts(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.pendingContacts, opts.now);
  const expired = and(
    eq(contact.status, "pending"),
    lt(contact.pendingSince, cutoff),
    opts.scope ? inArray(contact.organizationId, opts.scope.organizationIds) : undefined,
  );
  return db.transaction(async (tx) => {
    const due = tx
      .select({ id: contact.id })
      .from(contact)
      .where(expired)
      .orderBy(asc(contact.pendingSince))
      .limit(opts.limit ?? 1000);
    const deleted = await tx
      .delete(contact)
      .where(and(inArray(contact.id, due), expired))
      .returning({
        organizationId: contact.organizationId,
        environmentId: contact.environmentId,
      });
    const perEnvironment = new Map<string, { organizationId: string; count: number }>();
    for (const row of deleted) {
      const entry = perEnvironment.get(row.environmentId) ?? {
        organizationId: row.organizationId,
        count: 0,
      };
      entry.count++;
      perEnvironment.set(row.environmentId, entry);
    }
    for (const [environmentId, { organizationId, count }] of perEnvironment) {
      await releaseContacts(tx, { organizationId, environmentId }, count);
    }
    return deleted.length;
  });
}
