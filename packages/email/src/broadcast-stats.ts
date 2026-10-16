/**
 * A broadcast's counters, kept in `broadcast_stat` shards (by email) so delivery events, opens and
 * clicks of many emails never queue on one row. Counted in the transaction that changed what they
 * count, and only when it changed (an event recorded, a first open, an unsubscribe that did
 * something). Reads sum the shards.
 */
import { db, type Executor, schema } from "@coss/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { BroadcastStatsOutput } from "./broadcast-schemas.ts";
import type { EmailRecipientStatus } from "./schemas.ts";

const { broadcastStat, email, emailRecipient } = schema;

export const BROADCAST_STAT_SHARDS = 16;

export type BroadcastStatField = keyof BroadcastStatsOutput;

const COLUMNS: Record<BroadcastStatField, AnyPgColumn> = {
  recipients: broadcastStat.recipients,
  sent: broadcastStat.sent,
  delivered: broadcastStat.delivered,
  bounced: broadcastStat.bounced,
  complained: broadcastStat.complained,
  failed: broadcastStat.failed,
  opened: broadcastStat.opened,
  clicked: broadcastStat.clicked,
  unsubscribed: broadcastStat.unsubscribed,
};

/** FNV-1a over the email id: a stable shard for each email. */
export function shardOf(emailId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < emailId.length; index++) {
    hash ^= emailId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % BROADCAST_STAT_SHARDS;
}

/** Adds `by` to one counter of the broadcast (in the email's shard), in `tx`. */
export async function bumpBroadcastStat(
  tx: Executor,
  input: {
    broadcastId: string;
    organizationId: string;
    emailId: string;
    field: BroadcastStatField;
    by?: number;
  },
): Promise<void> {
  await bumpBroadcastStats(tx, {
    broadcastId: input.broadcastId,
    organizationId: input.organizationId,
    counts: new Map([[shardOf(input.emailId), input.by ?? 1]]),
    field: input.field,
  });
}

/** Adds per-shard counts to one counter, in `tx` (negative counts subtract, never below 0). */
export async function bumpBroadcastStats(
  tx: Executor,
  input: {
    broadcastId: string;
    organizationId: string;
    field: BroadcastStatField;
    counts: ReadonlyMap<number, number>;
  },
): Promise<void> {
  const column = COLUMNS[input.field];
  for (const [shard, by] of input.counts) {
    if (by === 0) continue;
    await tx
      .insert(broadcastStat)
      .values({
        broadcastId: input.broadcastId,
        shard,
        organizationId: input.organizationId,
        [input.field]: Math.max(by, 0),
      })
      .onConflictDoUpdate({
        target: [broadcastStat.broadcastId, broadcastStat.shard],
        set: { [input.field]: sql`greatest(${column} + ${by}, 0)` },
      });
  }
}

/**
 * The counters a recipient in each status counts toward: what was accepted is `sent` for good
 * (a later bounce or complaint included), a complaint implies a delivery. A recipient's move adds
 * its new status's counters and takes its old one's away, so the shards always equal a recount.
 */
const RECIPIENT_COUNTERS: Record<EmailRecipientStatus, readonly BroadcastStatField[]> = {
  queued: [],
  sent: ["sent"],
  delivery_delayed: ["sent"],
  delivered: ["sent", "delivered"],
  bounced: ["sent", "bounced"],
  complained: ["sent", "delivered", "complained"],
  failed: ["failed"],
  suppressed: [],
  canceled: [],
};

/** Counter changes of recipients that moved from one status to another. */
export function recipientMoveCounts(
  moves: readonly { from: EmailRecipientStatus; to: EmailRecipientStatus }[],
): Map<BroadcastStatField, number> {
  const counts = new Map<BroadcastStatField, number>();
  const add = (field: BroadcastStatField, by: number) =>
    counts.set(field, (counts.get(field) ?? 0) + by);
  for (const move of moves) {
    for (const field of RECIPIENT_COUNTERS[move.from]) add(field, -1);
    for (const field of RECIPIENT_COUNTERS[move.to]) add(field, 1);
  }
  return counts;
}

/** Applies recipient moves of one broadcast email to its shard, in `tx`. */
export async function bumpRecipientMoves(
  tx: Executor,
  input: {
    broadcastId: string;
    organizationId: string;
    emailId: string;
    moves: readonly { from: EmailRecipientStatus; to: EmailRecipientStatus }[];
  },
): Promise<void> {
  for (const [field, by] of recipientMoveCounts(input.moves)) {
    if (by === 0) continue;
    await bumpBroadcastStat(tx, { ...input, field, by });
  }
}

