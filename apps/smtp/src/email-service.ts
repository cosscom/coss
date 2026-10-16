import type { UsageGate } from "@coss/billing/gate";
import { createEmailService, type EmailProvider, type EmailService } from "@coss/email";
import type { EmailDispatchQueue } from "@coss/email/dispatch";

/**
 * The relay's email service: the API's, minus nothing. `trackingBaseUrl` is required here because
 * a send with tracking on (a rule or `X-Coss-Tracking`) is refused without one.
 */
export function createRelayEmailService(options: {
  liveProvider: EmailProvider;
  sandboxProvider: EmailProvider;
  queue: EmailDispatchQueue;
  trackingBaseUrl: string;
  trackingDomainProvider?: string;
  billing?: UsageGate;
}): EmailService {
  return createEmailService(options);
}
