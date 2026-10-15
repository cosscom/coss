/**
 * Sends COSS's own emails to its users (reputation notifications, account emails) through the
 * email product itself: from one live environment of COSS's own organization
 * (`NOTIFICATIONS_ENVIRONMENT_ID`), so they get suppression, delivery events and history like any
 * customer email.
 */
import { db, schema } from "@coss/db";
import { eq } from "drizzle-orm";
import { EmailError } from "./errors.ts";
import { emailAddressProblem, SendEmailRequest } from "./schemas.ts";
import type { EmailService, SendEnvironment } from "./service.ts";

const { environment } = schema;

/** The environment notifications are sent from; it must exist and be live. */
export async function notificationEnvironment(environmentId: string): Promise<SendEnvironment> {
  const [row] = await db
    .select({
      organizationId: environment.organizationId,
      projectId: environment.projectId,
      environmentId: environment.id,
      mode: environment.mode,
    })
    .from(environment)
    .where(eq(environment.id, environmentId));
  if (!row) throw new Error(`Notification environment ${environmentId} does not exist.`);
  if (row.mode !== "live") {
    throw new Error(`Notification environment ${environmentId} must be a live environment.`);
  }
  return row;
}

/** One email to one person. Structurally `ReputationNotice` and `AuthEmailMessage`. */
export type Notice = {
  /** Stable per message and recipient: the send's idempotency key, so retries never resend. */
  idempotencyKey: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Structurally `ReputationNotifier` and `AuthEmailSender`. */
export type Notifier = { send(notice: Notice): Promise<void> };

export function emailNotifier(opts: {
  service: Pick<EmailService, "send">;
  environment: SendEnvironment;
  /** An address on a verified domain of the environment's organization. */
  from: string;
  /** The bodies hold secrets (sign-in links): cleared once each email is settled. */
  discardBody?: boolean;
}): Notifier {
  const problem = emailAddressProblem(opts.from);
  if (problem) throw new Error(`Invalid notification sender "${opts.from}": ${problem}`);
  return {
    async send(notice) {
      const params = SendEmailRequest.parse({
        from: opts.from,
        to: [notice.to],
        subject: notice.subject,
        text: notice.text,
        html: notice.html,
        category: "account",
        tracking: { opens: false, clicks: false, unsubscribe: false },
      });
      try {
        // Keep the key across the entire notification lifetime, including crashes after enqueue.
        // Public sends retain their default 24-hour expiry.
        await opts.service.send({
          environment: opts.environment,
          apiKeyId: null,
          params,
          idempotencyKey: notice.idempotencyKey,
          idempotencyRetentionMs: Number.POSITIVE_INFINITY,
          discardBody: opts.discardBody ?? false,
        });
      } catch (error) {
        // Already sent with different content (e.g. the organization was renamed in between).
        if (error instanceof EmailError && error.code === "idempotency_key_reused") return;
        throw error;
      }
    },
  };
}
