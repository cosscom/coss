/**
 * Metering of codes sent from coss.com's shared numbers. Those messages are coss.com's own (its
 * environment, its `sms.segments`); the organization that asked for the code pays `verify.sms`,
 * by country, once the SMS reached a carrier — exactly when SMS bills its own messages. A message
 * that failed (or is gone) is free. System-level (the worker's `verify-usage` loop): reads
 * coss.com's messages and writes each organization's usage, scoped by the send's organization.
 */

import { dimensionKey } from "@coss/billing/catalog";
import { recordUsage } from "@coss/billing/metering";
import { db, schema } from "@coss/db";
import { and, asc, eq, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";

const { environment, smsMessage, verifyRequest, verifySend } = schema;

const DONE_STATUSES = ["failed", "canceled"] as const;

/** A send claimed this long ago without a message never went out (the channel refused it). */
const UNSENT_AFTER_MS = 15 * 60_000;
/** Sends still without a message id this long after their claim are looked up by key. */
const LINK_AFTER_MS = 60_000;

export type VerifyUsageOptions = {
  now?: Date;
  limit?: number;
  scope?: { organizationIds: string[] };
};

/** Bills shared-number sends whose SMS reached a carrier; settles failed ones unbilled. */
export async function recordDueVerifySmsUsage(opts: VerifyUsageOptions = {}): Promise<number> {
  const now = opts.now ?? new Date();
  // A send whose message id wasn't saved (the process stopped right after sending) is found by the
  // channel's idempotency key, in the environment it was sent in.
  await db.execute(sql`
    update ${verifySend} s set sms_id = m.id
    from ${smsMessage} m
    where s.sms_id is null
      and s.route = 'shared_number'
      and s.usage_recorded_at is null
      and s.created_at < ${new Date(now.getTime() - LINK_AFTER_MS).toISOString()}::timestamptz
      and m.environment_id = s.message_environment_id
      and m.idempotency_key = s.request_id || ':send:' || s.sequence
      ${opts.scope ? sql`and s.organization_id = any(${sql.param(opts.scope.organizationIds)}::text[])` : sql``}
  `);
  const candidates = await db
    .select({
      send: verifySend,
      request: {
        organizationId: verifyRequest.organizationId,
        projectId: verifyRequest.projectId,
        environmentId: verifyRequest.environmentId,
      },
      mode: environment.mode,
      sms: {
        status: smsMessage.status,
        segments: smsMessage.segments,
        usageRecordedAt: smsMessage.usageRecordedAt,
      },
    })
    .from(verifySend)
    .innerJoin(
      verifyRequest,
      and(
        eq(verifyRequest.id, verifySend.requestId),
        eq(verifyRequest.organizationId, verifySend.organizationId),
      ),
    )
    .innerJoin(
      environment,
      and(
        eq(environment.id, verifyRequest.environmentId),
        eq(environment.organizationId, verifyRequest.organizationId),
      ),
    )
    // coss.com's message (another organization's): by id only.
    .leftJoin(smsMessage, eq(smsMessage.id, verifySend.smsId))
    .where(
      and(
        eq(verifySend.route, "shared_number"),
        isNull(verifySend.usageRecordedAt),
        lt(verifySend.createdAt, now),
        opts.scope ? inArray(verifySend.organizationId, opts.scope.organizationIds) : undefined,
        // Only sends that can settle now, so ones still waiting for a carrier never fill the batch.
        or(
          ne(environment.mode, "live"),
          isNotNull(smsMessage.usageRecordedAt),
          // A send interrupted at the provider can still be repaired by a late carrier callback
          // (and billed then): it waits, until its message is purged.
          and(
            inArray(smsMessage.status, [...DONE_STATUSES]),
            or(isNull(smsMessage.errorCode), ne(smsMessage.errorCode, "dispatch_interrupted")),
          ),
          and(isNotNull(verifySend.smsId), isNull(smsMessage.id)),
          // Never sent: only once a retry can't send it any more (the verification ended or
          // expired), or it would go out after being settled unbilled.
          and(
            isNull(verifySend.smsId),
            lt(verifySend.createdAt, new Date(now.getTime() - UNSENT_AFTER_MS)),
            or(ne(verifyRequest.status, "pending"), lt(verifyRequest.expiresAt, now)),
          ),
        ),
      ),
    )
    .orderBy(asc(verifySend.createdAt))
    .limit(opts.limit ?? 500);

  let settled = 0;
  for (const candidate of candidates) {
    const { send, sms } = candidate;
    const reached = sms?.usageRecordedAt !== null && sms?.usageRecordedAt !== undefined;
    await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(verifySend)
        .set({ usageRecordedAt: now })
        .where(
          and(
            eq(verifySend.id, send.id),
            eq(verifySend.organizationId, send.organizationId),
            isNull(verifySend.usageRecordedAt),
          ),
        )
        .returning({ id: verifySend.id });
      if (!claimed || !reached || candidate.mode !== "live" || !sms) return;
      await recordUsage(tx, {
        organizationId: candidate.request.organizationId,
        environmentId: candidate.request.environmentId,
        projectId: candidate.request.projectId,
        apiKeyId: send.apiKeyId,
        userId: send.apiKeyOwnerId,
        meter: "verify.sms",
        quantity: sms.segments,
        dimension: dimensionKey({ country: send.country ?? "" }),
      });
    });
    settled++;
  }
  return settled;
}
