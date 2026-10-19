/**
 * Receiving: messages sent to the organization's numbers (`sms_received`, ids `smsin_`).
 * System-level: the organization is the receiving number's, resolved from the provider's `To`.
 * Opt-out keywords (STOP, START) change the suppression lists of every live environment whatever
 * happens to the message; the message itself goes to the number's receiving environment, or is
 * dropped when it has none.
 */
import { dimensionKey } from "@coss/billing/catalog";
import { recordUsage } from "@coss/billing/metering";
import { db, type Executor, schema } from "@coss/db";
import { ID_PREFIXES, isId, newId } from "@coss/db/id";
import { appendLogEntries, type LogEntryInput } from "@coss/logs";
import { markReputationDue } from "@coss/reputation";
import { enqueueWebhookMessage } from "@coss/webhooks";
import { and, desc, eq, gte, lt, type SQL, sql } from "drizzle-orm";
import { SmsError } from "./errors.ts";
import { isTollFreeNumber } from "./phone.ts";
import {
  DEFAULT_SMS_LIST_LIMIT,
  MAX_SMS_LIST_LIMIT,
  type ReceivedSmsEventType,
  type ReceivedSmsObjectOutput,
  type SmsKeyword,
  type StoredReceivedSmsWebhookEvent,
  smsKeyword,
} from "./schemas.ts";
import { countSegments } from "./segments.ts";
import { optInEverywhere, optOutEverywhere, type SmsSuppressionRow } from "./suppressions.ts";

const { environment, smsInboundReceipt, smsNumber, smsReceived } = schema;

export type ReceivedSmsRow = typeof smsReceived.$inferSelect;

export function toReceivedSmsObject(
  row: ReceivedSmsRow,
  sandbox: boolean,
): ReceivedSmsObjectOutput {
  return {
    object: "received_sms",
    id: row.id,
    from: row.from,
    to: row.to,
    body: row.body,
    segments: row.segments,
    keyword: (row.keyword as SmsKeyword | null) ?? null,
    sandbox,
    created_at: row.createdAt.toISOString(),
  };
}

type Target = {
  organizationId: string;
  projectId: string;
  environmentId: string;
  sandbox: boolean;
};

/** Queues a received-message webhook for one environment and logs it. */
async function announce(
  tx: Executor,
  target: Target,
  input: {
    type: ReceivedSmsEventType;
    receivedId: string | null;
    from: string;
    to: string;
    keyword: SmsKeyword | null;
    occurredAt: Date;
  },
): Promise<void> {
  const id = newId(ID_PREFIXES.webhookEvent);
  const createdAt = new Date();
  const payload: StoredReceivedSmsWebhookEvent = {
    id,
    object: "event",
    type: input.type,
    created_at: createdAt.toISOString(),
    data: {
      received_sms_id: input.receivedId,
      from: input.from,
      to: input.to,
      keyword: input.keyword,
      sandbox: target.sandbox,
      occurred_at: input.occurredAt.toISOString(),
    },
  };
  await enqueueWebhookMessage(tx, {
    id,
    organizationId: target.organizationId,
    environmentId: target.environmentId,
    type: input.type,
    payload,
  });
  const entry: LogEntryInput = {
    organizationId: target.organizationId,
    projectId: target.projectId,
    environmentId: target.environmentId,
    occurredAt: input.occurredAt,
    source: "sms",
    level: input.type === "sms.opted_out" ? "warning" : "info",
    type: input.type,
    message:
      input.type === "sms.opted_out"
        ? `${input.from} opted out (replied STOP to ${input.to})`
        : input.type === "sms.opted_in"
          ? `${input.from} opted in again (replied START to ${input.to})`
          : `Received from ${input.from} on ${input.to}`,
    resourceType: "received_sms",
    resourceId: input.receivedId,
    recipient: input.from,
    attributes: { event_id: id, from: input.from, to: input.to, keyword: input.keyword },
  };
  await appendLogEntries(tx, [entry]);
}

