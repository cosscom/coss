/**
 * The email signals of the reputation guard: permanent bounce and complaint rates of an
 * organization's live sending. Like SES, the rates are per recipient over the recipients the
 * provider was handed (suppressed, failed, canceled and still-queued recipients don't count), and
 * mailbox-simulator addresses are left out unless the policy says otherwise.
 *
 * Closed hours are counted once and kept in `email_reputation_rollup` (by the hour the emails were
 * created); `recordProviderEvent` bumps an hour's revision when an event changes its counts, and
 * the next evaluation recounts just that hour. Only the open edges of the window are counted live.
 */
import { db, type Executor, schema } from "@coss/db";
import { type CheckContext, type ReputationCheck, rateResult } from "@coss/reputation";
import { RETENTION_DAYS } from "@coss/retention";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { SIMULATOR_DOMAIN } from "./providers/fake.ts";

const { email, emailEvent, emailRecipient, emailReputationRollup, environment } = schema;

const HOUR = 60 * 60 * 1000;
/** An hour is rolled up once it ended this long ago (late `sent` events and sweeps aside). */
export const ROLLUP_SETTLE_MS = HOUR;
/** Events bump hours that ended at least this long ago; the margin covers transaction length. */
const ROLLUP_INVALIDATE_AFTER_MS = ROLLUP_SETTLE_MS / 2;
/** Longest window (`windowDays` ≤ 30) plus a day. */
const ROLLUP_RETENTION_MS = RETENTION_DAYS.reputationRollups * 24 * HOUR;

export type SendingCounts = { recipients: number; bounces: number; complaints: number };

type SliceCounts = SendingCounts & {
  simulatorRecipients: number;
  simulatorBounces: number;
  simulatorComplaints: number;
};

const floorHour = (ms: number) => Math.floor(ms / HOUR) * HOUR;
const ceilHour = (ms: number) => Math.ceil(ms / HOUR) * HOUR;

function zero(): SliceCounts {
  return {
    recipients: 0,
    bounces: 0,
    complaints: 0,
    simulatorRecipients: 0,
    simulatorBounces: 0,
    simulatorComplaints: 0,
  };
}

function add(total: SliceCounts, counts: SliceCounts) {
  total.recipients += counts.recipients;
  total.bounces += counts.bounces;
  total.complaints += counts.complaints;
  total.simulatorRecipients += counts.simulatorRecipients;
  total.simulatorBounces += counts.simulatorBounces;
  total.simulatorComplaints += counts.simulatorComplaints;
}

/**
 * Counts of the organization's live emails created in `[from, to)` (`[from, to]` with
 * `inclusive`), keyed by the start of their UTC hour.
 */
export async function countSlices(
  organizationId: string,
  from: Date,
  to: Date,
  opts: { inclusive?: boolean } = {},
): Promise<Map<number, SliceCounts>> {
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
  const upper = opts.inclusive ? sql`<=` : sql`<`;
  const result = await db.execute<{
    hour: string | Date;
    simulator: boolean;
    recipients: string;
    bounces: string;
    complaints: string;
  }>(sql`
    select
      date_trunc('hour', ${email.createdAt}, 'UTC') as hour,
      ${emailRecipient.address} like ${`%@${SIMULATOR_DOMAIN}`} as simulator,
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
      and ${email.createdAt} >= ${from.toISOString()}::timestamptz
      and ${email.createdAt} ${upper} ${to.toISOString()}::timestamptz
      and ${environment.mode} = 'live'
      and ${emailRecipient.status} not in ('queued', 'suppressed', 'failed', 'canceled')
    group by 1, 2
  `);
  const slices = new Map<number, SliceCounts>();
  for (const row of result.rows) {
    const hour = new Date(row.hour).getTime();
    const slice = slices.get(hour) ?? zero();
    const [recipients, bounces, complaints] = [row.recipients, row.bounces, row.complaints].map(
      Number,
    ) as [number, number, number];
    if (row.simulator) {
      slice.simulatorRecipients += recipients;
      slice.simulatorBounces += bounces;
      slice.simulatorComplaints += complaints;
    } else {
      slice.recipients += recipients;
      slice.bounces += bounces;
      slice.complaints += complaints;
    }
    slices.set(hour, slice);
  }
  return slices;
}

async function countLive(
  organizationId: string,
  from: Date,
  to: Date,
  opts: { inclusive?: boolean } = {},
): Promise<SliceCounts> {
  const total = zero();
  for (const slice of (await countSlices(organizationId, from, to, opts)).values()) {
    add(total, slice);
  }
  return total;
}

/**
 * Sum of the rollups of the hours in `[from, to)` (both on hour boundaries, closed), recounting
 * hours that are missing or invalidated. A recount stores its result only if no event bumped the
 * hour meanwhile (the revision is read before counting); otherwise the next evaluation recounts.
 */
