/** The worker's jobs, wired to their dependencies. Each run returns true when it found a full batch. */
import { type AuthEmailDeps, runDueAuthEmails } from "@coss/auth/emails";
import {
  type BillingNotifier,
  type BillingProviders,
  expirePendingUpgrades,
  finalizeOrganizationBilling,
  type ProviderName,
  reconcileOpenInvoices,
  runBillingUsageChecks,
  runContractRenewals,
  runDueBillingCollection,
  runDueBillingEvents,
  runDueBillingNotifications,
  runDueBillingPeriods,
  runDueBillingSync,
  runDueCreditNoteSync,
} from "@coss/billing";
import {
  type DomainDeps,
  type EmailDispatchQueue,
  type EmailService,
  emailReputationChecks,
  recheckDueDomains,
  recheckDueTrackingDomains,
  releaseOrganizationEmailResources,
  sweepStaleClaims,
  sweepUnclaimedEmails,
} from "@coss/email";
import { dropExpiredLogPartitions, ensureLogPartitions } from "@coss/logs";
import {
  type ReputationNotificationDeps,
  runDueReputationEvaluations,
  runDueReputationNotifications,
} from "@coss/reputation";
import { refreshDueDatasets } from "@coss/risk";
import { contentScreeningCheck } from "@coss/screening";
import { runDueOrganizationDeletions } from "@coss/tenancy/deletion";
import {
  runDueLogDrainDeliveries,
  runDueWebhookDeliveries,
  type WebhookDeliveryDeps,
} from "@coss/webhooks";
import type { Loop } from "./loop.ts";
import { startLoop } from "./loop.ts";
import { runRetention } from "./retention.ts";
import { pollSesEvents, type SqsApi } from "./sqs.ts";

const WEBHOOK_BATCH = 20;
const LOG_DRAIN_BATCH = 10;
const DOMAIN_BATCH = 25;
const SWEEP_BATCH = 100;
const REPUTATION_BATCH = 50;
const NOTIFICATION_BATCH = 20;
const AUTH_EMAIL_BATCH = 20;
const SCHEDULED_BATCH = 50;
const DELETION_BATCH = 5;
const RETENTION_BATCH = 1000;
const BILLING_BATCH = 20;
// Content screening only records verdicts; this check turns them into warnings and suspensions.
const REPUTATION_CHECKS = [...emailReputationChecks, contentScreeningCheck];