/** Stores a received message in `target` (once per provider message), with its webhook and log. */
export async function storeReceivedSms(
  tx: Executor,
  target: Target,
  input: {
    numberId: string | null;
    from: string;
    to: string;
    body: string;
    country: string;
    provider: string;
    providerMessageId: string;
    occurredAt: Date;
    /** The provider's own count (what it bills), else counted here. */
    segments?: number;
  },
): Promise<ReceivedSmsRow | null> {
  const keyword = smsKeyword(input.body);
  const [row] = await tx
    .insert(smsReceived)
    .values({
      organizationId: target.organizationId,
      projectId: target.projectId,
      environmentId: target.environmentId,
      numberId: input.numberId,
      from: input.from,
      to: input.to,
      body: input.body,
      segments:
        input.segments ??
        countSegments(input.body, { tollFree: isTollFreeNumber(input.to) }).segments,
      country: input.country,
      keyword,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
    })
    .onConflictDoNothing({ target: [smsReceived.provider, smsReceived.providerMessageId] })
    .returning();
  if (!row) return null;
  await announce(tx, target, {
    type: "sms.received",
    receivedId: row.id,
    from: row.from,
    to: row.to,
    keyword,
    occurredAt: input.occurredAt,
  });
  if (!target.sandbox) {
    // Billed as coss.com is: per segment, by the receiving number's country.
    await tx
      .update(smsReceived)
      .set({ usageRecordedAt: sql`transaction_timestamp()` })
      .where(and(eq(smsReceived.id, row.id), eq(smsReceived.organizationId, row.organizationId)));
    await recordUsage(tx, {
      organizationId: target.organizationId,
      environmentId: target.environmentId,
      meter: "sms.received_segments",
      quantity: row.segments,
      dimension: dimensionKey({ country: row.country }),
    });
  }
  return row;
}

export type InboundSms = {
  provider: string;
  providerMessageId: string;
  from: string;
  to: string;
  body: string;
  occurredAt: Date;
  /** How many segments the provider received (Twilio's `NumSegments`): what it bills. */
  segments?: number;
};

export type ReceiveSmsResult =
  | { status: "stored"; id: string }
  | { status: "duplicate" }
  | { status: "unrouted" }
  | { status: "unknown_number" };

/** Every live environment's target, for opt-out announcements. */
async function liveTargets(
  tx: Executor,
  organizationId: string,
  entries: readonly SmsSuppressionRow[],
): Promise<Target[]> {
  if (entries.length === 0) return [];
  const rows = await tx
    .select({ id: environment.id, projectId: environment.projectId })
    .from(environment)
    .where(and(eq(environment.organizationId, organizationId), eq(environment.mode, "live")));
  const changed = new Set(entries.map((entry) => entry.environmentId));
  return rows
    .filter((row) => changed.has(row.id))
    .map((row) => ({
      organizationId,
      projectId: row.projectId,
      environmentId: row.id,
      sandbox: false,
    }));
}

/**
 * A message to one of coss.com's numbers (the provider's inbound callback). In one transaction:
 * the message in the number's receiving environment (a retried callback stores nothing twice),
 * then STOP/START applied to every live environment's suppression list, each with its event.
 */
