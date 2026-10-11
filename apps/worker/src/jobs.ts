/** The worker's jobs, wired to their dependencies. Each run returns true when it found a full batch. */
import { type AuthEmailDeps, runDueAuthEmails } from "@coss/auth/emails";
import {
  type DomainDeps,
  type EmailDispatchQueue,
  type EmailService,
  emailReputationChecks,
  recheckDueDomains,
  recheckDueTrackingDomains,
  sweepStaleClaims,
  sweepUnclaimedEmails,
} from "@coss/email";
import { dropExpiredLogPartitions, ensureLogPartitions } from "@coss/logs";
import {
  type ReputationNotificationDeps,
  runDueReputationEvaluations,
  runDueReputationNotifications,
} from "@coss/reputation";
import { contentScreeningCheck } from "@coss/screening";
import { runDueWebhookDeliveries, type WebhookDeliveryDeps } from "@coss/webhooks";
import type { Loop } from "./loop.ts";
import { startLoop } from "./loop.ts";
import { runRetention } from "./retention.ts";
import { pollSesEvents, type SqsApi } from "./sqs.ts";

const WEBHOOK_BATCH = 20;
const DOMAIN_BATCH = 25;
const SWEEP_BATCH = 100;
const REPUTATION_BATCH = 50;
const NOTIFICATION_BATCH = 20;
const AUTH_EMAIL_BATCH = 20;
const SCHEDULED_BATCH = 50;
const RETENTION_BATCH = 1000;
// Content screening only records verdicts; this check turns them into warnings and suspensions.
const REPUTATION_CHECKS = [...emailReputationChecks, contentScreeningCheck];

export type WorkerDeps = {
  /** Emails are dispatched by pg-boss workers; this loop only re-enqueues lost jobs. */
  dispatchQueue: EmailDispatchQueue;
  domains: DomainDeps;
  /** Dispatches scheduled emails. */
  email: Pick<EmailService, "dispatchDue">;
  webhooks: WebhookDeliveryDeps;
  /** How long environment logs are kept (`LOG_RETENTION_DAYS`). */
  logRetentionDays: number;
  /** Sends account emails (verification, password resets, invitations); `null`: held. */
  authEmails: AuthEmailDeps | null;
  /** Emails owners and admins about warnings and suspensions; `null`: held until configured. */
  notifications: ReputationNotificationDeps | null;
  /** Only with `EMAIL_PROVIDER=ses`. */
  sesEvents?: { sqs: SqsApi; tenantPrefix: string };
  /**
   * Aborted on shutdown: ends the SQS long poll and stops long runs between items. Each loop's
   * current item (a webhook attempt, a domain check, a received SQS batch) still finishes.
   */
  signal: AbortSignal;
};

export function startJobs(deps: WorkerDeps): Loop[] {
  const loops = [
    startLoop({
      name: "webhooks",
      intervalMs: 1000,
      run: async () =>
        (await runDueWebhookDeliveries({ limit: WEBHOOK_BATCH }, deps.webhooks)) === WEBHOOK_BATCH,
    }),
    startLoop({
      name: "domains",
      intervalMs: 30_000,
      // Sending domains, then their custom tracking domains.
      run: async () => {
        const opts = { limit: DOMAIN_BATCH, signal: deps.signal };
        const domains = await recheckDueDomains(opts, deps.domains);
        const tracking = await recheckDueTrackingDomains(opts, deps.domains);
        return domains === DOMAIN_BATCH || tracking === DOMAIN_BATCH;
      },
    }),
    startLoop({
      name: "scheduled-emails",
      intervalMs: 5000,
      run: async () =>
        (await deps.email.dispatchDue({ limit: SCHEDULED_BATCH, signal: deps.signal })) ===
        SCHEDULED_BATCH,
    }),
    startLoop({
      name: "stale-claims",
      intervalMs: 60_000,
      run: async () => (await sweepStaleClaims({ limit: SWEEP_BATCH })) === SWEEP_BATCH,
    }),
    startLoop({
      // The reputation guard: re-checks organizations with new bounces or complaints, and
      // suspends live sending on its own when a rate crosses the policy.
      name: "reputation",
      intervalMs: 60_000,
      run: async () =>
        (await runDueReputationEvaluations(
          { limit: REPUTATION_BATCH },
          { checks: REPUTATION_CHECKS },
        )) === REPUTATION_BATCH,
    }),
    startLoop({
      name: "unclaimed",
      intervalMs: 60_000,
      // Busy only while there are more emails to fail (they leave the scan). Requeued emails may
      // stay unclaimed behind a backlog, and rescanning them at once would only spin.
      run: async () =>
        (await sweepUnclaimedEmails(deps.dispatchQueue, { limit: SWEEP_BATCH })).failed ===
        SWEEP_BATCH,
    }),
    startLoop({
      // Deletes data past its published retention (`@coss/retention`); catches up in full batches.
      name: "retention",
      intervalMs: 10 * 60_000,
      run: () => runRetention({ limit: RETENTION_BATCH, signal: deps.signal }),
    }),
    startLoop({
      // Log retention: a week of daily partitions ahead, expired days dropped whole.
      name: "logs",
      intervalMs: 60 * 60_000,
      run: async () => {
        const created = await ensureLogPartitions();
        const dropped = await dropExpiredLogPartitions({ retentionDays: deps.logRetentionDays });
        if (created.length > 0 || dropped.length > 0) {
          console.info(
            `[worker:logs] created ${created.length}, dropped ${dropped.length} log partitions`,
          );
        }
      },
    }),
  ];
  const authEmails = deps.authEmails;
  if (authEmails) {
    loops.push(
      startLoop({
        name: "auth-emails",
        // Someone is waiting for these (a sign-up, a password reset).
        intervalMs: 2000,
        run: async () =>
          (await runDueAuthEmails({ limit: AUTH_EMAIL_BATCH }, authEmails)) === AUTH_EMAIL_BATCH,
      }),
    );
  }
  const notifications = deps.notifications;
  if (notifications) {
    loops.push(
      startLoop({
        name: "reputation-notifications",
        intervalMs: 5000,
        run: async () =>
          (await runDueReputationNotifications({ limit: NOTIFICATION_BATCH }, notifications)) ===
          NOTIFICATION_BATCH,
      }),
    );
  }
  const ses = deps.sesEvents;
  if (ses) {
    loops.push(
      startLoop({
        name: "ses-events",
        // Each receive long-polls for up to 20 seconds, so poll again right away.
        intervalMs: 0,
        run: async () => {
          if (deps.signal.aborted) return;
          try {
            await pollSesEvents(ses.sqs, { tenantPrefix: ses.tenantPrefix, signal: deps.signal });
          } catch (error) {
            // Shutting down aborts the long poll; that's not a failure.
            if (!deps.signal.aborted) throw error;
          }
        },
      }),
    );
  }
  return loops;
}
