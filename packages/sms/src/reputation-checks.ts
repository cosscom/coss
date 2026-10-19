/**
 * SMS reputation: the share of live messages carriers filtered as spam, and the share of their
 * recipients who opted out (STOP), over the evaluation window. Messages count by when they were
 * sent (`SEND_TIME`, the `sms_message_organization_send_time_idx` expression) and only once a
 * carrier took them (`usage_recorded_at`: what is billed); the simulator's numbers never count
 * unless the policy says so. Opt-outs are counted from what happened (STOP replies' receipts,
 * sends refused as opted out), never from the suppression list, which a START or a removal empties.
 */
import { db, schema } from "@coss/db";
import { type CheckContext, type ReputationCheck, rateResult } from "@coss/reputation";
import { and, eq, gte, sql } from "drizzle-orm";
import { SIMULATOR_PREFIX } from "./phone.ts";

const { environment, smsInboundReceipt, smsMessage } = schema;

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
      reached: sql<number>`count(*) filter (where ${smsMessage.usageRecordedAt} is not null)::int`,
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
  // Numbers, not events: an opt-out lands in every live environment, and a number may reply STOP
  // more than once.
  const replied = await db
    .selectDistinct({ number: smsInboundReceipt.fromNumber })
    .from(smsInboundReceipt)
    .where(
      and(
        eq(smsInboundReceipt.organizationId, context.organizationId),
        eq(smsInboundReceipt.keyword, "stop"),
        gte(smsInboundReceipt.createdAt, context.windowStart),
      ),
    );
  const refused = await db
    .selectDistinct({ number: smsMessage.to })
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
        eq(smsMessage.errorCode, "opted_out"),
        sql`${SEND_TIME} >= ${context.windowStart.toISOString()}::timestamptz`,
        eq(environment.mode, "live"),
        simulator,
      ),
    );
  const optedOut = new Set([...replied, ...refused].map((row) => row.number).filter(Boolean));
  return {
    reached: messages?.reached ?? 0,
    filtered: messages?.filtered ?? 0,
    optOuts: optedOut.size,
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
