/**
 * Asynchronous dispatch: `send` stores a message and enqueues one `sms-dispatch` job in the same
 * transaction; the worker runs `dispatch` for it. `dispatch` claims the message before calling the
 * provider, so a job that runs twice never sends it twice.
 */
import type { Transaction } from "@coss/db";
import { inTransaction, type Job, type PgBoss } from "@coss/db/jobs";
import { SmsError } from "./errors.ts";
import type { SmsService } from "./service.ts";

export const SMS_DISPATCH_QUEUE = "sms-dispatch";

export type SmsDispatchJob = { organizationId: string; smsId: string };

/** Where `send` puts messages to dispatch; `delaySeconds` holds the job back (a screening hold). */
export type SmsDispatchQueue = {
  enqueue(tx: Transaction, job: SmsDispatchJob, opts?: { delaySeconds?: number }): Promise<void>;
};

const QUEUE_OPTIONS = {
  // At most one waiting job per message (`singletonKey`): sweep re-enqueues never pile up.
  policy: "short",
  notify: true,
  // Retries only cover errors outside the provider call; a claimed message is never sent again.
  retryLimit: 8,
  retryDelay: 2,
  retryBackoff: true,
  retryDelayMax: 300,
  expireInSeconds: 5 * 60,
} as const;

/** Creates the dispatch queue if it doesn't exist (idempotent). */
export async function ensureSmsDispatchQueue(
  boss: PgBoss,
  name: string = SMS_DISPATCH_QUEUE,
): Promise<void> {
  await boss.createQueue(name, QUEUE_OPTIONS);
}

/** The pg-boss dispatch queue (`name` is only overridden by tests: the test database is shared). */
export function pgBossSmsDispatchQueue(boss: PgBoss, name = SMS_DISPATCH_QUEUE): SmsDispatchQueue {
  return {
    async enqueue(tx, job, opts) {
      await boss.send(name, job, {
        ...inTransaction(tx),
        singletonKey: job.smsId,
        ...(opts?.delaySeconds ? { startAfter: opts.delaySeconds } : {}),
      });
    },
  };
}

/** Dispatches one job's message. A message that no longer exists has nothing left to do. */
export async function runSmsDispatchJob(
  service: Pick<SmsService, "dispatch">,
  job: Pick<Job<SmsDispatchJob>, "data">,
): Promise<void> {
  try {
    await service.dispatch(job.data);
  } catch (error) {
    if (error instanceof SmsError && error.code === "not_found") return;
    throw error;
  }
}

/** Starts dispatching queued messages in this process; `boss.stop()` waits for in-flight jobs. */
export async function workSmsDispatchQueue(
  boss: PgBoss,
  service: Pick<SmsService, "dispatch">,
  opts: { name?: string; concurrency?: number } = {},
): Promise<void> {
  await boss.work<SmsDispatchJob>(
    opts.name ?? SMS_DISPATCH_QUEUE,
    { batchSize: 1, localConcurrency: opts.concurrency ?? 10, pollingIntervalSeconds: 2 },
    async ([job]) => {
      if (job) await runSmsDispatchJob(service, job);
    },
  );
}
