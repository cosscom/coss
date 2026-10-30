/** Test helpers: a Verify service on fake SMS and email channels, and reading sent codes. */
import type { RiskDeps } from "@coss/risk";
import { testRiskDeps } from "@coss/risk/testing";
import type { SmsService } from "@coss/sms";
import { dispatchingSmsService, type FakeSmsProvider } from "@coss/sms/testing";
import { verifyCodeKey } from "./codes.ts";
import {
  createVerifyService,
  type SharedSmsSender,
  type VerifyEmailSender,
  type VerifyService,
  type VerifyServiceOptions,
} from "./service.ts";

export const TEST_VERIFY_CODE_KEY: Uint8Array = verifyCodeKey(
  new TextEncoder().encode("coss-verify-test-code-key-0123456789abcdef"),
);

export type SentVerifyEmail = Parameters<VerifyEmailSender>[0];

/** Records emails instead of sending them (every one "sent" from the settings' sender, or coss.com's). */
export function fakeVerifyEmailSender(opts: { suppressed?: (to: string) => boolean } = {}) {
  const sent: SentVerifyEmail[] = [];
  let next = 0;
  const sender: VerifyEmailSender = async (input) => {
    sent.push(input);
    next++;
    return {
      route: input.from || input.environment.mode === "sandbox" ? "email" : "coss_email",
      emailId: `email_test${next}`,
      suppressed: opts.suppressed?.(input.to) ?? false,
    };
  };
  return Object.assign(sender, { sent });
}

/** The digits of the code in a message's text. */
export function codeIn(text: string): string {
  const match = /\b(\d{4,10})\b/.exec(text);
  if (!match?.[1]) throw new Error(`No code in "${text}".`);
  return match[1];
}

export type TestVerify = VerifyService & {
  sms: SmsService & { provider: FakeSmsProvider };
  emails: ReturnType<typeof fakeVerifyEmailSender>;
  risk: RiskDeps;
  /** The code of the last SMS sent to `to` (the fake provider keeps the text). */
  lastSmsCode(to: string): string;
  lastEmailCode(to: string): string;
};

/** A service whose SMS are dispatched at once by the fake provider. */
export function testVerifyService(
  overrides: Partial<VerifyServiceOptions> & { sharedSms?: SharedSmsSender | null } = {},
): TestVerify {
  const sms = dispatchingSmsService();
  const emails = fakeVerifyEmailSender();
  const risk = overrides.risk ?? testRiskDeps();
  const service = createVerifyService({
    risk,
    codeKey: TEST_VERIFY_CODE_KEY,
    sms,
    sendEmail: emails,
    ...overrides,
  });
  return {
    ...service,
    sms,
    emails,
    risk,
    lastSmsCode(to) {
      const message = sms.provider.sent.findLast((sent) => sent.to === to);
      if (!message) throw new Error(`No SMS to ${to}.`);
      return codeIn(message.body);
    },
    lastEmailCode(to) {
      const email = emails.sent.findLast((sent) => sent.to === to);
      if (!email) throw new Error(`No email to ${to}.`);
      return codeIn(email.text);
    },
  };
}
