/**
 * Type-level checks (typecheck only, never run): the integrations describe their host libraries
 * structurally so the SDK has no dependency on them, and these assignments fail the typecheck
 * when that description drifts from the libraries' real types.
 */
import type { Provider } from "@auth/core/providers";
import * as opentelemetry from "@opentelemetry/api";
import { betterAuth } from "better-auth";
import { emailOTP, magicLink, organization } from "better-auth/plugins";
import nodemailer, { type SendMailOptions } from "nodemailer";
import Coss, { CossProvider } from "../src/authjs.ts";
import { cossEmail } from "../src/better-auth.ts";
import type { OpenTelemetryApi } from "../src/core/tracing.ts";
import { type CossSentMessageInfo, cossTransport, withCoss } from "../src/nodemailer.ts";

// OpenTelemetry: the real API fits what the SDK's tracing describes of it.
export const otel: OpenTelemetryApi = opentelemetry;

// Nodemailer: the transport plugs into createTransport, and sendMail resolves with our info.
const transporter = nodemailer.createTransport(cossTransport({ apiKey: "coss_test_x" }));
const mail: SendMailOptions = { from: "a@example.com", to: "b@example.com", subject: "Hi" };
export const sent: Promise<CossSentMessageInfo> = transporter.sendMail(
  withCoss(mail, { category: "receipts", tags: [{ name: "plan", value: "pro" }] }),
);

// Better Auth: every callback fits the option it is documented for.
const email = cossEmail({
  from: "Acme <auth@acme.com>",
  invitationUrl: ({ id }) => `https://acme.com/accept/${id}`,
});
export const auth: unknown = betterAuth({
  emailVerification: { sendVerificationEmail: email.sendVerificationEmail },
  emailAndPassword: { enabled: true, sendResetPassword: email.sendResetPassword },
  user: {
    changeEmail: { enabled: true, sendChangeEmailConfirmation: email.sendChangeEmailConfirmation },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: email.sendDeleteAccountVerification,
    },
  },
  plugins: [
    magicLink({ sendMagicLink: email.sendMagicLink }),
    emailOTP({ sendVerificationOTP: email.sendVerificationOTP }),
    organization({ sendInvitationEmail: email.sendInvitationEmail }),
  ],
});

// Auth.js: the provider (called, or passed uncalled for AUTH_COSS_KEY) is an Auth.js provider.
export const providers: Provider[] = [Coss({ from: "Acme <auth@acme.com>" }), CossProvider];