export type WorkerDeps = {
  /** Emails are dispatched by pg-boss workers; this loop only re-enqueues lost jobs. */
  dispatchQueue: EmailDispatchQueue;
  domains: DomainDeps;
  /** Dispatches scheduled emails. */
  email: Pick<EmailService, "dispatchDue">;
  /** Also delivers log drain batches (same signing keys and sender). */
  webhooks: WebhookDeliveryDeps;
  /** How long environment logs are kept (`LOG_RETENTION_DAYS`). */
  logRetentionDays: number;
  /** Downloads IPinfo Lite for risk's ASN and country signals (`IPINFO_TOKEN`); `null`: skipped. */
  ipinfoToken: string | null;
  /** Sends account emails (verification, password resets, invitations); `null`: held. */
  authEmails: AuthEmailDeps | null;
  /** Emails owners and admins about warnings and suspensions; `null`: held until configured. */
  notifications: ReputationNotificationDeps | null;
  /** COSS's own organization (`NOTIFICATIONS_ENVIRONMENT_ID`'s): the guard never suspends it. */
  systemOrganizationId: string | null;
  /** Only with `EMAIL_PROVIDER=ses`. */
  sesEvents?: { sqs: SqsApi; tenantPrefix: string };
  /** Billing: closes months, pushes and collects invoices, applies provider events, alerts. */
  billing: {
    providers: BillingProviders;
    defaultProvider: ProviderName;
    dashboardUrl: string;
    /** Billing emails (usage alerts, payment failures); `null`: held until configured. */
    notifier: BillingNotifier | null;
  };
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
      // Environment logs streamed to log drains, in NDJSON batches.
      name: "log-drains",
      intervalMs: 1000,
      run: async () =>
        (await runDueLogDrainDeliveries({ limit: LOG_DRAIN_BATCH }, deps.webhooks)) ===
        LOG_DRAIN_BATCH,
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
          { checks: REPUTATION_CHECKS, systemOrganizationId: deps.systemOrganizationId },
        )) === REPUTATION_BATCH,
    }),
    startLoop({
      // Organization deletions: releases domains and the SES tenant, then deletes the data.
      name: "organization-deletions",
      intervalMs: 10_000,
      run: async () =>
        (await runDueOrganizationDeletions(
          { limit: DELETION_BATCH, signal: deps.signal },
          {
            releaseProviderResources: async (organizationId, assertLease) => {
              await releaseOrganizationEmailResources(organizationId, deps.domains, assertLease);
              // The running month is invoiced (once); the invoice outlives the organization.
              await finalizeOrganizationBilling(organizationId, { assertLease });
            },
          },
        )) === DELETION_BATCH,
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
      // Risk's IP datasets (Tor exits, cloud ranges, IPinfo Lite), each on its own schedule; the
      // API reloads changed ones. A failed download keeps the stored copy.
      name: "risk-datasets",
      intervalMs: 10 * 60_000,
      run: async () => {
        const results = await refreshDueDatasets({ ipinfoToken: deps.ipinfoToken ?? undefined });
        for (const result of results) {
          if (result.status === "updated")
            console.info(`[worker:risk-datasets] updated ${result.name}`);
          if (result.status === "failed") {
            console.error(
              `[worker:risk-datasets] ${result.name}:`,
              new Error(result.error ?? "refresh failed"),
            );
          }
        }
      },
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
  const billing = deps.billing;
  const system = deps.systemOrganizationId;
  loops.push(
    startLoop({
      // Closes ended months into invoices (after the usage settle window), renews contracts,
      // and gives up unpaid upgrades.
      name: "billing-periods",
      intervalMs: 60_000,
      run: async () => {
        const closed = await runDueBillingPeriods({ limit: BILLING_BATCH });
        await runContractRenewals({});
        await expirePendingUpgrades({});
        return closed === BILLING_BATCH;
      },
    }),
    startLoop({
      // Pushes invoices to their provider and collects them; mirrors voids and credit notes.
      name: "billing-sync",
      intervalMs: 5000,
      run: async () => {
        const invoices = await runDueBillingSync(
          { limit: BILLING_BATCH },
          {
            providers: billing.providers,
            dashboardUrl: billing.dashboardUrl,
            systemOrganizationId: system,
          },
        );
        await runDueCreditNoteSync({ limit: BILLING_BATCH }, { providers: billing.providers });
        return invoices === BILLING_BATCH;
      },
    }),
    startLoop({
      // Dunning: retries failed charges, reminds about invoices with net terms, and holds live
      // sending once an invoice is overdue past the account's grace days.
      name: "billing-collection",
      intervalMs: 60_000,
      run: async () =>
        (await runDueBillingCollection({ limit: BILLING_BATCH, systemOrganizationId: system })) ===
        BILLING_BATCH,
    }),
    startLoop({
      // Payment provider events (Stripe webhooks) stored by the dashboard.
      name: "billing-events",
      intervalMs: 2000,
      run: async () =>
        (await runDueBillingEvents(
          { limit: BILLING_BATCH },
          { providers: billing.providers, systemOrganizationId: system },
        )) === BILLING_BATCH,
    }),
    startLoop({
      // Usage alerts and spend-limit holds.
      name: "billing-usage",
      intervalMs: 5 * 60_000,
      run: async () => {
        await runBillingUsageChecks({ systemOrganizationId: system });
      },
    }),
    startLoop({
      // Open invoices the provider may have settled without us hearing (a lost webhook).
      name: "billing-reconcile",
      intervalMs: 60 * 60_000,
      run: async () => {
        await reconcileOpenInvoices(
          {},
          { providers: billing.providers, systemOrganizationId: system },
        );
      },
    }),
  );
  const billingNotifier = billing.notifier;
  if (billingNotifier) {
    loops.push(
      startLoop({
        name: "billing-notifications",
        intervalMs: 5000,
        run: async () =>
          (await runDueBillingNotifications(
            { limit: NOTIFICATION_BATCH },
            { notifier: billingNotifier, dashboardUrl: billing.dashboardUrl },
          )) === NOTIFICATION_BATCH,
      }),
    );
  }
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
