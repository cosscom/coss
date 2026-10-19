/**
 * SMS reputation: the share of live messages carriers filtered as spam, and the share of their
 * recipients who opted out (STOP), over the evaluation window. Messages count by when they were
 * sent (`SEND_TIME`, the `sms_message_organization_send_time_idx` expression) and only once they
 * reached a carrier; the simulator's numbers never count unless the policy says so.
 */
import { db, schema } from "@coss/db";
import { type CheckContext, type ReputationCheck, rateResult } from "@coss/reputation";
import { and, countDistinct, eq, gte, inArray, sql } from "drizzle-orm";
import { SIMULATOR_PREFIX } from "./phone.ts";

const { environment, smsMessage, smsSuppression } = schema;

export const SMS_OPT_OUT_TRIGGER = "sms_opt_out_rate";
export const SMS_FILTERED_TRIGGER = "sms_filtered_rate";

/** Keep identical to `sms_message_organization_send_time_idx`. */
const SEND_TIME = sql`coalesce(${smsMessage.sentAt}, ${smsMessage.createdAt})`;

type Counts = { reached: number; filtered: number; optOuts: number };

/** One count for both checks of an evaluation (they share its `context` object). */
const counted = new WeakMap<CheckContext, Promise<Counts>>();

async function countFor(context: CheckContext): Promise<Counts> {
  const simulator = context.policy.countSimulatorRecipients
    ? undefined
    : sql`${smsMessage.to} not like ${`${SIMULATOR_PREFIX}%`}`;
  const [messages] = await db
    .select({
      reached: sql<number>`count(*) filter (where ${smsMessage.status} in ('sent', 'delivered', 'undelivered'))::int`,
      filtered: sql<number>`count(*) filter (where ${smsMessage.status} = 'undelivered' and ${smsMessage.errorCode} = 'carrier_filtered')::int`,
    })
    .from(smsMessage)
    .innerJoin(
      environment,
      and(
        eq(environment.id, smsMessage.environmentId),
        eq(environment.organizationId, smsMessage.organizationId),
      ),
    )
    .where(
      and(
        eq(smsMessage.organizationId, context.organizationId),
        sql`${SEND_TIME} >= ${context.windowStart.toISOString()}::timestamptz`,
        eq(environment.mode, "live"),
        simulator,
      ),
    );
  // An opt-out lands in every live environment: count numbers, not entries.
  const [optOuts] = await db
    .select({ numbers: countDistinct(smsSuppression.phoneNumber) })
    .from(smsSuppression)
    .where(
      and(
        eq(smsSuppression.organizationId, context.organizationId),
        inArray(smsSuppression.reason, ["opt_out"]),
        gte(smsSuppression.createdAt, context.windowStart),
      ),
    );
  return {
    reached: messages?.reached ?? 0,
    filtered: messages?.filtered ?? 0,
    optOuts: optOuts?.numbers ?? 0,
  };
}

function counts(context: CheckContext): Promise<Counts> {
  let pending = counted.get(context);
  if (!pending) {
    pending = countFor(context);
    counted.set(context, pending);
  }
  return pending;
}

export const smsReputationChecks: ReputationCheck[] = [
  {
    trigger: SMS_OPT_OUT_TRIGGER,
    async evaluate(context) {
      const { reached, optOuts } = await counts(context);
      return rateResult({
        trigger: SMS_OPT_OUT_TRIGGER,
        label: "SMS opt-out rate",
        count: optOuts,
        volume: reached,
        threshold: context.policy.smsOptOutRate,
        unit: "messages",
      });
    },
  },
  {
    trigger: SMS_FILTERED_TRIGGER,
    async evaluate(context) {
      const { reached, filtered } = await counts(context);
      return rateResult({
        trigger: SMS_FILTERED_TRIGGER,
        label: "SMS carrier filtering rate",
        count: filtered,
        volume: reached,
        threshold: context.policy.smsFilteredRate,
        unit: "messages",
      });
    },
  },
];
