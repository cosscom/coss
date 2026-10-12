/**
 * Metering: what products call, in the transaction that makes their usage billable (an email
 * becoming `sent`). Imports only `@coss/db`, so any product package can depend on it.
 */
import { db, type Executor, schema } from "@coss/db";
import { type AnyColumn, eq, exists, type SQL, sql } from "drizzle-orm";
import type { MeterKey } from "./catalog/meters.ts";

const { billingHold, billingUsage } = schema;

/** Rows per organization, hour and meter that concurrent writers spread over. */
const USAGE_SHARDS = 8;

export type UsageInput = {
  organizationId: string;
  environmentId: string;
  meter: MeterKey;
  quantity: number;
  /** `dimensionKey(...)`, e.g. `country=US`; `""` (default) for none. */
  dimension?: string;
};

/**
 * Adds usage to the current hour's counter. Call it exactly once per billable event, in the
 * transaction that records the event (the caller guarantees once-only, e.g. with a
 * compare-and-set): the hour is the transaction's, so a closed period never changes after the
 * settle window.
 */
export async function recordUsage(tx: Executor, input: UsageInput): Promise<void> {
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) return;
  await tx
    .insert(billingUsage)
    .values({
      organizationId: input.organizationId,
      hourStart: sql`date_trunc('hour', transaction_timestamp(), 'UTC')`,
      meter: input.meter,
      dimension: input.dimension ?? "",
      environmentId: input.environmentId,
      shard: Math.floor(Math.random() * USAGE_SHARDS),
      quantity: input.quantity,
    })
    .onConflictDoUpdate({
      target: [
        billingUsage.organizationId,
        billingUsage.hourStart,
        billingUsage.meter,
        billingUsage.dimension,
        billingUsage.environmentId,
        billingUsage.shard,
      ],
      set: { quantity: sql`${billingUsage.quantity} + excluded.quantity` },
    });
}

/** Whether live sending is held for billing (any reason). */
export async function isOnBillingHold(
  organizationId: string,
  executor: Executor = db,
): Promise<boolean> {
  const [row] = await executor
    .select({ reason: billingHold.reason })
    .from(billingHold)
    .where(eq(billingHold.organizationId, organizationId))
    .limit(1);
  return Boolean(row);
}

/** `EXISTS` a billing hold for the organization in `organizationId` (e.g. `email.organization_id`). */
export function billingHoldExists(organizationId: AnyColumn): SQL {
  return exists(
    db
      .select({ reason: billingHold.reason })
      .from(billingHold)
      .where(eq(billingHold.organizationId, organizationId)),
  );
}
