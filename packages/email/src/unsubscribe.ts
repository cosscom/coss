/**
 * One-click unsubscribes (RFC 8058) from COSS's public `/t/u/:token` endpoint. System-level, like
 * opens and clicks: the email is resolved from its unguessable tracking token, and every write is
 * scoped by that email's organization. Only emails sent with `unsubscribe` qualify; they have a
 * category and exactly one recipient, so the unsubscribe always names who asked.
 */
import { db, schema } from "@coss/db";
import { and, eq } from "drizzle-orm";
import { COSS_EVENT_SOURCE, recordProviderEvent } from "./events.ts";
import { autoSuppress } from "./suppressions.ts";
import { isTrackingToken } from "./tracking.ts";

const { email, emailRecipient } = schema;

type Unsubscribable = {
  id: string;
  organizationId: string;
  projectId: string;
  environmentId: string;
  category: string;
  recipient: string;
};

/** The email and recipient a token unsubscribes; `null` for unknown tokens and other emails. */
async function findUnsubscribable(token: string): Promise<Unsubscribable | null> {
  if (!isTrackingToken(token)) return null;
  const [row] = await db
    .select({
      id: email.id,
      organizationId: email.organizationId,
      projectId: email.projectId,
      environmentId: email.environmentId,
      category: email.category,
      unsubscribe: email.unsubscribe,
    })
    .from(email)
    .where(eq(email.trackingToken, token))
    .limit(1);
  if (!row?.unsubscribe || row.category === null) return null;
  const recipients = await db
    .select({ address: emailRecipient.address })
    .from(emailRecipient)
    .where(
      and(
        eq(emailRecipient.organizationId, row.organizationId),
        eq(emailRecipient.emailId, row.id),
      ),
    )
    .limit(2);
  const [only] = recipients;
  if (recipients.length !== 1 || !only) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    projectId: row.projectId,
    environmentId: row.environmentId,
    category: row.category,
    recipient: only.address,
  };
}

/** What the unsubscribe page shows before the recipient confirms; `null` when the link is invalid. */
export async function getUnsubscribe(token: string): Promise<{ category: string } | null> {
  const target = await findUnsubscribable(token);
  return target ? { category: target.category } : null;
}

/**
 * Unsubscribes the email's recipient from its category: an `email.unsubscribed` event (once per
 * email, with its log line and webhook) and a suppression scoped to the category, added again on
 * every call so a repeated unsubscribe restores an entry removed since. `false` for invalid links.
 */
export async function recordUnsubscribe(input: { token: string; now?: Date }): Promise<boolean> {
  const now = input.now ?? new Date();
  const target = await findUnsubscribable(input.token);
  if (!target) return false;
  await db.transaction(async (tx) => {
    await recordProviderEvent(tx, {
      provider: COSS_EVENT_SOURCE,
      providerEventType: "Unsubscribe",
      emailId: target.id,
      providerMessageId: null,
      type: "email.unsubscribed",
      recipients: [target.recipient],
      occurredAt: now,
      sourceId: "unsubscribe",
      data: {},
    });
    await autoSuppress(tx, {
      organizationId: target.organizationId,
      projectId: target.projectId,
      environmentId: target.environmentId,
      address: target.recipient,
      reason: "unsubscribe",
      emailId: target.id,
      scope: target.category,
    });
  });
  return true;
}
