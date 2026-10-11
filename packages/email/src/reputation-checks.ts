/**
 * The email signals of the reputation guard: permanent bounce and complaint rates of an
 * organization's live sending. Like SES, the rates are per recipient over the recipients the
 * provider was handed (suppressed, failed and still-queued recipients don't count), and
 * mailbox-simulator addresses are left out unless the policy says otherwise.
 */
import { db, schema } from "@coss/db";
import { type CheckContext, type ReputationCheck, rateResult } from "@coss/reputation";
import { sql } from "drizzle-orm";
import { SIMULATOR_DOMAIN } from "./providers/fake.ts";

const { email, emailEvent, emailRecipient, environment } = schema;

export type SendingCounts = { recipients: number; bounces: number; complaints: number };

/** Recipient counts of the organization's live emails created in `[windowStart, now]`. */
export async function sendingCounts(context: CheckContext): Promise<SendingCounts> {
  const { organizationId, windowStart, now, policy } = context;
  const recipientEvent = (condition: ReturnType<typeof sql>) => sql`exists (
    select 1 from ${emailEvent}
    where ${emailEvent.emailId} = ${emailRecipient.emailId}
      and ${emailEvent.organizationId} = ${emailRecipient.organizationId}
      and ${emailEvent.recipient} = ${emailRecipient.address}
      and ${condition}
  )`;
  const bounced = recipientEvent(
    sql`${emailEvent.type} = 'email.bounced' and ${emailEvent.details} -> 'bounce' ->> 'type' = 'permanent'`,
  );
  const complained = recipientEvent(sql`${emailEvent.type} = 'email.complained'`);
  const result = await db.execute<{ recipients: string; bounces: string; complaints: string }>(sql`
    select
      count(*) as recipients,
      count(*) filter (where ${bounced}) as bounces,
      count(*) filter (where ${complained}) as complaints
    from ${emailRecipient}
    join ${email}
      on ${email.id} = ${emailRecipient.emailId}
      and ${email.organizationId} = ${emailRecipient.organizationId}
    join ${environment}
      on ${environment.id} = ${email.environmentId}
      and ${environment.organizationId} = ${email.organizationId}
    where ${email.organizationId} = ${organizationId}
      and ${email.createdAt} >= ${windowStart.toISOString()}::timestamptz
      and ${email.createdAt} <= ${now.toISOString()}::timestamptz
      and ${environment.mode} = 'live'
      and ${emailRecipient.status} not in ('queued', 'suppressed', 'failed')
      and (${policy.countSimulatorRecipients} or ${emailRecipient.address} not like ${`%@${SIMULATOR_DOMAIN}`})
  `);
  const row = result.rows[0];
  return {
    recipients: Number(row?.recipients ?? 0),
    bounces: Number(row?.bounces ?? 0),
    complaints: Number(row?.complaints ?? 0),
  };
}

/**
 * Both rate checks, sharing one query per evaluation (the guard evaluates its checks for one
 * organization at a time, with one context object).
 */
function emailChecks(): ReputationCheck[] {
  const counts = new WeakMap<CheckContext, Promise<SendingCounts>>();
  const countsFor = (context: CheckContext) => {
    let pending = counts.get(context);
    if (!pending) {
      pending = sendingCounts(context);
      counts.set(context, pending);
    }
    return pending;
  };
  return [
    {
      trigger: "bounce_rate",
      async evaluate(context) {
        const { recipients, bounces } = await countsFor(context);
        return rateResult({
          trigger: "bounce_rate",
          label: "Bounce rate",
          count: bounces,
          volume: recipients,
          threshold: context.policy.bounceRate,
        });
      },
    },
    {
      trigger: "complaint_rate",
      async evaluate(context) {
        const { recipients, complaints } = await countsFor(context);
        return rateResult({
          trigger: "complaint_rate",
          label: "Complaint rate",
          count: complaints,
          volume: recipients,
          threshold: context.policy.complaintRate,
        });
      },
    },
  ];
}

export const emailReputationChecks: ReputationCheck[] = emailChecks();
