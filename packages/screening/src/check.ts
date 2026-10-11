/**
 * The reputation check for content screening: within the evaluation window, any enforced
 * `blocked` verdict suspends and any enforced `flagged` verdict warns. A warning therefore clears
 * once the flags age out of the window, and a reinstatement (which restarts the window) is not
 * undone by the block that caused the suspension.
 */
import { db, schema } from "@coss/db";
import type { CheckResult, ReputationCheck } from "@coss/reputation";
import { and, count, eq, gte, lte, ne } from "drizzle-orm";
import { CONTENT_SCREENING_TRIGGER } from "./screen.ts";

const { contentScreening } = schema;

export const contentScreeningCheck: ReputationCheck = {
  trigger: CONTENT_SCREENING_TRIGGER,
  async evaluate(context): Promise<CheckResult> {
    const rows = await db
      .select({ verdict: contentScreening.verdict, count: count() })
      .from(contentScreening)
      .where(
        and(
          eq(contentScreening.organizationId, context.organizationId),
          gte(contentScreening.createdAt, context.windowStart),
          lte(contentScreening.createdAt, context.now),
          eq(contentScreening.enforced, true),
          ne(contentScreening.verdict, "error"),
        ),
      )
      .groupBy(contentScreening.verdict);
    const counts = { clean: 0, flagged: 0, blocked: 0, error: 0 };
    for (const row of rows) counts[row.verdict] = row.count;
    const screened = counts.clean + counts.flagged + counts.blocked;
    const severity = counts.blocked > 0 ? "suspend" : counts.flagged > 0 ? "warning" : "ok";
    const message =
      counts.blocked > 0
        ? `${plural(counts.blocked, "message was", "messages were")} blocked by content screening.`
        : counts.flagged > 0
          ? `${plural(counts.flagged, "message looks", "messages look")} like spam or phishing to content screening.`
          : "No screened message was flagged.";
    return {
      trigger: CONTENT_SCREENING_TRIGGER,
      severity,
      message,
      // Not a rate: one confident verdict is enough to act on.
      rate: null,
      count: counts.flagged + counts.blocked,
      volume: screened,
      warningThreshold: null,
      suspendThreshold: null,
      minimumVolume: null,
    };
  },
};

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
