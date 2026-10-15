import "server-only";
import { createUsageGate } from "@coss/billing";
import { startJobBoss } from "@coss/db/jobs";
import { createEmailService, type EmailService } from "@coss/email";
import { ensureEmailDispatchQueue, pgBossDispatchQueue } from "@coss/email/dispatch";
import { env } from "@/env";
import { emailRuntime } from "./email-runtime";

// One service (and pg-boss producer, one connection) per server process, kept across dev HMR
// re-evaluations. Started on the first send: most dashboard processes never send.
const globalForSend = globalThis as unknown as { __cossEmailService?: Promise<EmailService> };

/**
 * Sends from the dashboard (template test sends), exactly as the API's: stored with their dispatch
 * job in one transaction and handed to the provider by the worker.
 */
export function emailService(): Promise<EmailService> {
  globalForSend.__cossEmailService ??= (async () => {
    const jobs = await startJobBoss();
    await ensureEmailDispatchQueue(jobs);
    const runtime = emailRuntime();
    return createEmailService({
      liveProvider: runtime.liveProvider,
      sandboxProvider: runtime.sandboxProvider,
      queue: pgBossDispatchQueue(jobs),
      // Only checked when a send turns tracking on; the worker builds the links at dispatch.
      trackingBaseUrl: env.API_PUBLIC_URL,
      billing: createUsageGate(),
    });
  })().catch((error: unknown) => {
    // Try again on the next send rather than keeping a failed start.
    globalForSend.__cossEmailService = undefined;
    throw error;
  });
  return globalForSend.__cossEmailService;
}
