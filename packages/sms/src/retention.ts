/** Retention purges of SMS data (the worker's `retention` loop; periods in `@coss/retention`). */
import { db, schema } from "@coss/db";
import { RETENTION_DAYS, retentionCutoff } from "@coss/retention";
import { and, asc, inArray, lt, notInArray, sql } from "drizzle-orm";

const { smsInboundReceipt, smsMessage, smsReceived } = schema;

type PurgeOptions = { now?: Date; limit?: number; scope?: { organizationIds: string[] } };

/** Deletes the oldest expired messages (never queued or scheduled ones); events cascade. */
export async function purgeExpiredSmsMessages(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.smsMessages, opts.now);
  const expired = and(
    lt(smsMessage.createdAt, cutoff),
    notInArray(smsMessage.status, ["queued", "scheduled"]),
    opts.scope ? inArray(smsMessage.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: smsMessage.id })
    .from(smsMessage)
    .where(expired)
    .orderBy(asc(smsMessage.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(smsMessage)
    .where(and(inArray(smsMessage.id, due), expired))
    .returning({ id: smsMessage.id });
  return deleted.length;
}

/** Deletes the oldest expired received messages, then as many expired inbound receipts. */
export async function purgeExpiredReceivedSms(opts: PurgeOptions = {}): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.receivedSms, opts.now);
  const expired = and(
    lt(smsReceived.createdAt, cutoff),
    opts.scope ? inArray(smsReceived.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({ id: smsReceived.id })
    .from(smsReceived)
    .where(expired)
    .orderBy(asc(smsReceived.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(smsReceived)
    .where(and(inArray(smsReceived.id, due), expired))
    .returning({ id: smsReceived.id });
  return deleted.length + (await purgeExpiredInboundReceipts(cutoff, opts));
}

async function purgeExpiredInboundReceipts(cutoff: Date, opts: PurgeOptions): Promise<number> {
  const expired = and(
    lt(smsInboundReceipt.createdAt, cutoff),
    opts.scope ? inArray(smsInboundReceipt.organizationId, opts.scope.organizationIds) : undefined,
  );
  const due = db
    .select({
      provider: smsInboundReceipt.provider,
      providerMessageId: smsInboundReceipt.providerMessageId,
    })
    .from(smsInboundReceipt)
    .where(expired)
    .orderBy(asc(smsInboundReceipt.createdAt))
    .limit(opts.limit ?? 1000);
  const deleted = await db
    .delete(smsInboundReceipt)
    .where(
      and(
        sql`(${smsInboundReceipt.provider}, ${smsInboundReceipt.providerMessageId}) in (${due})`,
        expired,
      ),
    )
    .returning({ provider: smsInboundReceipt.provider });
  return deleted.length;
}
