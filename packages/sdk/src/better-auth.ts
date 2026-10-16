/**
 * `coss/better-auth`: Better Auth's email callbacks, sent through coss.com.
 *
 * ```ts
 * import { betterAuth } from "better-auth";
 * import { cossEmail } from "coss/better-auth";
 *
 * const email = cossEmail({ from: "Acme <auth@acme.com>", appName: "Acme" });
 *
 * export const auth = betterAuth({
 *   emailVerification: { sendVerificationEmail: email.sendVerificationEmail },
 *   emailAndPassword: { enabled: true, sendResetPassword: email.sendResetPassword },
 * });
 * ```
 *
 * The types here describe only what the callbacks read, so the SDK has no dependency on Better
 * Auth; `test/integration-types.ts` checks them against Better Auth's own.
 */
import { CossSendError, type IntegrationClientOptions, lazyClient } from "./core/integration.ts";
import { escapeHtml, sha256Hex } from "./core/mime.ts";
import type { Email, SendEmailParams } from "./types/email.ts";

export { CossSendError } from "./core/integration.ts";

/** An email's content: what a template returns. */
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** The user Better Auth passes to its callbacks (only the fields the templates read). */
export interface BetterAuthUser {
  email: string;
  name?: string | null;
}

export interface VerificationEmailData {
  user: BetterAuthUser;
  url: string;
  token: string;
}

export interface ResetPasswordData {
  user: BetterAuthUser;
  url: string;
  token: string;
}

export interface ChangeEmailConfirmationData {
  user: BetterAuthUser;
  newEmail: string;
  url: string;
  token: string;
}

export interface DeleteAccountVerificationData {
  user: BetterAuthUser;
  url: string;
  token: string;
}

export interface MagicLinkData {
  email: string;
  url: string;
  token: string;
}

export interface VerificationOtpData {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}

export interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization: { name: string };
  inviter: { user: BetterAuthUser };
}

/** Template data: what Better Auth passed, plus your `appName`. */
type WithApp<T> = T & { appName: string | undefined };

/** One template per email; each returns the subject and both bodies. */
export interface CossEmailTemplates {
  verifyEmail: (data: WithApp<VerificationEmailData>) => EmailContent;
  resetPassword: (data: WithApp<ResetPasswordData>) => EmailContent;
  changeEmailConfirmation: (data: WithApp<ChangeEmailConfirmationData>) => EmailContent;
  deleteAccount: (data: WithApp<DeleteAccountVerificationData>) => EmailContent;
  magicLink: (data: WithApp<MagicLinkData>) => EmailContent;
  verificationOtp: (data: WithApp<VerificationOtpData>) => EmailContent;
  invitation: (data: WithApp<InvitationData & { url: string }>) => EmailContent;
}

export interface CossEmailOptions extends IntegrationClientOptions {
  /** The sender, e.g. `"Acme <auth@acme.com>"`, on a domain verified in coss.com (live keys). */
  from: string;
  /** Your product's name, used by the default templates ("Sign in to Acme"). */
  appName?: string;
  /** Replace any of the default templates. */
  templates?: Partial<CossEmailTemplates>;
  /**
   * The page where an invitee accepts an organization invitation, e.g.
   * `({ id }) => \`https://acme.com/accept-invitation/${id}\``. Better Auth passes no URL to
   * `sendInvitationEmail`, so it needs this.
   */
  invitationUrl?: (data: InvitationData) => string;
  /** Defaults to `"account"`, so suppressions scoped to other categories never block sign-in mail. */
  category?: string;
}

/**
 * Parameters of `send`: `from`, `category` and tracking default to the `cossEmail` options. Like
 * `coss.email.send`, a send has its own content or names a template.
 */
export type CossEmailSendParams = SendEmailParams extends infer Params
  ? Params extends SendEmailParams
    ? Omit<Params, "from"> & { from?: string }
    : never
  : never;

