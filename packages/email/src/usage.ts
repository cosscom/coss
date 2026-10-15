/**
 * Email metering: an email is counted once, for its recipients, when it becomes `sent` (sending
 * metrics for every email, billed usage for live ones).
 */
import { recordUsage } from "@coss/billing/metering";
import { type Executor, schema } from "@coss/db";
import { and, eq, isNull, ne, type SQL, sql } from "drizzle-orm";
import { countEmailMetric } from "./metrics.ts";

const { email, emailRecipient } = schema;

/**
 * The recipients a send is billed for: the ones handed to the provider (suppressed ones are left
 * out). Frozen when a dispatcher claims the email, so later status changes don't move it.
 */
export function billableRecipientsSql(target: { id: string; organizationId: string }): SQL<number> {
  return sql<number>`(select count(*)::int from ${emailRecipient} where ${emailRecipient.organizationId} = ${target.organizationId} and ${emailRecipient.emailId} = ${target.id} and ${emailRecipient.status} <> 'suppressed')`;
}

export async function freezeBillableRecipients(
  executor: Executor,
  target: { id: string; organizationId: string },
): Promise<void> {
  await executor
    .update(email)
    .set({ billableRecipients: billableRecipientsSql(target) })
    .where(and(eq(email.id, target.id), eq(email.organizationId, target.organizationId)));
}

/**
 * Counts an email that just became `sent`, in that transaction: its `sent` metric (every mode)
 * and, for live emails, its billed usage. Every path to `sent` calls it; the compare-and-set on
 * `usage_recorded_at` makes it once-only.
 */
export async function recordEmailSent(
  tx: Executor,
  target: { id: string; organizationId: string },
  mode: "live" | "sandbox",
): Promise<void> {
  const [row] = await tx
    .update(email)
    .set({ usageRecordedAt: sql`transaction_timestamp()` })
    .where(
      and(
        eq(email.id, target.id),
        eq(email.organizationId, target.organizationId),
        isNull(email.usageRecordedAt),
      ),
    )
    .returning({
      environmentId: email.environmentId,
      billable: email.billableRecipients,
      sentAt: email.sentAt,
      from: email.from,
      category: email.category,
      tags: email.tags,
    });
  if (!row) return;
  // The recipients handed to the provider (suppressed ones were left out).
  const recipients = await tx
    .select({ address: emailRecipient.address })
    .from(emailRecipient)
    .where(
      and(
        eq(emailRecipient.organizationId, target.organizationId),
        eq(emailRecipient.emailId, target.id),
        ne(emailRecipient.status, "suppressed"),
      ),
    );
  await countEmailMetric(tx, {
    email: { ...row, organizationId: target.organizationId },
    metric: "sent",
    addresses: recipients.map((recipient) => recipient.address),
    at: row.sentAt ?? new Date(),
  });
  if (mode !== "live") return;
  await recordUsage(tx, {
    organizationId: target.organizationId,
    environmentId: row.environmentId,
    meter: "email.recipients",
    // Claimed before billable counts were frozen at claim time: the same count.
    quantity: row.billable ?? recipients.length,
  });
}
