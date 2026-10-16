import "server-only";
import { createUsageGate } from "@coss/billing";
import type { UsageGate } from "@coss/billing/gate";
import { systemOrganizationId } from "./billing";
import { emailRuntime } from "./email-runtime";

// Kept across dev HMR re-evaluations, like the other runtimes.
const globalForBroadcasts = globalThis as unknown as {
  __cossUsageGate?: Promise<UsageGate>;
};

/** Free's allowance, as the API and the worker apply it: what pauses and cancels give back. */
export function usageGate(): Promise<UsageGate> {
  globalForBroadcasts.__cossUsageGate ??= systemOrganizationId().then((id) =>
    createUsageGate({ systemOrganizationId: id }),
  );
  return globalForBroadcasts.__cossUsageGate;
}

/** The live provider's name: live broadcasts must come from a domain it verified. */
export function liveProviderName(): string {
  return emailRuntime().liveProvider.name;
}
