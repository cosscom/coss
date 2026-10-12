/**
 * Usage checks (the worker's `billing-usage` loop): alerts when an organization crosses a share of
 * its month's credit (or of a capped plan's allowance), and the spend limit: usage beyond the
 * credit past an owner's limit holds live sending until the month ends or the limit is raised.
 * System-level: spans organizations.
 */
import { db, schema } from "@coss/db";
import { inArray } from "drizzle-orm";
import { getBillingAccount } from "./accounts.ts";
import { METERS, type MeterKey } from "./catalog/meters.ts";
import { grantsFor } from "./grants.ts";
import { liftHold, placeHold } from "./holds.ts";
import { formatCents } from "./money.ts";
import { enqueueBillingNotification } from "./notifications.ts";
import { estimatePeriod } from "./overview.ts";
import { billingStateAt } from "./resolve.ts";
import { formatPeriod, HOUR_MS, periodOf } from "./time.ts";
import { organizationsWithUsageSince } from "./usage.ts";

const DEFAULT_THRESHOLDS = [80, 100];

export async function runBillingUsageChecks(opts: {
  now?: Date;
  limit?: number;
  scope?: { organizationIds: string[] };
  systemOrganizationId?: string | null;
}): Promise<number> {
  const now = opts.now ?? new Date();
  const active = await organizationsWithUsageSince(new Date(now.getTime() - 2 * HOUR_MS));
  const held = await db
    .selectDistinct({ organizationId: schema.billingHold.organizationId })
    .from(schema.billingHold)
    .where(inArray(schema.billingHold.reason, ["spend_limit"]));
  let candidates = [...new Set([...active, ...held.map((row) => row.organizationId)])];
  if (opts.scope) candidates = candidates.filter((id) => opts.scope?.organizationIds.includes(id));
  candidates = candidates
    .filter((id) => id !== opts.systemOrganizationId)
    .slice(0, opts.limit ?? 200);
  for (const organizationId of candidates) {
    try {
      await checkOrganization(organizationId, now);
    } catch (error) {
      console.error(`[billing] usage check of ${organizationId} failed:`, error);
    }
  }
  return candidates.length;
}

async function checkOrganization(organizationId: string, now: Date): Promise<void> {
  const period = periodOf(now);
  const periodKey = period.start.toISOString().slice(0, 7);
  const [account, state, estimate] = await Promise.all([
    getBillingAccount(organizationId),
    billingStateAt(organizationId, now),
    estimatePeriod(organizationId, now),
  ]);
  const thresholds = account?.alertThresholds.length ? account.alertThresholds : DEFAULT_THRESHOLDS;
  const alert = (key: string, percent: number, what: string, blocked: boolean) =>
    enqueueBillingNotification(db, {
      organizationId,
      kind: "usage_threshold",
      dedupeKey: `usage:${organizationId}:${periodKey}:${key}:${percent}`,
      payload: { percent, what, period: formatPeriod(period), blocked: blocked ? "true" : "false" },
      now,
    });

  // Capped plans: the share of each allowance used.
  for (const [meter, cap] of Object.entries(state.terms.usageCaps) as [MeterKey, number][]) {
    if (!cap) continue;
    const used = estimate.usage
      .filter((row) => row.meter === meter)
      .reduce((sum, row) => sum + row.quantity, 0);
    const share = (used / cap) * 100;
    const crossed = thresholds.filter((t) => share >= t).at(-1);
    if (crossed !== undefined) {
      await alert(
        meter,
        crossed,
        `${cap.toLocaleString("en-US")} included ${METERS[meter].units}`,
        true,
      );
    }
  }

  // Billed plans: the share of the month's credit the usage has reached.
  const grants = await grantsFor(organizationId, period);
  const credit = grants
    .filter((grant) => grant.kind === "amount" && grant.appliesTo === "usage")
    .reduce((sum, grant) => sum + grant.amount, 0n);
  if (credit > 0n && estimate.usageCents > 0n) {
    const share = Number((estimate.usageCents * 10_000n) / credit) / 100;
    const crossed = thresholds.filter((t) => share >= t).at(-1);
    if (crossed !== undefined) await alert("credit", crossed, "usage credit", false);
  }

  // Spend limit: usage beyond the month's credit (not fees or commitment shortfalls, which the
  // contract owes whatever is sent).
  const usageNet = estimate.composition.lines
    .filter(
      (line) =>
        line.kind === "usage" ||
        ((line.kind === "discount" || line.kind === "write_off") && line.meter !== undefined),
    )
    .reduce((sum, line) => sum + line.amountCents, 0n);
  const overage = usageNet > estimate.creditUsedCents ? usageNet - estimate.creditUsedCents : 0n;
  const limit = account?.spendLimitCents ?? null;
  if (limit !== null && overage > limit) {
    const placed = await placeHold(
      db,
      organizationId,
      "spend_limit",
      `Over ${formatCents(limit)} in ${periodKey}`,
    );
    if (placed) {
      await enqueueBillingNotification(db, {
        organizationId,
        kind: "spend_limit_reached",
        dedupeKey: `spend:${organizationId}:${periodKey}:${limit}`,
        payload: { limit: formatCents(limit) },
        now,
      });
    }
  } else {
    await liftHold(db, organizationId, "spend_limit");
  }
}
