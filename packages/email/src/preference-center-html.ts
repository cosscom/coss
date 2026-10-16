/**
 * The preference center's pages: plain HTML forms, no JavaScript and no images (the CSP allows
 * only the inline style carrying `nonce`). Every customer- or recipient-supplied string is
 * escaped. Pure functions, rendered by the API's `/t/u/*` routes.
 */
import { escapeHtml } from "./marketing-footer.ts";
import { maskAddress, type PreferenceContext } from "./preferences.ts";

const STYLE = `
  :root { color-scheme: light dark; --fg: #111; --muted: #6b7280; --line: #e5e7eb; --bg: #fff; --button: #111; --button-fg: #fff; }
  @media (prefers-color-scheme: dark) { :root { --fg: #f3f4f6; --muted: #9ca3af; --line: #374151; --bg: #111827; --button: #f3f4f6; --button-fg: #111; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, -apple-system, sans-serif; }
  main { max-width: 32rem; margin: 0 auto; padding: 3rem 1.25rem; }
  h1 { font-size: 1.375rem; margin: 0 0 .25rem; }
  p { margin: .5rem 0; }
  .muted { color: var(--muted); font-size: .875rem; }
  fieldset { border: 0; padding: 0; margin: 1.5rem 0; }
  label { display: flex; gap: .75rem; align-items: flex-start; padding: .75rem 0; border-top: 1px solid var(--line); cursor: pointer; }
  label:first-of-type { border-top: 0; }
  input[type=checkbox] { margin-top: .25rem; width: 1rem; height: 1rem; }
  .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.5rem; }
  button { font: inherit; padding: .5rem 1rem; border-radius: .5rem; border: 1px solid var(--button); background: var(--button); color: var(--button-fg); cursor: pointer; }
  button.secondary { background: transparent; color: var(--fg); border-color: var(--line); }
  .notice { padding: .75rem 1rem; border: 1px solid var(--line); border-radius: .5rem; margin: 1rem 0; }
  a { color: inherit; }
`;

function page(input: { title: string; nonce: string; body: string }): string {
  return (
    "<!doctype html>" +
    '<html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex">' +
    `<title>${escapeHtml(input.title)}</title>` +
    `<style nonce="${escapeHtml(input.nonce)}">${STYLE}</style>` +
    `</head><body><main>${input.body}</main></body></html>`
  );
}

/** The preference form: overall consent, then each topic. */
export function preferencesPage(input: {
  context: PreferenceContext;
  action: string;
  nonce: string;
  saved?: boolean;
}): string {
  const { context } = input;
  const name = escapeHtml(context.displayName);
  const subscribed = context.status === null || context.status === "subscribed";
  const topics = context.topics
    .map(
      (topic) =>
        `<label><input type="checkbox" name="topic:${escapeHtml(topic.key)}" value="on"${topic.subscribed ? " checked" : ""}>` +
        `<span><strong>${escapeHtml(topic.name)}</strong>` +
        (topic.description
          ? `<br><span class="muted">${escapeHtml(topic.description)}</span>`
          : "") +
        "</span></label>",
    )
    .join("");
  return page({
    title: `Email preferences — ${context.displayName}`,
    nonce: input.nonce,
    body:
      `<h1>Email preferences</h1>` +
      `<p class="muted">For ${escapeHtml(maskAddress(context.address))}, from ${name}.</p>` +
      (input.saved ? '<p class="notice" role="status">Your preferences are saved.</p>' : "") +
      `<form method="post" action="${escapeHtml(input.action)}">` +
      // Unchecked boxes send nothing: this lists what the form showed.
      `<input type="hidden" name="topics" value="${escapeHtml(context.topics.map((topic) => topic.key).join(","))}">` +
      "<fieldset>" +
      `<label><input type="checkbox" name="subscribed" value="on"${subscribed ? " checked" : ""}>` +
      `<span><strong>Emails from ${name}</strong><br><span class="muted">Uncheck to stop all marketing email. Account and order emails still arrive.</span></span></label>` +
      topics +
      "</fieldset>" +
      '<div class="actions">' +
      '<button type="submit" name="action" value="save">Save preferences</button>' +
      '<button type="submit" name="action" value="unsubscribe_all" class="secondary">Unsubscribe from all</button>' +
      "</div></form>",
  });
}

/** The body's unsubscribe link: one button (a GET never changes anything), then the outcome. */
export function unsubscribePage(input: {
  context: PreferenceContext;
  action: string;
  preferencesUrl: string;
  nonce: string;
  done: boolean;
}): string {
  const { context } = input;
  const name = escapeHtml(context.displayName);
  const what = context.linkTopic
    ? `“${escapeHtml(context.linkTopic.name)}” emails from ${name}`
    : `marketing email from ${name}`;
  const body = input.done
    ? `<h1>You're unsubscribed</h1><p>You'll no longer receive ${what}.</p>` +
      `<p class="muted"><a href="${escapeHtml(input.preferencesUrl)}">Manage your email preferences</a></p>`
    : `<h1>Unsubscribe</h1><p>Stop receiving ${what} at ${escapeHtml(maskAddress(context.address))}?</p>` +
      `<form method="post" action="${escapeHtml(input.action)}"><div class="actions">` +
      '<button type="submit">Unsubscribe</button>' +
      `</div></form><p class="muted"><a href="${escapeHtml(input.preferencesUrl)}">Manage your email preferences instead</a></p>`;
  return page({ title: `Unsubscribe — ${context.displayName}`, nonce: input.nonce, body });
}

/** A double opt-in confirmation: one button, then the outcome. */
export function confirmationPage(input: {
  displayName: string;
  action: string;
  nonce: string;
  state: "ask" | "confirmed" | "already_confirmed" | "invalid";
}): string {
  const name = escapeHtml(input.displayName);
  const body =
    input.state === "ask"
      ? `<h1>Confirm your subscription</h1><p>Confirm that you want to receive email from ${name}.</p>` +
        `<form method="post" action="${escapeHtml(input.action)}"><div class="actions"><button type="submit">Confirm subscription</button></div></form>`
      : input.state === "invalid"
        ? "<h1>This link no longer works</h1><p>It expired, was already used, or the subscription changed since. Sign up again to get a new one.</p>"
        : `<h1>You're subscribed</h1><p>Thanks for confirming: you'll receive email from ${name}.</p>`;
  return page({ title: `Confirm subscription — ${input.displayName}`, nonce: input.nonce, body });
}
