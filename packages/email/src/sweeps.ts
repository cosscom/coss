/**
 * Recovery of emails whose dispatch was lost or interrupted (worker). System-level: the scans
 * span organizations, and every write is scoped by the email's own organization.
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import type { EmailDispatchQueue } from "./dispatch.ts";
import { COSS_EVENT_SOURCE, recordProviderEvent } from "./events.ts";

const { email, emailEvent } = schema;

/** A claimed email still `queued` after this long was interrupted mid-send. */
export const STALE_CLAIM_MS = 15 * 60 * 1000;

/** An unclaimed email still `queued` after this long may have lost its dispatch job. */
export const UNCLAIMED_REQUEUE_MS = 10 * 60 * 1000;

/** An unclaimed email still `queued` after this long is failed: sending it now would be too late. */
export const UNCLAIMED_FAIL_MS = 60 * 60 * 1000;

type Scope = { organizationIds: string[] };

/** Unclaimed `queued` emails created before `before`, oldest first. */
function unclaimedBefore(before: Date, limit: number, scope: Scope | undefined) {
  return db
    .select({ id: email.id, organizationId: email.organizationId })
    .from(email)
    .where(
      and(
        eq(email.status, "queued"),
        isNull(email.provider),
        lt(email.createdAt, before),
        scope ? inArray(email.organizationId, scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(email.createdAt))
    .limit(limit);
}

/**
 * Recovers emails no dispatcher claimed in time (their job exhausted its retries, or the email
 * predates async dispatch). Older than `UNCLAIMED_FAIL_MS`, an email is `failed` with
 * `dispatch_failed` and an `email.failed` event (and webhook); this also keeps emails that can
 * never be dispatched from filling every batch. Older than `UNCLAIMED_REQUEUE_MS`, its dispatch
 * is enqueued again: an email still waiting behind a backlog keeps its one queued job (the queue
 * allows one per email), and an extra job for an email being dispatched right now finds it
 * claimed and does nothing. A dispatcher that claims an email first always wins over the failing
 * update. `scope` limits the scans to some organizations (tests).
 */
export async function sweepUnclaimedEmails(
  queue: EmailDispatchQueue,
  opts: { now?: Date; limit?: number; scope?: Scope },
): Promise<{ failed: number; requeued: number }> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 100;

  let failed = 0;
  const expired = await unclaimedBefore(
    new Date(now.getTime() - UNCLAIMED_FAIL_MS),
    limit,
    opts.scope,
  );
  for (const candidate of expired) {
    const done = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(email)
        .set({
          status: "failed",
          errorCode: "dispatch_failed",
          errorMessage: "The email could not be handed to the provider in time.",
        })
        .where(
          and(
            eq(email.id, candidate.id),
            eq(email.organizationId, candidate.organizationId),
            eq(email.status, "queued"),
            isNull(email.provider),
          ),
        )
        .returning({ id: email.id });
      if (!updated) return false;
      await recordProviderEvent(tx, {
        provider: COSS_EVENT_SOURCE,
        providerEventType: "DispatchFailed",
        emailId: candidate.id,
        providerMessageId: null,
        type: "email.failed",
        recipients: null,
        occurredAt: now,
        sourceId: "dispatch_failed",
        data: {
          failure: {
            code: "dispatch_failed",
            message: "The email could not be handed to the email provider in time.",
          },
        },
      });
      return true;
    });
    if (done) failed++;
  }

  const unclaimed = await unclaimedBefore(
    new Date(now.getTime() - UNCLAIMED_REQUEUE_MS),
    limit,
    opts.scope,
  );
  for (const candidate of unclaimed) {
    await db.transaction((tx) =>
      queue.enqueue(tx, { organizationId: candidate.organizationId, emailId: candidate.id }),
    );
  }
  return { failed, requeued: unclaimed.length };
}

/**
 * Resolves emails claimed by a dispatcher that never recorded the outcome (e.g. the process died
 * during the provider call). If the provider reported the email as sent, it is `sent`; otherwise
 * it is `failed` with `dispatch_interrupted`, which a late `Send` event still repairs. Returns how
 * many emails were resolved. `scope` limits the scan to some organizations (tests).
 */
export async function sweepStaleClaims(opts: {
  now?: Date;
  limit?: number;
  scope?: { organizationIds: string[] };
}): Promise<number> {
  const now = opts.now ?? new Date();
  const stale = await db
    .select({ id: email.id, organizationId: email.organizationId })
    .from(email)
    .where(
      and(
        eq(email.status, "queued"),
        isNotNull(email.provider),
        lt(email.updatedAt, new Date(now.getTime() - STALE_CLAIM_MS)),
        opts.scope ? inArray(email.organizationId, opts.scope.organizationIds) : undefined,
      ),
    )
    .orderBy(asc(email.updatedAt))
    .limit(opts.limit ?? 100);

  let resolved = 0;
  for (const candidate of stale) {
    const done = await db.transaction(async (tx) => {
      const thisEmail = and(
        eq(email.id, candidate.id),
        eq(email.organizationId, candidate.organizationId),
        eq(email.status, "queued"),
      );
      const [sent] = await tx
        .select({ occurredAt: emailEvent.occurredAt })
        .from(emailEvent)
        .where(
          and(
            eq(emailEvent.organizationId, candidate.organizationId),
            eq(emailEvent.emailId, candidate.id),
            eq(emailEvent.type, "email.sent"),
          ),
        )
        .limit(1);
      if (sent) {
        const [updated] = await tx
          .update(email)
          .set({ status: "sent", sentAt: sent.occurredAt })
          .where(thisEmail)
          .returning({ id: email.id });
        return Boolean(updated);
      }
      const [failed] = await tx
        .update(email)
        .set({
          status: "failed",
          errorCode: "dispatch_interrupted",
          errorMessage: "The send was interrupted before the provider confirmed it.",
        })
        .where(thisEmail)
        .returning({ id: email.id });
      if (!failed) return false;
      await recordProviderEvent(tx, {
        provider: COSS_EVENT_SOURCE,
        providerEventType: "DispatchInterrupted",
        emailId: candidate.id,
        providerMessageId: null,
        type: "email.failed",
        recipients: null,
        occurredAt: now,
        sourceId: "dispatch_interrupted",
        data: {
          failure: {
            code: "dispatch_interrupted",
            message: "The send was interrupted before the email provider confirmed it.",
          },
        },
      });
      return true;
    });
    if (done) resolved++;
  }
  return resolved;
}
