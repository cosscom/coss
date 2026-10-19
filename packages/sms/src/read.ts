/** Reads of sent messages and their events (the API, the dashboard, the MCP server through the API). */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, desc, eq, gte, inArray, lt, type SQL, sql } from "drizzle-orm";
import { SmsError } from "./errors.ts";
import {
  DEFAULT_SMS_LIST_LIMIT,
  MAX_SMS_LIST_LIMIT,
  type SmsEventOutput,
  type SmsObjectOutput,
  type SmsStatus,
} from "./schemas.ts";

const { environment, smsEvent, smsMessage } = schema;

export type SmsRow = typeof smsMessage.$inferSelect;

/** Failure codes coss.com stores that only make sense while the message is `failed`/`undelivered`. */
const FAILED_STATUSES: readonly SmsStatus[] = ["failed", "undelivered"];

export function toSmsObject(row: SmsRow, sandbox: boolean): SmsObjectOutput {
  return {
    object: "sms",
    id: row.id,
    from: row.from,
    to: row.to,
    body: row.body,
    status: row.status,
    segments: row.segments,
    encoding: row.encoding === "ucs2" ? "ucs2" : "gsm7",
    country: row.toCountry,
    tags: row.tags,
    // An error code on a queued message is a screening hold, not a failure.
    failure:
      FAILED_STATUSES.includes(row.status) && row.errorCode
        ? { code: row.errorCode, message: row.errorMessage ?? "" }
        : null,
    sandbox,
    scheduled_at: row.scheduledAt?.toISOString() ?? null,
    sent_at: row.sentAt?.toISOString() ?? null,
    delivered_at: row.deliveredAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

/** Messages of one organization with their environment's mode, newest first. */
export async function selectSmsWithMode(
  organizationId: string,
  where: SQL | undefined,
  limit: number,
): Promise<{ sms: SmsRow; sandbox: boolean }[]> {
  const rows = await db
    .select({ sms: smsMessage, mode: environment.mode })
    .from(smsMessage)
    .innerJoin(
      environment,
      and(
        eq(environment.id, smsMessage.environmentId),
        eq(environment.organizationId, smsMessage.organizationId),
      ),
    )
    .where(and(eq(smsMessage.organizationId, organizationId), where))
    .orderBy(desc(smsMessage.createdAt), desc(smsMessage.id))
    .limit(limit);
  return rows.map((row) => ({ sms: row.sms, sandbox: row.mode === "sandbox" }));
}

export type SmsListFilters = {
  to?: string;
  status?: SmsStatus[];
  createdAfter?: Date;
  createdBefore?: Date;
  /** Keyset cursor: messages older than this one (the `id` of the previous page's last). */
  after?: string;
};

/** One page of an environment's messages, newest first. */
export async function listSmsPage(
  input: { organizationId: string; environmentId: string; limit?: number } & SmsListFilters,
): Promise<{ data: SmsObjectOutput[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_SMS_LIST_LIMIT, MAX_SMS_LIST_LIMIT);
  const conditions: SQL[] = [eq(smsMessage.environmentId, input.environmentId)];
  if (input.to) conditions.push(eq(smsMessage.to, input.to));
  if (input.status?.length) conditions.push(inArray(smsMessage.status, input.status));
  if (input.createdAfter) conditions.push(gte(smsMessage.createdAt, input.createdAfter));
  if (input.createdBefore) conditions.push(lt(smsMessage.createdAt, input.createdBefore));
  if (input.after !== undefined) {
    // Keyset on the list's order; a cursor from another environment (or none) matches nothing.
    conditions.push(
      sql`(${smsMessage.createdAt}, ${smsMessage.id}) < (
        select c.created_at, c.id from ${smsMessage} c
        where c.id = ${input.after}
          and c.organization_id = ${input.organizationId}
          and c.environment_id = ${input.environmentId}
      )`,
    );
  }
  // One row more than the page tells whether another page follows.
  const rows = await selectSmsWithMode(input.organizationId, and(...conditions), limit + 1);
  return {
    data: rows.slice(0, limit).map((row) => toSmsObject(row.sms, row.sandbox)),
    hasMore: rows.length > limit,
  };
}

/** A message of the environment; malformed ids and other environments' messages are "not found". */
export async function environmentSms(input: {
  organizationId: string;
  environmentId: string;
  smsId: string;
}): Promise<{ sms: SmsRow; sandbox: boolean }> {
  const [found] = isId("sms", input.smsId)
    ? await selectSmsWithMode(
        input.organizationId,
        and(eq(smsMessage.environmentId, input.environmentId), eq(smsMessage.id, input.smsId)),
        1,
      )
    : [];
  if (!found) throw new SmsError("not_found", "SMS not found.");
  return found;
}

export async function getSms(input: {
  organizationId: string;
  environmentId: string;
  smsId: string;
}): Promise<SmsObjectOutput> {
  const found = await environmentSms(input);
  return toSmsObject(found.sms, found.sandbox);
}

/** The message as it is now (after a dispatch or a cancel changed it). */
export async function currentSms(row: {
  id: string;
  organizationId: string;
}): Promise<SmsObjectOutput> {
  const [found] = await selectSmsWithMode(row.organizationId, eq(smsMessage.id, row.id), 1);
  if (!found) throw new SmsError("not_found", "SMS not found.");
  return toSmsObject(found.sms, found.sandbox);
}

/** A message's events, oldest first (a message has a handful). */
export async function listSmsEvents(input: {
  organizationId: string;
  environmentId: string;
  smsId: string;
}): Promise<SmsEventOutput[]> {
  const { sms } = await environmentSms(input);
  const rows = await db
    .select()
    .from(smsEvent)
    .where(and(eq(smsEvent.organizationId, sms.organizationId), eq(smsEvent.messageId, sms.id)))
    .orderBy(asc(smsEvent.occurredAt), asc(smsEvent.id));
  return rows.map((row) => ({
    object: "sms_event",
    id: row.id,
    sms_id: row.messageId,
    type: row.type,
    occurred_at: row.occurredAt.toISOString(),
    data: row.details,
  }));
}
