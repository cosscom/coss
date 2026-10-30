/**
 * The pages a submitter's browser sees on the forms host: the thank-you page, the errors of a
 * refused post and the "not accepting submissions" page. Plain HTML, no JavaScript and no images
 * (the CSP allows only the inline style carrying `nonce`); every customer- or submitter-supplied
 * string is escaped. Pure functions, rendered by the API's `/f/*` routes.
 */
import type { FieldError } from "./parse.ts";

export const PAGE_STYLE = `
  :root { color-scheme: light dark; --fg: #111; --muted: #6b7280; --line: #e5e7eb; --bg: #fff; --field: #fff; --button: #111; --button-fg: #fff; --error: #b91c1c; }
  @media (prefers-color-scheme: dark) { :root { --fg: #f3f4f6; --muted: #9ca3af; --line: #374151; --bg: #111827; --field: #1f2937; --button: #f3f4f6; --button-fg: #111; --error: #f87171; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, -apple-system, sans-serif; }
  main { max-width: 34rem; margin: 0 auto; padding: 3rem 1.25rem; }
  h1 { font-size: 1.375rem; margin: 0 0 .25rem; }
  p { margin: .5rem 0; }
  .muted { color: var(--muted); font-size: .875rem; }
  .notice { padding: .75rem 1rem; border: 1px solid var(--line); border-radius: .5rem; margin: 1rem 0; }
  .errors { color: var(--error); padding-left: 1.25rem; }
  .field { display: block; margin: 1.25rem 0; }
  .field > span { display: block; font-weight: 600; margin-bottom: .375rem; }
  .required { color: var(--muted); font-weight: 400; }
  input:not([type=checkbox]):not([type=radio]), select, textarea { width: 100%; font: inherit; color: inherit; padding: .5rem .625rem; border: 1px solid var(--line); border-radius: .5rem; background: var(--field); }
  textarea { min-height: 7rem; resize: vertical; }
  .choice { display: flex; gap: .5rem; align-items: center; font-weight: 400; margin: .25rem 0; }
  .hidden { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
  button { font: inherit; padding: .5rem 1rem; border-radius: .5rem; border: 1px solid var(--button); background: var(--button); color: var(--button-fg); cursor: pointer; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--line); }
  a { color: inherit; }
`;

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** Where people report a form that is misused (phishing, spam). */
export const FORMS_ABUSE_ADDRESS = "abuse@coss.com";

export function page(input: {
  title: string;
  nonce: string;
  body: string;
  /** Extra `<head>` markup (already escaped), e.g. a captcha widget's script. */
  head?: string;
}): string {
  return (
    "<!doctype html>" +
    '<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow">' +
    `<title>${escapeHtml(input.title)}</title>` +
    `<style nonce="${escapeHtml(input.nonce)}">${PAGE_STYLE}</style>` +
    (input.head ?? "") +
    `</head><body><main>${input.body}` +
    '<footer class="muted">Form hosted by coss.com. ' +
    `<a href="mailto:${FORMS_ABUSE_ADDRESS}">Report abuse</a></footer>` +
    "</main></body></html>"
  );
}

/** After a post: accepted (and spam, which must look the same), or waiting for the email link. */
export function thanksPage(input: {
  formName: string;
  successMessage: string | null;
  pending: boolean;
  nonce: string;
}): string {
  const body = input.pending
    ? "<h1>Check your email</h1>" +
      "<p>We sent you a link to confirm your email address. Your submission is sent once you click it.</p>"
    : "<h1>Thank you</h1>" +
      `<p>${escapeHtml(input.successMessage ?? "Your submission was received.")}</p>`;
  return page({ title: input.formName, nonce: input.nonce, body });
}

/** A post that was refused, with what to fix. `back` is where the form was (the Referer). */
export function errorsPage(input: {
  formName: string;
  errors: FieldError[];
  back: string | null;
  nonce: string;
}): string {
  const items = input.errors.map((error) => `<li>${escapeHtml(error.message)}</li>`).join("");
  return page({
    title: input.formName,
    nonce: input.nonce,
    body:
      "<h1>Your submission wasn't sent</h1>" +
      `<ul class="errors">${items}</ul>` +
      (input.back ? `<p><a href="${escapeHtml(input.back)}">Go back to the form</a></p>` : ""),
  });
}

/** Unknown, disabled or refused forms, and posts from sites the form doesn't allow. */
export function unavailablePage(input: { message: string; nonce: string }): string {
  return page({
    title: "Form unavailable",
    nonce: input.nonce,
    body: `<h1>This form isn't available</h1><p>${escapeHtml(input.message)}</p>`,
  });
}

/** The submitter's verification link: one button (a GET changes nothing), then the outcome. */
export function confirmationPage(input: {
  formName: string;
  successMessage: string | null;
  state: "ask" | "confirmed" | "already_confirmed";
  action: string;
  nonce: string;
}): string {
  const name = escapeHtml(input.formName);
  const body =
    input.state === "ask"
      ? `<h1>Confirm your email</h1><p>Confirm your email address to send your submission to ${name}.</p>` +
        `<form method="post" action="${escapeHtml(input.action)}"><p><button type="submit">Confirm and send</button></p></form>`
      : input.state === "confirmed"
        ? `<h1>Thank you</h1><p>${escapeHtml(input.successMessage ?? `Your submission to ${input.formName} was sent.`)}</p>`
        : `<h1>Already confirmed</h1><p>Your submission to ${name} was already sent.</p>`;
  return page({ title: input.formName, nonce: input.nonce, body });
}