/** The callbacks `cossEmail` returns; pass each to the matching Better Auth option. */
export interface CossEmail {
  /** `emailVerification.sendVerificationEmail` */
  sendVerificationEmail: (data: VerificationEmailData, request?: unknown) => Promise<void>;
  /** `emailAndPassword.sendResetPassword` */
  sendResetPassword: (data: ResetPasswordData, request?: unknown) => Promise<void>;
  /** `user.changeEmail.sendChangeEmailConfirmation` (sent to the current address) */
  sendChangeEmailConfirmation: (
    data: ChangeEmailConfirmationData,
    request?: unknown,
  ) => Promise<void>;
  /** `user.deleteUser.sendDeleteAccountVerification` */
  sendDeleteAccountVerification: (
    data: DeleteAccountVerificationData,
    request?: unknown,
  ) => Promise<void>;
  /** `magicLink({ sendMagicLink })` */
  sendMagicLink: (data: MagicLinkData, ctx?: unknown) => Promise<void>;
  /** `emailOTP({ sendVerificationOTP })` */
  sendVerificationOTP: (data: VerificationOtpData, ctx?: unknown) => Promise<void>;
  /** `organization({ sendInvitationEmail })`; needs the `invitationUrl` option. */
  sendInvitationEmail: (data: InvitationData, request?: unknown) => Promise<void>;
  /** Sends any other email with the same defaults. Throws `CossSendError` on failure. */
  send: (params: CossEmailSendParams, options?: { idempotencyKey?: string }) => Promise<Email>;
}

/**
 * Better Auth email callbacks that send through coss.com. Each throws `CossSendError` when coss.com
 * refuses the email.
 *
 * Auth emails go out with `category: "account"` and open and click tracking off: click tracking
 * would route the secret links through coss.com's redirect.
 */
export function cossEmail(options: CossEmailOptions): CossEmail {
  const client = lazyClient("better-auth", options);
  const templates: CossEmailTemplates = { ...DEFAULT_TEMPLATES, ...options.templates };
  const appName = options.appName?.trim() || undefined;

  async function send(
    params: CossEmailSendParams,
    sendOptions?: { idempotencyKey?: string },
  ): Promise<Email> {
    const result = await client().email.send(
      {
        category: options.category ?? "account",
        tracking: { opens: false, clicks: false },
        ...params,
        from: params.from ?? options.from,
      },
      sendOptions,
    );
    if (result.error) throw new CossSendError(result.error);
    return result.data;
  }

  /**
   * Sends one auth email. A link's token makes a stable idempotency key, so the same callback
   * run twice sends once; the token itself is hashed, never sent as the key.
   */
  async function sendAuthEmail(to: string, content: EmailContent, token?: string): Promise<void> {
    const idempotencyKey = token ? `better-auth_${await sha256Hex(token)}` : undefined;
    await send({ to, ...content }, { idempotencyKey });
  }

  return {
    sendVerificationEmail: (data) =>
      sendAuthEmail(data.user.email, templates.verifyEmail({ ...data, appName }), data.token),
    sendResetPassword: (data) =>
      sendAuthEmail(data.user.email, templates.resetPassword({ ...data, appName }), data.token),
    sendChangeEmailConfirmation: (data) =>
      sendAuthEmail(
        data.user.email,
        templates.changeEmailConfirmation({ ...data, appName }),
        data.token,
      ),
    sendDeleteAccountVerification: (data) =>
      sendAuthEmail(data.user.email, templates.deleteAccount({ ...data, appName }), data.token),
    sendMagicLink: (data) =>
      sendAuthEmail(data.email, templates.magicLink({ ...data, appName }), data.token),
    // Codes may repeat (Better Auth can resend the same one), so no key is derived from them.
    sendVerificationOTP: (data) =>
      sendAuthEmail(data.email, templates.verificationOtp({ ...data, appName })),
    // A resent invitation keeps its id, so no key is derived from it either.
    sendInvitationEmail: async (data) => {
      if (!options.invitationUrl) {
        throw new Error(
          "coss/better-auth: sendInvitationEmail needs the `invitationUrl` option (Better Auth " +
            "passes no URL for invitations).",
        );
      }
      const url = options.invitationUrl(data);
      await sendAuthEmail(data.email, templates.invitation({ ...data, url, appName }));
    },
    send,
  };
}

/** A plain, unbranded email: a heading, a paragraph, a button, and a closing line. */
function layout(parts: {
  heading: string;
  intro: string;
  action?: { label: string; url: string };
  code?: string;
  outro: string;
}): string {
  const action = parts.action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(parts.action.url)}" style="display:inline-block;padding:10px 18px;border-radius:6px;background:#111;color:#fff;text-decoration:none;font-weight:600">${escapeHtml(parts.action.label)}</a></p>
