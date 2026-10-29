/**
 * Delivery-event ingestion. System-level: the organization is resolved from the email the event
 * names (the `coss_email_id` tag coss.com sets on every message), never from the caller, and every
 * write is scoped by that email's organization. Each new event is queued for the environment's
 * webhook endpoints in the same transaction (outbox) and appended to its log (`@coss/logs`).
 */
import { createHash } from "node:crypto";
import { db, type Executor, schema } from "@coss/db";
import { isId } from "@coss/db/id";
import { appendLogEntries } from "@coss/logs";
import { markReputationDue } from "@coss/reputation";
import { enqueueWebhookMessage } from "@coss/webhooks";
import { and, eq, inArray, sql } from "drizzle-orm";
import { purgeSendContent } from "./attachments.ts";
import { bumpRecipientMoves } from "./broadcast-stats.ts";
import { countDedicatedDeliveries } from "./dedicated-ips.ts";
import { emailEventLogEntries } from "./event-logs.ts";
import type { ProviderEvent } from "./provider.ts";
import { invalidateReputationRollup } from "./reputation-checks.ts";
import {
  ALL_CATEGORIES,
  EMAIL_RECIPIENT_STATUSES,
  type EmailEventType,
  type EmailRecipientStatus,
  MARKETING_STREAM_SCOPE,
  type StoredEmailWebhookEvent,
} from "./schemas.ts";
import { autoSuppress } from "./suppressions.ts";
import { recordEmailUsage } from "./usage.ts";

const { email, emailEvent, emailRecipient, environment } = schema;

export type EmailEventRow = typeof emailEvent.$inferSelect;

/** Events coss.com itself records (e.g. a provider rejecting a send) rather than a provider. */
export const COSS_EVENT_SOURCE = "coss";

const RANK: Record<EmailRecipientStatus, number> = {
  queued: 0,
  sent: 1,
  delivery_delayed: 2,
  delivered: 3,
  bounced: 4,
  suppressed: 4,
  failed: 4,
  canceled: 4,
  complained: 5,
};

/** Statuses a recipient may move from to reach `status` (strictly lower precedence). */
export function statusesBelow(status: EmailRecipientStatus): EmailRecipientStatus[] {
  return EMAIL_RECIPIENT_STATUSES.filter((candidate) => RANK[candidate] < RANK[status]);
}

/**
 * `null`: engagement events (opens, clicks) and unsubscribes never change a recipient's status or
 * details.
 */
const STATUS_BY_EVENT: Record<EmailEventType, EmailRecipientStatus | null> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
  // Recipients of a scheduled email stay `queued` (nothing ranks below it).
  "email.scheduled": "queued",
  "email.canceled": "canceled",
  "email.opened": null,
  "email.clicked": null,
  "email.rescheduled": "queued",
  "email.unsubscribed": null,
};

function recipientStatus(event: ProviderEvent): EmailRecipientStatus | null {
  if (event.type === "email.bounced" && event.suppressed) return "suppressed";
  return STATUS_BY_EVENT[event.type];
}

function dedupeKey(event: ProviderEvent, recipient: string | null): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        event.provider,
        event.providerEventType,
        event.providerMessageId ?? "",
        recipient ?? "*",
        event.sourceId,
      ]),
    )
    .digest("hex");
}

/**
 * Records one event in `tx`: inserts it (once per recipient, deduplicated), moves recipients to a
 * higher-precedence status, and marks the email `sent` on `email.sent`. Returns the new rows;
 * duplicates, unknown emails and mismatched providers record nothing.
 */
