/**
 * The emails Forms sends: the owner's notification of an accepted submission and the
 * submitter's verification link. Plain, small HTML (every value escaped: it is the submitter's
 * text) and a text part. Sent through an injected `FormMailer`, so `@coss/forms` never imports
 * the email product; contacts go through an injected `FormContactSink` the same way.
 */
import type { FormFieldDefinition } from "@coss/db/schema";
import { escapeHtml } from "./pages.ts";

export type FormEmailEnvironment = {
  organizationId: string;
  projectId: string;
  environmentId: string;
  mode: "live" | "sandbox";
};

/** One email. The mailer picks the sender (see `FormMailer`). */
export type FormEmail = {
  environment: FormEmailEnvironment;
  /** The form's sender; `null`: coss.com's, as "<sender name> via coss.com". */
  from: string | null;
  senderName: string;
  to: string[];
  replyTo: string | null;
  subject: string;
  text: string;
  html: string;
  /** Stable per message: retries never send twice. */
  idempotencyKey: string;
  /**
   * Never from coss.com's sender (the submitter's verification: an address someone typed into a
   * public form must not get coss.com's mail). Without a verified `from` it waits.
   */
  customerOnly: boolean;
  category: "form_notification" | "form_verification";
};

/**
 * Sends Forms' emails: from `from` in the form's environment when it has one (sandbox
 * environments always in their own, whose emails are never delivered), else from coss.com's
 * sender. Throws when it can't send yet (retried later).
 */
export interface FormMailer {
  send(email: FormEmail): Promise<{ replayed: boolean }>;
}

/** A submitter becoming a contact (with the environment's double opt-in, unless the form says). */
export type FormContactInput = {
  environment: FormEmailEnvironment;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** Contact property key → the submitted text (coerced to the property's type by the sink). */
  properties: Record<string, string>;
  audienceIds: string[];
  topics: string[];
  /** `null`: the environment's marketing settings decide. */
  doubleOptIn: boolean | null;
};

export interface FormContactSink {
  /** Creates or updates the contact; throws to be retried. */
  add(input: FormContactInput): Promise<void>;
}

/** One line of plain text, as subjects must be. */
export function oneLine(value: string, max = 150): string {
  // Control, formatting and line/paragraph separator characters: the email product refuses them.
  return value
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function valueText(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

/** The notification of an accepted submission: every field, its files, and a dashboard link. */
export function notificationContent(input: {
  formName: string;
  fields: FormFieldDefinition[] | null;
  data: Record<string, string | string[]>;
  files: { filename: string; size: number }[];
  submissionUrl: string;
}): { subject: string; text: string; html: string } {
  const labels = new Map(input.fields?.map((field) => [field.name, field.label ?? field.name]));
  const rows = Object.entries(input.data).map(([name, value]) => ({
    label: labels.get(name) ?? name,
    value: valueText(value),
  }));
  const subject = oneLine(`New submission to ${input.formName}`);
  const text =
    `New submission to ${input.formName}\n\n` +
    rows.map((row) => `${row.label}:\n${row.value}\n`).join("\n") +
    (input.files.length > 0
      ? `\nFiles:\n${input.files.map((file) => `- ${file.filename}`).join("\n")}\n`
      : "") +
    `\nView it on coss.com: ${input.submissionUrl}\n`;
  const html =
    '<div style="font:15px/1.5 system-ui,-apple-system,sans-serif;color:#111;max-width:36rem">' +
    `<p style="color:#6b7280;margin:0 0 1rem">New submission to <strong>${escapeHtml(input.formName)}</strong></p>` +
    '<table style="border-collapse:collapse;width:100%">' +
    rows
      .map(
        (row) =>
          '<tr><td style="padding:.5rem 0;border-top:1px solid #e5e7eb;vertical-align:top">' +
          `<div style="color:#6b7280;font-size:13px">${escapeHtml(row.label)}</div>` +
          `<div style="white-space:pre-wrap">${escapeHtml(row.value)}</div></td></tr>`,
      )
      .join("") +
    "</table>" +
    (input.files.length > 0
      ? `<p style="margin:1rem 0 0">Files: ${input.files.map((file) => escapeHtml(file.filename)).join(", ")}</p>`
      : "") +
    `<p style="margin:1.5rem 0 0"><a href="${escapeHtml(input.submissionUrl)}">View it on coss.com</a></p>` +
    "</div>";
  return { subject, text, html };
}

/** The submitter's verification email: one link, which confirms nothing until they click. */
export function verificationContent(input: { formName: string; confirmUrl: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const name = oneLine(input.formName, 100);
  return {
    subject: oneLine(`Confirm your email for ${name}`),
    text:
      `Confirm your email address to send your submission to ${name}:\n\n${input.confirmUrl}\n\n` +
      "The link works for 7 days. If you didn't fill in this form, ignore this email.\n",
    html:
      '<div style="font:15px/1.5 system-ui,-apple-system,sans-serif;color:#111;max-width:32rem">' +
      `<p>Confirm your email address to send your submission to <strong>${escapeHtml(name)}</strong>.</p>` +
      `<p><a href="${escapeHtml(input.confirmUrl)}" style="display:inline-block;padding:.5rem 1rem;border-radius:.5rem;background:#111;color:#fff;text-decoration:none">Confirm my email</a></p>` +
      '<p style="color:#6b7280;font-size:13px">The link works for 7 days. If you didn\'t fill in this form, ignore this email.</p>' +
      "</div>",
  };
}