<p style="color:#666;font-size:13px">Or paste this link into your browser:<br><a href="${escapeHtml(parts.action.url)}" style="color:#666;word-break:break-all">${escapeHtml(parts.action.url)}</a></p>`
    : "";
  const code = parts.code
    ? `<p style="margin:24px 0;font-size:28px;letter-spacing:6px;font-weight:600;font-family:ui-monospace,Menlo,monospace">${escapeHtml(parts.code)}</p>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5">
<div style="max-width:480px;margin:0 auto">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(parts.heading)}</h1>
<p>${escapeHtml(parts.intro)}</p>
${action}${code}
<p style="color:#666;font-size:13px">${escapeHtml(parts.outro)}</p>
</div>
</body></html>`;
}

function text(lines: (string | undefined)[]): string {
  return `${lines.filter((line) => line !== undefined).join("\n\n")}\n`;
}

const IGNORE = "If you didn't ask for this, you can ignore this email.";

function on(appName: string | undefined): string {
  return appName ? ` on ${appName}` : "";
}

const OTP_SUBJECTS: Record<VerificationOtpData["type"], string> = {
  "sign-in": "Your sign-in code",
  "email-verification": "Your verification code",
  "forget-password": "Your password reset code",
  "change-email": "Your code to change your email address",
};

/** The default templates: plain, unbranded, with a text version of each. */
export const DEFAULT_TEMPLATES: CossEmailTemplates = {
  verifyEmail: ({ url, appName }) => {
    const intro = `Confirm this is your email address to finish setting up your account${on(appName)}.`;
    return {
      subject: "Verify your email address",
      html: layout({
        heading: "Verify your email address",
        intro,
        action: { label: "Verify email", url },
        outro: IGNORE,
      }),
      text: text([intro, url, IGNORE]),
    };
  },
  resetPassword: ({ url, appName }) => {
    const intro = `Someone asked to reset the password of your account${on(appName)}. Choose a new one with this link.`;
    return {
      subject: "Reset your password",
      html: layout({
        heading: "Reset your password",
        intro,
        action: { label: "Reset password", url },
        outro: `${IGNORE} Your password won't change.`,
      }),
      text: text([intro, url, `${IGNORE} Your password won't change.`]),
    };
  },
  changeEmailConfirmation: ({ newEmail, url, appName }) => {
    const intro = `Someone asked to change the email address of your account${on(appName)} to ${newEmail}. Confirm the change with this link.`;
    return {
      subject: "Confirm your new email address",
      html: layout({
        heading: "Confirm your new email address",
        intro,
        action: { label: "Confirm change", url },
        outro: IGNORE,
      }),
      text: text([intro, url, IGNORE]),
    };
  },
  deleteAccount: ({ url, appName }) => {
    const intro = `Someone asked to delete your account${on(appName)}. This can't be undone. Confirm with this link.`;
    return {
      subject: "Confirm account deletion",
      html: layout({
        heading: "Confirm account deletion",
        intro,
        action: { label: "Delete my account", url },
        outro: `${IGNORE} Your account stays as it is.`,
      }),
      text: text([intro, url, `${IGNORE} Your account stays as it is.`]),
    };
  },
  magicLink: ({ url, appName }) => {
    const heading = appName ? `Sign in to ${appName}` : "Sign in";
    const intro = "Use this link to sign in. It works once and expires soon.";
    return {
      subject: heading,
      html: layout({ heading, intro, action: { label: "Sign in", url }, outro: IGNORE }),
      text: text([intro, url, IGNORE]),
    };
  },
  verificationOtp: ({ otp, type, appName }) => {
    const subject = OTP_SUBJECTS[type] ?? "Your verification code";
    const intro = `Enter this code${on(appName)}. It expires in a few minutes.`;
    return {
      subject,
      html: layout({ heading: subject, intro, code: otp, outro: IGNORE }),
      text: text([intro, otp, IGNORE]),
    };
  },
  invitation: ({ organization, inviter, url, appName }) => {
    const who = inviter.user.name?.trim() || inviter.user.email;
    const subject = `Join ${organization.name}${on(appName)}`;
    const intro = `${who} invited you to join ${organization.name}${on(appName)}.`;
    return {
      subject,
      html: layout({
        heading: subject,
        intro,
        action: { label: "Accept invitation", url },
        outro: "If you weren't expecting this invitation, you can ignore this email.",
      }),
      text: text([
        intro,
        url,
        "If you weren't expecting this invitation, you can ignore this email.",
      ]),
    };
  },
};