/** Per-shard counts of `emailIds` (to bump a counter for many emails at once). */
export function shardCounts(emailIds: readonly string[], sign = 1): Map<number, number> {
  const counts = new Map<number, number>();
  for (const id of emailIds) counts.set(shardOf(id), (counts.get(shardOf(id)) ?? 0) + sign);
  return counts;
}

const ZERO: BroadcastStatsOutput = {
  recipients: 0,
  sent: 0,
  delivered: 0,
  bounced: 0,
  complained: 0,
  failed: 0,
  opened: 0,
  clicked: 0,
  unsubscribed: 0,
};

/** The broadcasts' counters (summed shards), by broadcast id. */
export async function broadcastStats(
  organizationId: string,
  broadcastIds: readonly string[],
  executor: Executor = db,
): Promise<Map<string, BroadcastStatsOutput>> {
  const result = new Map<string, BroadcastStatsOutput>();
  for (const id of broadcastIds) result.set(id, { ...ZERO });
  if (broadcastIds.length === 0) return result;
  const rows = await executor
    .select({
      broadcastId: broadcastStat.broadcastId,
      recipients: sql<number>`sum(${broadcastStat.recipients})::int`,
      sent: sql<number>`sum(${broadcastStat.sent})::int`,
      delivered: sql<number>`sum(${broadcastStat.delivered})::int`,
      bounced: sql<number>`sum(${broadcastStat.bounced})::int`,
      complained: sql<number>`sum(${broadcastStat.complained})::int`,
      failed: sql<number>`sum(${broadcastStat.failed})::int`,
      opened: sql<number>`sum(${broadcastStat.opened})::int`,
      clicked: sql<number>`sum(${broadcastStat.clicked})::int`,
      unsubscribed: sql<number>`sum(${broadcastStat.unsubscribed})::int`,
    })
    .from(broadcastStat)
    .where(
      and(
        eq(broadcastStat.organizationId, organizationId),
        inArray(broadcastStat.broadcastId, [...broadcastIds]),
      ),
    )
    .groupBy(broadcastStat.broadcastId);
  for (const { broadcastId, ...counts } of rows) result.set(broadcastId, counts);
  return result;
}

/** The broadcast of an email (`null` for any other email), for event hooks. */
export async function broadcastOfEmail(
  tx: Executor,
  emailId: string,
): Promise<{ broadcastId: string; organizationId: string } | null> {
  const [row] = await tx
    .select({ broadcastId: email.broadcastId, organizationId: email.organizationId })
    .from(email)
    .where(eq(email.id, emailId))
    .limit(1);
  return row?.broadcastId
    ? { broadcastId: row.broadcastId, organizationId: row.organizationId }
    : null;
}

/**
 * Recounts a broadcast's counters from its emails (repair, and tests): what the shards should say
 * while its emails are kept (they are purged after the email retention; the shards stay).
 */
export async function recountBroadcastStats(
  organizationId: string,
  broadcastId: string,
): Promise<Omit<BroadcastStatsOutput, "unsubscribed">> {
  const statuses = await db
    .select({ status: emailRecipient.status, count: sql<number>`count(*)::int` })
    .from(emailRecipient)
    .innerJoin(
      email,
      and(
        eq(email.id, emailRecipient.emailId),
        eq(email.organizationId, emailRecipient.organizationId),
      ),
    )
    .where(and(eq(email.organizationId, organizationId), eq(email.broadcastId, broadcastId)))
    .groupBy(emailRecipient.status);
  const [engagement] = await db
    .select({
      recipients: sql<number>`count(*)::int`,
      opened: sql<number>`count(*) filter (where ${email.firstOpenedAt} is not null)::int`,
      clicked: sql<number>`count(*) filter (where ${email.firstClickedAt} is not null)::int`,
    })
    .from(email)
    .where(and(eq(email.organizationId, organizationId), eq(email.broadcastId, broadcastId)));
  const moved = new Map<BroadcastStatField, number>();
  for (const { status, count } of statuses) {
    for (const field of RECIPIENT_COUNTERS[status])
      moved.set(field, (moved.get(field) ?? 0) + count);
  }
  return {
    recipients: engagement?.recipients ?? 0,
    sent: moved.get("sent") ?? 0,
    delivered: moved.get("delivered") ?? 0,
    bounced: moved.get("bounced") ?? 0,
    complained: moved.get("complained") ?? 0,
    failed: moved.get("failed") ?? 0,
    opened: engagement?.opened ?? 0,
    clicked: engagement?.clicked ?? 0,
  };
}
