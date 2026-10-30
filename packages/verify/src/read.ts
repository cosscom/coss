/** Reading verifications for the API and the dashboard (one environment at a time). */
import { db, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { and, asc, desc, eq, inArray, isNotNull, or, type SQL, sql } from "drizzle-orm";
import { VerifyError } from "./errors.ts";
import {
  DEFAULT_VERIFY_LIST_LIMIT,
  MAX_VERIFY_LIST_LIMIT,
  type VerificationObjectOutput,
  type VerificationStatus,
} from "./schemas.ts";

const { environment, verifyRequest, verifySend } = schema;

export type VerifyRequestRow = typeof verifyRequest.$inferSelect;
export type VerifySendRow = typeof verifySend.$inferSelect;

/** What each `failure_code` tells developers. */
export const VERIFY_FAILURES: Record<string, string> = {
  max_attempts: "Too many wrong codes were checked.",
  send_failed: "The code couldn't be sent.",
  recipient_suppressed:
    "The recipient is suppressed (an SMS opt-out or the environment's suppression list).",
};

/** A pending verification past its expiry reads as `expired` before anything writes it. */
export function effectiveStatus(row: VerifyRequestRow, now: Date = new Date()): VerificationStatus {
  return row.status === "pending" && row.expiresAt <= now ? "expired" : row.status;
}

export function toVerificationObject(
  row: VerifyRequestRow,
  sends: VerifySendRow[],
  sandbox: boolean,
  now: Date = new Date(),
): VerificationObjectOutput {
  return {
    object: "verification",
    id: row.id,
    channel: row.channel,
    to: row.to,
    country: row.toCountry,
    status: effectiveStatus(row, now),
    failure:
      row.status === "failed" && row.failureCode
        ? { code: row.failureCode, message: VERIFY_FAILURES[row.failureCode] ?? "" }
        : null,
    reasons: row.riskReasons,
    attempts: row.attempts,
    max_attempts: row.maxAttempts,
    sends: sends.map((send) => ({
      channel: send.channel,
      route: send.route,
      // Shared numbers' messages are coss.com's, not the customer's to look up (a sandbox's are
      // its own: they never leave it).
      sms_id: send.route === "own_number" || sandbox ? send.smsId : null,
      email_id: send.route === "email" ? send.emailId : null,
      created_at: send.createdAt.toISOString(),
    })),
    tags: row.tags,
    sandbox,
    expires_at: row.expiresAt.toISOString(),
    approved_at: row.approvedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

/** The sends of these verifications (one organization), oldest first, by verification id. */
export async function sendsByRequest(
  organizationId: string,
  requestIds: string[],
): Promise<Map<string, VerifySendRow[]>> {
  const grouped = new Map<string, VerifySendRow[]>();
  if (requestIds.length === 0) return grouped;
  const rows = await db
    .select()
    .from(verifySend)
    .where(
      and(
        eq(verifySend.organizationId, organizationId),
        inArray(verifySend.requestId, requestIds),
        // Claimed sends that never went out (the channel refused them) aren't sends.
        or(isNotNull(verifySend.smsId), isNotNull(verifySend.emailId)),
      ),
    )
    .orderBy(asc(verifySend.sequence));
  for (const row of rows) {
    const list = grouped.get(row.requestId) ?? [];
    list.push(row);
    grouped.set(row.requestId, list);
  }
  return grouped;
}

async function selectWithMode(
  organizationId: string,
  where: SQL | undefined,
  limit: number,
): Promise<{ row: VerifyRequestRow; sandbox: boolean }[]> {
  const rows = await db
    .select({ row: verifyRequest, mode: environment.mode })
    .from(verifyRequest)
    .innerJoin(
      environment,
      and(
        eq(environment.id, verifyRequest.environmentId),
        eq(environment.organizationId, verifyRequest.organizationId),
      ),
    )
    .where(and(eq(verifyRequest.organizationId, organizationId), where))
    .orderBy(desc(verifyRequest.createdAt), desc(verifyRequest.id))
    .limit(limit);
  return rows.map((found) => ({ row: found.row, sandbox: found.mode === "sandbox" }));
}

/** The verification as the API shows it now. */
export async function verificationObject(
  row: VerifyRequestRow,
  sandbox: boolean,
): Promise<VerificationObjectOutput> {
  const sends = await sendsByRequest(row.organizationId, [row.id]);
  return toVerificationObject(row, sends.get(row.id) ?? [], sandbox);
}

export async function getVerification(input: {
  organizationId: string;
  environmentId: string;
  verificationId: string;
}): Promise<VerificationObjectOutput> {
  const [found] = isId("vrf", input.verificationId)
    ? await selectWithMode(
        input.organizationId,
        and(
          eq(verifyRequest.environmentId, input.environmentId),
          eq(verifyRequest.id, input.verificationId),
        ),
        1,
      )
    : [];
  if (!found) throw new VerifyError("not_found", "Verification not found.");
  return verificationObject(found.row, found.sandbox);
}

/** One page of an environment's verifications, newest first. */
export async function listVerificationsPage(input: {
  organizationId: string;
  environmentId: string;
  to?: string;
  status?: VerificationStatus;
  limit?: number;
  after?: string;
}): Promise<{ data: VerificationObjectOutput[]; hasMore: boolean }> {
  const limit = Math.min(input.limit ?? DEFAULT_VERIFY_LIST_LIMIT, MAX_VERIFY_LIST_LIMIT);
  const now = new Date();
  const conditions: SQL[] = [eq(verifyRequest.environmentId, input.environmentId)];
  if (input.to) conditions.push(eq(verifyRequest.to, input.to));
  if (input.status === "expired") {
    conditions.push(
      sql`(${verifyRequest.status} = 'expired' or (${verifyRequest.status} = 'pending' and ${verifyRequest.expiresAt} <= ${now.toISOString()}::timestamptz))`,
    );
  } else if (input.status === "pending") {
    conditions.push(
      sql`${verifyRequest.status} = 'pending' and ${verifyRequest.expiresAt} > ${now.toISOString()}::timestamptz`,
    );
  } else if (input.status) {
    conditions.push(eq(verifyRequest.status, input.status));
  }
  if (input.after !== undefined) {
    // Keyset on the list's order; a cursor from another environment (or none) matches nothing.
    conditions.push(
      sql`(${verifyRequest.createdAt}, ${verifyRequest.id}) < (
        select c.created_at, c.id from ${verifyRequest} c
        where c.id = ${input.after}
          and c.organization_id = ${input.organizationId}
          and c.environment_id = ${input.environmentId}
      )`,
    );
  }
  // One row more than the page tells whether another page follows.
  const rows = await selectWithMode(input.organizationId, and(...conditions), limit + 1);
  const page = rows.slice(0, limit);
  const sends = await sendsByRequest(
    input.organizationId,
    page.map((found) => found.row.id),
  );
  return {
    data: page.map((found) =>
      toVerificationObject(found.row, sends.get(found.row.id) ?? [], found.sandbox, now),
    ),
    hasMore: rows.length > limit,
  };
}
