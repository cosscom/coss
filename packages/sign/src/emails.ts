/**
 * The emails coss.com sends email signers: the invitation, reminders and their signed copy. Plain,
 * small HTML (escaped: titles and messages are the requester's text) and a text part. Sent through
 * an injected `SignMailer`, so `@coss/sign` never imports the email product.
 */

/** One signing email. The mailer picks the sender (see `SignMailer`). */
export type SignEmail = {
  environment: {
    organizationId: string;
    projectId: string;
    environmentId: string;
    mode: "live" | "sandbox";
  };
  /** The environment's `email_from`; `null`: coss.com's sender. */
  from: string | null;
  /** The requester as signers know them (the settings' display name, else the organization's). */
  requester: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Stable per message: retries never send twice. */
  idempotencyKey: string;
  attachment?: { filename: string; content: Uint8Array } | null;
};

/**
 * Sends signing emails. From `from` in the request's environment when it has one (or the
 * environment is a sandbox, whose emails are never delivered), else from coss.com's sender as
 * "<requester> via coss.com". Throws when it can't send yet (retried later).
 */
export interface SignMailer {
  send(email: SignEmail): Promise<void>;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type Content = { subject: string; text: string; html: string };

function layout(input: {
  heading: string;
  paragraphs: string[];
  quote?: string | null;
  button?: { label: string; url: string } | null;
  footer: string;
}): string {
  const paragraph = (text: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:#111827">${escapeHtml(text)}</p>`;
  const quote = input.quote
    ? `<div style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #e5e7eb;color:#374151;font-size:14px;line-height:21px;white-space:pre-wrap">${escapeHtml(input.quote)}</div>`
    : "";
  const button = input.button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(input.button.url)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#111827;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(input.button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px"><h1 style="margin:0 0 16px;font-size:20px;line-height:28px;color:#111827">${escapeHtml(input.heading)}</h1>${input.paragraphs.map(paragraph).join("")}${quote}${button}<p style="margin:24px 0 0;font-size:12px;line-height:18px;color:#6b7280">${escapeHtml(input.footer)}</p></div></body></html>`;
}

const FOOTER =
  "This link is for you alone: anyone with it can sign as you. If you weren't expecting this, you can ignore it.";

/** Includes the requester's own message only when they send it themselves (`from` set). */
export function invitationEmail(input: {
  requester: string;
  title: string;
  message: string | null;
  url: string;
  expiresAt: Date | null;
}): Content {
  const subject = `${input.requester} sent you "${input.title}" to sign`;
  const expiry = input.expiresAt
    ? `Please sign before ${input.expiresAt.toUTCString().replace(/ GMT$/, " UTC")}.`
    : null;
  const paragraphs = [`${input.requester} asks you to review and sign "${input.title}".`];
  if (expiry) paragraphs.push(expiry);
  return {
    subject,
    text: [
      ...paragraphs,
      ...(input.message ? ["", input.message, ""] : []),
      `Review and sign: ${input.url}`,
      "",
      FOOTER,
    ].join("\n"),
    html: layout({
      heading: "You have a document to sign",
      paragraphs,
      quote: input.message,
      button: { label: "Review and sign", url: input.url },
      footer: FOOTER,
    }),
  };
}

export function reminderEmail(input: {
  requester: string;
  title: string;
  url: string;
  expiresAt: Date | null;
}): Content {
  const paragraphs = [
    `${input.requester} is still waiting for your signature on "${input.title}".`,
  ];
  if (input.expiresAt) {
    paragraphs.push(`It expires on ${input.expiresAt.toUTCString().replace(/ GMT$/, " UTC")}.`);
  }
  return {
    subject: `Reminder: "${input.title}" is waiting for your signature`,
    text: [...paragraphs, "", `Review and sign: ${input.url}`, "", FOOTER].join("\n"),
    html: layout({
      heading: "A reminder to sign",
      paragraphs,
      button: { label: "Review and sign", url: input.url },
      footer: FOOTER,
    }),
  };
}

export function signedCopyEmail(input: {
  requester: string;
  title: string;
  url: string;
  attached: boolean;
}): Content {
  const paragraphs = [
    `Everyone has signed "${input.title}".`,
    input.attached
      ? "Your copy of the signed documents is attached, with a certificate of completion. Keep it for your records."
      : "Download your copy of the signed documents, with a certificate of completion, and keep it for your records.",
  ];
  const footer = `${input.requester} used coss.com Sign. The PDF is sealed: any change to it shows in PDF viewers.`;
  return {
    subject: `Signed: "${input.title}"`,
    text: [...paragraphs, "", `Download: ${input.url}`, "", footer].join("\n"),
    html: layout({
      heading: "Your signed copy",
      paragraphs,
      button: { label: "Download the signed copy", url: input.url },
      footer,
    }),
  };
}
