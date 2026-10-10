/**
 * Recovery of emails whose send was interrupted (worker). System-level: the scan spans
 * organizations, and every write is scoped by the email's own organization.
 */
import { db, schema } from "@coss/db";
import { and, asc, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { COSS_EVENT_SOURCE, recordProviderEvent } from "./events.ts";

const { email, emailEvent } = schema;

/** A claimed email still `queued` after this long was interrupted mid-send. */
export const STALE_CLAIM_MS = 15 * 60 * 1000;

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
