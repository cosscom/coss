/**
 * Sign's emails (invitations, reminders, signed copies) through the email product. From the
 * environment's `email_from` in its own environment when it has one (its sending, its suppression
 * list and history); else, and when that address stops being verified, from coss.com's sender in
 * coss.com's notification environment as "<requester> via coss.com". Sandbox environments always
 * send in their own environment (the fake provider: nothing is delivered).
 */
import { EmailError, type EmailService, type SendEnvironment } from "@coss/email";
import { SendEmailRequest } from "@coss/email/schemas";
import type { SignEmail, SignMailer } from "@coss/sign";

const SANDBOX_FALLBACK_ADDRESS = "sign@coss.com";

/** The bare address of `Name <address>` or `address`. */
export function addressOf(from: string): string {
  return /<([^>]+)>/.exec(from)?.[1]?.trim() ?? from.trim();
}

function named(name: string, address: string): string {
  return `"${name.replace(/["\\\r\n]/g, "").slice(0, 120)}" <${address}>`;
}

export function signMailer(opts: {
  service: Pick<EmailService, "send">;
  /** coss.com's sender; `null`: live emails without `email_from` wait until it is configured. */
  fallback: { environment: SendEnvironment; address: string } | null;
}): SignMailer {
  async function send(email: SignEmail, environment: SendEnvironment, from: string) {
    const params = SendEmailRequest.parse({
      from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
      category: "signature_request",
      // Signing links are secrets: never through click redirects, never kept after sending.
      tracking: { opens: false, clicks: false, unsubscribe: false },
      ...(email.attachment
        ? {
            attachments: [
              {
                filename: email.attachment.filename,
                content: Buffer.from(email.attachment.content).toString("base64"),
                content_type: "application/pdf",
              },
            ],
          }
        : {}),
    });
    try {
      await opts.service.send({
        environment,
        apiKeyId: null,
        params,
        idempotencyKey: email.idempotencyKey,
        idempotencyRetentionMs: Number.POSITIVE_INFINITY,
        discardBody: true,
      });
    } catch (error) {
      // Already sent (the same key with a fresh link in it).
      if (error instanceof EmailError && error.code === "idempotency_key_reused") return;
      throw error;
    }
  }

  async function viaCoss(email: SignEmail): Promise<void> {
    if (!opts.fallback) {
      throw new Error(
        "Sign can't email live signers without the environment's email_from: coss.com's sender " +
          "(NOTIFICATIONS_ENVIRONMENT_ID with SIGN_NOTIFICATIONS_FROM or NOTIFICATIONS_FROM) isn't set.",
      );
    }
    await send(
      email,
      opts.fallback.environment,
      named(`${email.requester} via coss.com`, opts.fallback.address),
    );
  }

  return {
    async send(email) {
      if (email.environment.mode === "sandbox") {
        const address = email.from ?? opts.fallback?.address ?? SANDBOX_FALLBACK_ADDRESS;
        const name = email.from ? email.requester : `${email.requester} via coss.com`;
        await send(email, email.environment, named(name, address));
        return;
      }
      if (!email.from) return viaCoss(email);
      try {
        await send(email, email.environment, named(email.requester, email.from));
      } catch (error) {
        // The address stopped being verified: the signer still gets the email, from coss.com.
        if (error instanceof EmailError && error.code === "domain_not_verified") {
          return viaCoss({ ...email, idempotencyKey: `${email.idempotencyKey}:coss` });
        }
        throw error;
      }
    },
  };
}
