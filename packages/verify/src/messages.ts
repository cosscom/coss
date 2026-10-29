/**
 * The messages codes go out in. Fixed wording (carriers approve coss.com's shared numbers for
 * exactly this), named after the customer's app; never anything else the request says.
 */

/** The SMS text: one GSM-7 segment for any app name up to `MAX_APP_NAME_LENGTH`. */
export function verifySmsText(appName: string, code: string): string {
  return `Your ${appName} verification code is ${code}. Don't share it with anyone.`;
}

export type VerifyEmailContent = { subject: string; text: string; html: string };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function verifyEmailContent(
  appName: string,
  code: string,
  ttlSeconds: number,
): VerifyEmailContent {
  const minutes = Math.max(1, Math.round(ttlSeconds / 60));
  const expiry = `It expires in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  const name = escapeHtml(appName);
  return {
    // Never the code: an email's subject is kept (and goes into its events) after the body is gone.
    subject: `Your ${appName} verification code`,
    text: [
      `Your ${appName} verification code is:`,
      "",
      code,
      "",
      `${expiry} If you didn't ask for it, you can ignore this email.`,
    ].join("\n"),
    html: [
      '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">',
      `<p style="margin:0 0 16px">Your ${name} verification code is:</p>`,
      `<p style="margin:0 0 16px;font-size:32px;font-weight:600;letter-spacing:6px;font-family:ui-monospace,Menlo,monospace">${code}</p>`,
      `<p style="margin:0;color:#555">${expiry} If you didn't ask for it, you can ignore this email.</p>`,
      "</div>",
    ].join(""),
  };
}