export async function receiveSms(input: InboundSms): Promise<ReceiveSmsResult> {
  const [number] = await db
    .select()
    .from(smsNumber)
    .where(and(eq(smsNumber.phoneNumber, input.to), eq(smsNumber.provider, input.provider)))
    .limit(1);
  if (!number) return { status: "unknown_number" };
  const organizationId = number.organizationId;
  return db.transaction(async (tx): Promise<ReceiveSmsResult> => {
    // A retried callback: stored (when routed) and its keyword applied the first time.
    const [receipt] = await tx
      .insert(smsInboundReceipt)
      .values({
        provider: input.provider,
        providerMessageId: input.providerMessageId,
        organizationId,
        fromNumber: input.from,
        keyword: smsKeyword(input.body),
      })
      .onConflictDoNothing()
      .returning({ provider: smsInboundReceipt.provider });
    if (!receipt) return { status: "duplicate" };
    const [receiving] = number.receivingEnvironmentId
      ? await tx
          .select({ id: environment.id, projectId: environment.projectId })
          .from(environment)
          .where(
            and(
              eq(environment.id, number.receivingEnvironmentId),
              eq(environment.organizationId, organizationId),
              eq(environment.mode, "live"),
            ),
          )
          .limit(1)
      : [];
    let result: ReceiveSmsResult = { status: "unrouted" };
    if (receiving) {
      const row = await storeReceivedSms(
        tx,
        {
          organizationId,
          projectId: receiving.projectId,
          environmentId: receiving.id,
          sandbox: false,
        },
        {
          numberId: number.id,
          from: input.from,
          to: input.to,
          body: input.body,
          country: number.country,
          provider: input.provider,
          providerMessageId: input.providerMessageId,
          occurredAt: input.occurredAt,
          segments: input.segments,
        },
      );
      // A retried callback: the keyword was applied the first time.
      if (!row) return { status: "duplicate" };
      result = { status: "stored", id: row.id };
    }
    const keyword = smsKeyword(input.body);
    if (keyword === "stop" || keyword === "start") {
      const entries =
        keyword === "stop"
          ? await optOutEverywhere(tx, { organizationId, phoneNumber: input.from })
          : await optInEverywhere(tx, { organizationId, phoneNumber: input.from });
      for (const target of await liveTargets(tx, organizationId, entries)) {
        await announce(tx, target, {
          type: keyword === "stop" ? "sms.opted_out" : "sms.opted_in",
          receivedId: result.status === "stored" ? result.id : null,
          from: input.from,
          to: input.to,
          keyword,
          occurredAt: input.occurredAt,
        });
      }
      if (keyword === "stop" && entries.length > 0) await markReputationDue(tx, organizationId);
    }
    return result;
  });
}

async function selectReceived(organizationId: string, where: SQL | undefined, limit: number) {
  const rows = await db
    .select({ received: smsReceived, mode: environment.mode })
    .from(smsReceived)
    .innerJoin(
      environment,
      and(
        eq(environment.id, smsReceived.environmentId),
        eq(environment.organizationId, smsReceived.organizationId),
      ),
    )
    .where(and(eq(smsReceived.organizationId, organizationId), where))
    .orderBy(desc(smsReceived.createdAt), desc(smsReceived.id))
    .limit(limit);
  return rows.map((row) => toReceivedSmsObject(row.received, row.mode === "sandbox"));
}

export async function listReceivedSms(input: {
  organizationId: string;
  environmentId: string;
  from?: string;
  to?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  after?: string;
}): Promise<{ data: ReceivedSmsObjectOutput[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_SMS_LIST_LIMIT, MAX_SMS_LIST_LIMIT);
  const conditions: SQL[] = [eq(smsReceived.environmentId, input.environmentId)];
  if (input.from) conditions.push(eq(smsReceived.from, input.from));
  if (input.to) conditions.push(eq(smsReceived.to, input.to));
  if (input.createdAfter) conditions.push(gte(smsReceived.createdAt, input.createdAfter));
  if (input.createdBefore) conditions.push(lt(smsReceived.createdAt, input.createdBefore));
  if (input.after !== undefined) {
    conditions.push(
      sql`(${smsReceived.createdAt}, ${smsReceived.id}) < (
        select c.created_at, c.id from ${smsReceived} c
        where c.id = ${input.after}
          and c.organization_id = ${input.organizationId}
          and c.environment_id = ${input.environmentId}
      )`,
    );
  }
  const rows = await selectReceived(input.organizationId, and(...conditions), limit + 1);
  return { data: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function getReceivedSms(input: {
  organizationId: string;
  environmentId: string;
  id: string;
}): Promise<ReceivedSmsObjectOutput> {
  const [found] = isId("smsin", input.id)
    ? await selectReceived(
        input.organizationId,
        and(eq(smsReceived.environmentId, input.environmentId), eq(smsReceived.id, input.id)),
        1,
      )
    : [];
  if (!found) throw new SmsError("not_found", "Received SMS not found.");
  return found;
}
