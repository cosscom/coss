/** Shapes message text for a classifier: bounded size (cost, context limit) and tidy whitespace. */

/** About 2k tokens: plenty to judge a message, and caps the cost of one screening. */
export const MAX_TEXT_CHARS = 8000;
export const MAX_LINKS = 50;

/** Collapses whitespace and truncates to `max` characters. */
export function prepareText(text: string, max: number = MAX_TEXT_CHARS): string {
  const collapsed = text
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ ?\r?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return collapsed.length > max ? `${collapsed.slice(0, max)}…` : collapsed;
}

/** Distinct `http(s)` link targets, at most `MAX_LINKS`, as `host/path` without query strings. */
export function prepareLinks(urls: Iterable<string>): string[] {
  const links = new Set<string>();
  for (const raw of urls) {
    if (links.size >= MAX_LINKS) break;
    let url: URL;
    try {
      url = new URL(raw.trim());
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    // Query strings carry per-recipient tokens: noise for a classifier, and not ours to share.
    links.add(`${url.host}${url.pathname === "/" ? "" : url.pathname}`);
  }
  return [...links];
}

/** Every `http(s)://…` URL in plain text (SMS bodies, text parts of emails). */
export function urlsInText(text: string): string[] {
  return text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
}
