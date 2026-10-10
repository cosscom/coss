import type { EmailService } from "@coss/email";
import { createEmailRuntime, type EmailEnv, emailRuntimeConfig } from "@coss/email/runtime";

/** The email service for the validated env; sandbox environments always use the fake provider. */
export function createDefaultEmailService(
  env: EmailEnv = { EMAIL_PROVIDER: "fake" },
): EmailService {
  return createEmailRuntime(emailRuntimeConfig(env)).emailService;
}
