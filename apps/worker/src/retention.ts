/**
 * The `retention` loop: deletes data past the retention published in `@coss/retention`. Each
 * step is the owning package's purge; emails go before their batches.
 */
import {
  purgeEmptyEmailBatches,
  purgeExpiredEmails,
  purgeExpiredReputationRollups,
} from "@coss/email";
import {
  purgeExpiredHookDeliveryRollups,
  purgeExpiredHookIdempotencyKeys,
  purgeExpiredHookPortalSessions,
  purgeFinishedHookRecoveries,
} from "@coss/hooks";
import {
  purgeExpiredReputationEvents,
  purgeExpiredReputationNotifications,
} from "@coss/reputation";
import { purgeExpiredScreenings } from "@coss/screening";
import { purgeExpiredAdminAuditEvents, purgeExpiredAuthRows } from "@coss/tenancy/retention";
import { purgeExpiredLogDrainBatches, purgeExpiredWebhookMessages } from "@coss/webhooks";

/** Limits every step to some organizations, users and verification identifiers (tests). */
export type RetentionScope = {
  organizationIds: string[];
  userIds?: string[];
  identifiers?: string[];
};

type StepOptions = { now?: Date; limit: number; scope?: RetentionScope };

const STEPS: { name: string; purge: (opts: StepOptions) => Promise<number | number[]> }[] = [
  { name: "emails", purge: purgeExpiredEmails },
  { name: "email batches", purge: purgeEmptyEmailBatches },
  { name: "reputation rollups", purge: purgeExpiredReputationRollups },
  { name: "webhook messages", purge: purgeExpiredWebhookMessages },
  { name: "log drain batches and backlog", purge: purgeExpiredLogDrainBatches },
  // Hooks messages, deliveries and attempts leave with their partitions (the `partitions` loop).
  { name: "hook idempotency keys", purge: purgeExpiredHookIdempotencyKeys },
  { name: "hook portal sessions", purge: purgeExpiredHookPortalSessions },
  { name: "hook recoveries", purge: purgeFinishedHookRecoveries },
  { name: "hook delivery rollups", purge: purgeExpiredHookDeliveryRollups },
  { name: "content screenings", purge: purgeExpiredScreenings },
  { name: "reputation notifications", purge: purgeExpiredReputationNotifications },
  { name: "reputation events", purge: purgeExpiredReputationEvents },
  { name: "admin audit events", purge: purgeExpiredAdminAuditEvents },
  {
    name: "expired auth rows",
    purge: async (opts) => Object.values(await purgeExpiredAuthRows(opts)),
  },
];

/**
 * Runs every purge once, up to `limit` rows each, and logs what it deleted. Stops between steps
 * once `signal` is aborted. True when a step deleted a full batch (there may be more to delete).
 */
export async function runRetention(opts: {
  limit: number;
  signal?: AbortSignal;
  now?: Date;
  scope?: RetentionScope;
}): Promise<boolean> {
  const { signal, ...stepOptions } = opts;
  let busy = false;
  const deleted: string[] = [];
  for (const step of STEPS) {
    if (signal?.aborted) break;
    const counts = [await step.purge(stepOptions)].flat();
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (total > 0) deleted.push(`${total} ${step.name}`);
    if (counts.some((count) => count === opts.limit)) busy = true;
  }
  if (deleted.length > 0) console.log(`[worker:retention] deleted ${deleted.join(", ")}`);
  return busy;
}
