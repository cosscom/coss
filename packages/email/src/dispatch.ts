/**
 * Asynchronous dispatch: `send` stores an email and enqueues one `email-dispatch` job in the same
 * transaction; the worker runs `dispatch` for it. `dispatch` claims the email before calling the
 * provider, so a job that runs twice (a retry, an expired lease, a sweep re-enqueue) never sends
 * the email twice.
 */
import type { Transaction } from "@coss/db";
import { inTransaction, type Job, type PgBoss } from "@coss/db/jobs";
import { EmailError } from "./errors.ts";
import type { EmailService } from "./service.ts";

export const EMAIL_DISPATCH_QUEUE = "email-dispatch";

export type EmailDispatchJob = { organizationId: string; emailId: string };

/** Where `send` puts emails to dispatch. Enqueuing joins the transaction that stores the email. */
export type EmailDispatchQueue = {
  enqueue(tx: Transaction, job: EmailDispatchJob): Promise<void>;
};

const QUEUE_OPTIONS = {
  // At most one waiting job per email (`singletonKey`): sweep re-enqueues never pile up.
  policy: "short",
  // Wakes the worker on commit instead of on its next poll.
  notify: true,
  // Retries only cover errors outside the provider call (e.g. the database); provider errors
  // are a recorded `failed` outcome, and a send that was claimed is never retried.
  retryLimit: 8,
  retryDelay: 2,
  retryBackoff: true,
  retryDelayMax: 300,
  // A dispatch is one provider call; a job active longer than this is presumed dead and retried
  // (the claim makes that a no-op, and the stale-claim sweep resolves the email).
  expireInSeconds: 5 * 60,
} as const;

/** Creates the dispatch queue if it doesn't exist (idempotent; existing settings are kept). */
export async function ensureEmailDispatchQueue(
  boss: PgBoss,
  name: string = EMAIL_DISPATCH_QUEUE,
): Promise<void> {
  await boss.createQueue(name, QUEUE_OPTIONS);
}

/** The pg-boss dispatch queue. `name` is only overridden by tests (the test database is shared). */
export function pgBossDispatchQueue(
  boss: PgBoss,
  name: string = EMAIL_DISPATCH_QUEUE,
): EmailDispatchQueue {
  return {
    async enqueue(tx, job) {
      await boss.send(name, job, { ...inTransaction(tx), singletonKey: job.emailId });
    },
  };
}

/** Dispatches one job's email. An email that no longer exists has nothing left to do. */
export async function runDispatchJob(
  service: Pick<EmailService, "dispatch">,
  job: Pick<Job<EmailDispatchJob>, "data">,
): Promise<void> {
  try {
    await service.dispatch(job.data);
  } catch (error) {
    if (error instanceof EmailError && error.code === "not_found") return;
    throw error;
  }
}

/** Starts dispatching queued emails in this process; `boss.stop()` waits for in-flight jobs. */
export async function workEmailDispatchQueue(
  boss: PgBoss,
  service: Pick<EmailService, "dispatch">,
  opts: { name?: string; concurrency?: number } = {},
): Promise<void> {
  await boss.work<EmailDispatchJob>(
    opts.name ?? EMAIL_DISPATCH_QUEUE,
    { batchSize: 1, localConcurrency: opts.concurrency ?? 10, pollingIntervalSeconds: 2 },
    async ([job]) => {
      if (job) await runDispatchJob(service, job);
    },
  );
}
