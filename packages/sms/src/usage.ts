/**
 * SMS metering: a live message is billed once, for its segments by destination country, when it
 * reaches a carrier (`sms.sent`, `sms.delivered` or `sms.undelivered`, whichever comes first);
 * messages that fail before that are free, as they are to coss.com.
 */
import { dimensionKey } from "@coss/billing/catalog";
import { recordUsage } from "@coss/billing/metering";
import { type Executor, schema } from "@coss/db";
import { and, eq, isNull, sql } from "drizzle-orm";

const { smsMessage } = schema;

/** Meters a live message that just reached a carrier; the compare-and-set makes it once-only. */
export async function recordSmsUsage(
  tx: Executor,
  target: { id: string; organizationId: string },
): Promise<void> {
  const [row] = await tx
    .update(smsMessage)
    .set({ usageRecordedAt: sql`transaction_timestamp()` })
    .where(
      and(
        eq(smsMessage.id, target.id),
        eq(smsMessage.organizationId, target.organizationId),
        isNull(smsMessage.usageRecordedAt),
      ),
    )
    .returning({
      environmentId: smsMessage.environmentId,
      projectId: smsMessage.projectId,
      apiKeyId: smsMessage.apiKeyId,
      apiKeyOwnerId: smsMessage.apiKeyOwnerId,
      segments: smsMessage.segments,
      toCountry: smsMessage.toCountry,
    });
  if (!row) return;
  await recordUsage(tx, {
    organizationId: target.organizationId,
    environmentId: row.environmentId,
    // Spend goes to the key that sent it and, for a personal key, its owner at acceptance.
    projectId: row.projectId,
    apiKeyId: row.apiKeyId,
    userId: row.apiKeyOwnerId,
    meter: "sms.segments",
    quantity: row.segments,
    dimension: dimensionKey({ country: row.toCountry }),
  });
}