export async function recordProviderEvent(
  tx: Executor,
  event: ProviderEvent,
): Promise<EmailEventRow[]> {
  if (!event.emailId || !isId("email", event.emailId)) return [];
  const [target] = await tx
    .select({
      id: email.id,
      organizationId: email.organizationId,
      projectId: email.projectId,
      environmentId: email.environmentId,
      provider: email.provider,
      providerMessageId: email.providerMessageId,
      from: email.from,
      to: email.to,
      // Webhook payloads and log lines outlive the email's content, so an email sent without
      // content storage never copies its subject into them (not even before it is discarded).
      subject: sql<string>`case when ${email.storeContent} then ${email.subject} else '' end`,
      tags: email.tags,
      category: email.category,
      stream: email.stream,
      broadcastId: email.broadcastId,
      subaccountId: email.subaccountId,
      createdAt: email.createdAt,
      dedicatedPool: email.dedicatedPool,
      mode: environment.mode,
    })
    .from(email)
    .innerJoin(
      environment,
      and(
        eq(environment.id, email.environmentId),
        eq(environment.organizationId, email.organizationId),
      ),
    )
    .where(eq(email.id, event.emailId))
    .limit(1);
  if (!target) {
    console.warn(`[email:events] ignoring ${event.providerEventType} for unknown ${event.emailId}`);
    return [];
  }
  // Only the provider that was handed the email may report on it, and only for its own message.
  const fromCoss = event.provider === COSS_EVENT_SOURCE;
  if (
    (!fromCoss && target.provider !== event.provider) ||
    (target.providerMessageId &&
      event.providerMessageId &&
      target.providerMessageId !== event.providerMessageId)
  ) {
    console.warn(
      `[email:events] ignoring ${event.provider} ${event.providerEventType} for ${target.id}: ` +
        "provider or message id mismatch",
    );
    return [];
  }

  const scope = and(
    eq(emailRecipient.organizationId, target.organizationId),
    eq(emailRecipient.emailId, target.id),
  );
  const known = await tx
    .select({ address: emailRecipient.address })
    .from(emailRecipient)
    .where(scope);
  const knownAddresses = new Set(known.map((row) => row.address));
  const recipients =
    event.recipients === null
      ? [null]
      : [...new Set(event.recipients.map((value) => value.toLowerCase()))].filter((value) =>
          knownAddresses.has(value),
        );
  if (recipients.length === 0) return [];

  const inserted = await tx
    .insert(emailEvent)
    .values(
      recipients.map((recipient) => ({
        organizationId: target.organizationId,
        environmentId: target.environmentId,
        emailId: target.id,
        type: event.type,
        provider: event.provider,
        providerEventType: event.providerEventType,
        recipient,
        occurredAt: event.occurredAt,
        dedupeKey: dedupeKey(event, recipient),
        details: event.data,
      })),
    )
    .onConflictDoNothing({ target: [emailEvent.emailId, emailEvent.dedupeKey] })
    .returning();
  if (inserted.length === 0) return [];
  // The environment's log gets the same events, in the same transaction.
  await appendLogEntries(tx, emailEventLogEntries(target, event, inserted));
  if (
    event.type === "email.delivered" &&
    event.sendingIp &&
    target.dedicatedPool &&
    target.mode === "live"
  ) {
    await countDedicatedDeliveries(tx, {
      organizationId: target.organizationId,
      sendingIp: event.sendingIp,
      occurredAt: event.occurredAt,
      delivered: inserted.length,
    });
  }
  // Whether the event changed the reputation counts of the email's hour (recipient statuses).
  let recipientsChanged = false;

  if (event.type === "email.sent") {
    // The provider accepted the message: covers a `Send` event racing the send call, and repairs
    // an email the stale-claim sweep gave up on (its recipients start over from `queued`).
    const accepted = {
      status: "sent" as const,
      providerMessageId: sql`coalesce(${email.providerMessageId}, ${event.providerMessageId})`,
      sentAt: sql`coalesce(${email.sentAt}, ${event.occurredAt.toISOString()}::timestamptz)`,
      errorCode: null,
      errorMessage: null,
    };
    const thisEmail = and(eq(email.id, target.id), eq(email.organizationId, target.organizationId));
    const [repaired] = await tx
      .update(email)
      .set(accepted)
      .where(
        and(
          thisEmail,
          eq(email.status, "failed"),
          inArray(email.errorCode, ["dispatch_interrupted", "provider_error"]),
        ),
      )
      .returning({ id: email.id });
    if (repaired) {
      const reset = await tx
        .update(emailRecipient)
        .set({ status: "queued" })
        .where(and(scope, eq(emailRecipient.status, "failed")))
        .returning({ id: emailRecipient.id });
      recipientsChanged = true;
      await countBroadcastMoves(
        tx,
        target,
        reset.map(() => ({ from: "failed" as const, to: "queued" as const })),
      );
    }
    const [sent] = await tx
      .update(email)
      .set(accepted)
      .where(and(thisEmail, eq(email.status, "queued")))
      .returning({ id: email.id });
    if (sent || repaired) {
      await purgeSendContent(tx, target);
      if (target.mode === "live") await recordEmailUsage(tx, target);
    }
  }

  if (event.type === "email.failed" && !fromCoss && event.recipients === null) {
    // The provider gave up on the whole message after accepting it (SES `Reject`, `Rendering
    // Failure`): the email failed, whether or not the send call had returned yet. Usage already
    // recorded at `sent` stays (the provider processed the request).
    const failure = event.data.failure;
    const [failed] = await tx
      .update(email)
      .set({
        status: "failed",
        errorCode: failure?.code ?? "provider_failure",
        errorMessage: failure?.message ?? "The email provider could not send the email.",
      })
      .where(
        and(
          eq(email.id, target.id),
          eq(email.organizationId, target.organizationId),
          inArray(email.status, ["queued", "sent"]),
        ),
      )
      .returning({ id: email.id });
    if (failed) await purgeSendContent(tx, target);
  }

  const status = recipientStatus(event);
  const affected =
    event.recipients === null
      ? [...knownAddresses]
      : inserted.flatMap((row) => (row.recipient ? [row.recipient] : []));
  const below = status ? statusesBelow(status) : [];
  if (status && affected.length > 0 && below.length > 0) {
    // A broadcast's counters follow its recipients' moves, so they need the statuses moved from.
    const before = target.broadcastId
      ? await tx
          .select({ address: emailRecipient.address, status: emailRecipient.status })
          .from(emailRecipient)
          .where(
            and(
              scope,
              inArray(emailRecipient.address, affected),
              inArray(emailRecipient.status, below),
            ),
          )
          .for("update")
      : [];
    const moved = await tx
      .update(emailRecipient)
      .set({
        status,
        lastEventAt: sql`greatest(${emailRecipient.lastEventAt}, ${event.occurredAt.toISOString()}::timestamptz)`,
        details: event.data,
      })
      .where(
        and(
          scope,
          inArray(emailRecipient.address, affected),
          inArray(emailRecipient.status, below),
        ),
      )
      .returning({ id: emailRecipient.id, address: emailRecipient.address });
    if (moved.length > 0) recipientsChanged = true;
    const previous = new Map(before.map((row) => [row.address, row.status]));
    await countBroadcastMoves(
      tx,
      target,
      moved.flatMap((row) => {
        const from = previous.get(row.address);
        return from ? [{ from, to: status }] : [];
      }),
    );
  }

  // Permanent bounces suppress the address for every email of the environment (the mailbox doesn't
  // exist), and so do complaints, except about marketing: those suppress marketing only.
  // SES-suppressed bounces are not counted: the address was never attempted.
  const suppressReason =
    event.type === "email.complained"
      ? "complaint"
      : event.type === "email.bounced" &&
          event.data.bounce?.type === "permanent" &&
          !event.suppressed
        ? "bounce"
        : null;
  if (suppressReason && target.mode === "live") {
    // The reputation guard re-checks the organization's rates (worker).
    await markReputationDue(tx, target.organizationId);
  }
  if ((suppressReason || recipientsChanged) && target.mode === "live") {
    await invalidateReputationRollup(tx, target.organizationId, target.id);
  }
  if (suppressReason) {
    for (const row of inserted) {
      if (!row.recipient) continue;
      await autoSuppress(tx, {
        organizationId: target.organizationId,
        projectId: target.projectId,
        environmentId: target.environmentId,
        address: row.recipient,
        reason: suppressReason,
        emailId: target.id,
        // A sub-account's bounces and complaints go on its own list only.
        subaccountId: target.subaccountId,
        scope:
          suppressReason === "complaint" && target.stream === "marketing"
            ? MARKETING_STREAM_SCOPE
            : ALL_CATEGORIES,
      });
    }
  }

  for (const row of inserted) {
    const payload: StoredEmailWebhookEvent = {
      id: row.id,
      object: "event",
      type: row.type,
      created_at: row.createdAt.toISOString(),
      data: {
        email_id: target.id,
        from: target.from,
        to: target.to,
        subject: target.subject,
        tags: target.tags,
        category: target.category,
        sandbox: target.mode === "sandbox",
        recipient: row.recipient,
        occurred_at: row.occurredAt.toISOString(),
        ...(target.subaccountId ? { subaccount_id: target.subaccountId } : {}),
        ...row.details,
      },
    };
    await enqueueWebhookMessage(tx, {
      id: row.id,
      organizationId: target.organizationId,
      environmentId: target.environmentId,
      type: row.type,
      payload,
    });
  }
  return inserted;
}

async function countBroadcastMoves(
  tx: Executor,
  target: { id: string; organizationId: string; broadcastId: string | null },
  moves: { from: EmailRecipientStatus; to: EmailRecipientStatus }[],
): Promise<void> {
  if (!target.broadcastId || moves.length === 0) return;
  await bumpRecipientMoves(tx, {
    broadcastId: target.broadcastId,
    organizationId: target.organizationId,
    emailId: target.id,
    moves,
  });
}

/** Records events in order, each in its own transaction. Returns how many rows were new. */
export async function ingestProviderEvents(events: ProviderEvent[]): Promise<number> {
  let recorded = 0;
  for (const event of events) {
    const rows = await db.transaction((tx) => recordProviderEvent(tx, event));
    recorded += rows.length;
  }
  return recorded;
}