async function countRolledUp(organizationId: string, from: number, to: number) {
  const thisOrganization = eq(emailReputationRollup.organizationId, organizationId);
  await db
    .delete(emailReputationRollup)
    .where(
      and(
        thisOrganization,
        lt(emailReputationRollup.bucketStart, new Date(Date.now() - ROLLUP_RETENTION_MS)),
      ),
    );
  const hours: number[] = [];
  for (let hour = from; hour < to; hour += HOUR) hours.push(hour);
  await db
    .insert(emailReputationRollup)
    .values(hours.map((hour) => ({ organizationId, bucketStart: new Date(hour) })))
    .onConflictDoNothing();
  const rows = await db
    .select()
    .from(emailReputationRollup)
    .where(
      and(
        thisOrganization,
        gte(emailReputationRollup.bucketStart, new Date(from)),
        lt(emailReputationRollup.bucketStart, new Date(to)),
      ),
    );

  const total = zero();
  const stale = new Map<number, number>();
  for (const row of rows) {
    if (row.computedRevision === row.revision) add(total, row);
    else stale.set(row.bucketStart.getTime(), row.revision);
  }
  if (stale.size === 0) return total;

  // Recount each contiguous run of stale hours with one query.
  const recounted = new Map<number, SliceCounts>();
  const staleHours = [...stale.keys()].sort((a, b) => a - b);
  for (let index = 0; index < staleHours.length; ) {
    const start = staleHours[index] as number;
    let end = start + HOUR;
    while (staleHours[++index] === end) end += HOUR;
    const slices = await countSlices(organizationId, new Date(start), new Date(end));
    for (let hour = start; hour < end; hour += HOUR) {
      recounted.set(hour, slices.get(hour) ?? zero());
    }
  }

  const values = [...recounted].map(
    ([hour, counts]) =>
      sql`(${new Date(hour).toISOString()}::timestamptz, ${stale.get(hour)}::int,
        ${counts.recipients}::int, ${counts.bounces}::int, ${counts.complaints}::int,
        ${counts.simulatorRecipients}::int, ${counts.simulatorBounces}::int,
        ${counts.simulatorComplaints}::int)`,
  );
  await db.execute(sql`
    update ${emailReputationRollup} set
      recipients = v.recipients,
      bounces = v.bounces,
      complaints = v.complaints,
      simulator_recipients = v.simulator_recipients,
      simulator_bounces = v.simulator_bounces,
      simulator_complaints = v.simulator_complaints,
      computed_revision = v.revision,
      updated_at = now()
    from (values ${sql.join(values, sql`, `)}) as v(
      bucket_start, revision, recipients, bounces, complaints,
      simulator_recipients, simulator_bounces, simulator_complaints
    )
    where ${emailReputationRollup.organizationId} = ${organizationId}
      and ${emailReputationRollup.bucketStart} = v.bucket_start
      and ${emailReputationRollup.revision} = v.revision
  `);
  for (const counts of recounted.values()) add(total, counts);
  return total;
}

/** Recipient counts of the organization's live emails created in `[windowStart, now]`. */
export async function sendingCounts(context: CheckContext): Promise<SendingCounts> {
  const { organizationId, windowStart, now, policy } = context;
  const start = windowStart.getTime();
  const firstHour = ceilHour(start);
  // Capped by the real clock: an hour that hasn't happened yet must never be frozen.
  const closedEnd = floorHour(Math.min(now.getTime(), Date.now()) - ROLLUP_SETTLE_MS);

  const total = zero();
  if (firstHour >= closedEnd) {
    add(total, await countLive(organizationId, windowStart, now, { inclusive: true }));
  } else {
    if (start < firstHour) {
      add(total, await countLive(organizationId, windowStart, new Date(firstHour)));
    }
    add(total, await countRolledUp(organizationId, firstHour, closedEnd));
    add(total, await countLive(organizationId, new Date(closedEnd), now, { inclusive: true }));
  }
  const simulator = policy.countSimulatorRecipients;
  return {
    recipients: total.recipients + (simulator ? total.simulatorRecipients : 0),
    bounces: total.bounces + (simulator ? total.simulatorBounces : 0),
    complaints: total.complaints + (simulator ? total.simulatorComplaints : 0),
  };
}

/**
 * Called in the transaction of an event that changed the counts of a live email (a recipient's
 * status, a permanent bounce, a complaint): invalidates the rollup of the email's hour. Hours that
 * closed only recently are still counted live, and are left alone (no hot row while a just-closed
 * hour's delivery events arrive).
 */
export async function invalidateReputationRollup(
  tx: Executor,
  organizationId: string,
  emailCreatedAt: Date,
  now: Date = new Date(),
): Promise<void> {
  const bucket = floorHour(emailCreatedAt.getTime());
  if (bucket + HOUR > now.getTime() - ROLLUP_INVALIDATE_AFTER_MS) return;
  if (bucket < now.getTime() - ROLLUP_RETENTION_MS) return;
  await tx
    .insert(emailReputationRollup)
    .values({ organizationId, bucketStart: new Date(bucket), revision: 1 })
    .onConflictDoUpdate({
      target: [emailReputationRollup.organizationId, emailReputationRollup.bucketStart],
      set: { revision: sql`${emailReputationRollup.revision} + 1` },
    });
}

/**
 * Both rate checks, sharing one count per evaluation (the guard evaluates its checks for one
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
