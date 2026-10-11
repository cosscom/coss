/** The worker's jobs, wired to their dependencies. Each run returns true when it found a full batch. */
import {
  type DomainDeps,
  emailReputationChecks,
  recheckDueDomains,
  sweepStaleClaims,
} from "@coss/email";
import { runDueReputationEvaluations } from "@coss/reputation";
import { runDueWebhookDeliveries, type WebhookDeliveryDeps } from "@coss/webhooks";
import type { Loop } from "./loop.ts";
import { startLoop } from "./loop.ts";
import { pollSesEvents, type SqsApi } from "./sqs.ts";

const WEBHOOK_BATCH = 20;
const DOMAIN_BATCH = 25;
const SWEEP_BATCH = 100;
const REPUTATION_BATCH = 50;

export type WorkerDeps = {
  domains: DomainDeps;
  webhooks: WebhookDeliveryDeps;
  /** Only with `EMAIL_PROVIDER=ses`. */
  sesEvents?: { sqs: SqsApi; tenantPrefix: string; signal: AbortSignal };
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
      run: async () =>
        (await recheckDueDomains({ limit: DOMAIN_BATCH }, deps.domains)) === DOMAIN_BATCH,
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
          { checks: emailReputationChecks },
        )) === REPUTATION_BATCH,
    }),
  ];
  const ses = deps.sesEvents;
  if (ses) {
    loops.push(
      startLoop({
        name: "ses-events",
        // Each receive long-polls for up to 20 seconds, so poll again right away.
        intervalMs: 0,
        run: async () => {
          if (ses.signal.aborted) return;
          try {
            await pollSesEvents(ses.sqs, { tenantPrefix: ses.tenantPrefix, signal: ses.signal });
          } catch (error) {
            // Shutting down aborts the long poll; that's not a failure.
            if (!ses.signal.aborted) throw error;
          }
        },
      }),
    );
  }
  return loops;
}
