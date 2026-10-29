/**
 * Text helpers of inboxes (client-safe, no imports): the subject key replies are matched by,
 * the subject of a reply, and the new text of a message without the quoted conversation.
 */

/** `Re:`, `Fwd:` and their common translations, repeated or numbered (`Re[2]:`). */
const REPLY_PREFIX =
  /^\s*(?:(?:re|fwd?|aw|wg|sv|vs|antw|r|tr|rif|enc|res)(?:\s*\[\d+\])?\s*:\s*)+/i;

/** The key a reply's subject is matched by: no reply prefixes or extra spaces, lower case. */
export function normalizeSubject(subject: string | null): string {
  return (subject ?? "").replace(REPLY_PREFIX, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** `Re: <subject>`, unless the subject already starts with a reply prefix. */
export function replySubject(subject: string | null): string {
  const value = (subject ?? "").trim();
  if (!value) return "Re:";
  return /^\s*re\s*:/i.test(value) ? value : `Re: ${value}`;
}

/** The line a quoted reply starts with ("On Mon, Oct 10, 2026 at 12:00, Jane <jane@…> wrote:"). */
const ATTRIBUTION = /^(?:on\s.+\swrote|le\s.+\sa\sécrit|am\s.+\sschrieb|el\s.+\sescribió)\s*:\s*$/i;
const ORIGINAL_MESSAGE =
  /^\s*-{2,}\s*(?:original message|forwarded message|ursprüngliche nachricht)/i;
/** Outlook's separator: an underscore rule, or a `From:` line right after a blank one. */
const OUTLOOK_RULE = /^_{10,}\s*$/;
const OUTLOOK_FROM = /^\s*\*?(?:from|von|de)\s*:\*?\s+\S/i;

/**
 * The message's own text: what precedes the quoted conversation (an attribution line, an
 * "Original Message" or Outlook separator, a trailing block of `>` lines) and the `-- ` signature.
 * A heuristic: when nothing is left, the whole text is returned.
 */
export function extractReplyText(text: string | null): string | null {
  if (text === null) return null;
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let end = lines.length;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    const joined = `${line} ${lines[index + 1] ?? ""}`.trim();
    const previousBlank = index === 0 || (lines[index - 1] ?? "").trim() === "";
    if (
      ATTRIBUTION.test(line.trim()) ||
      // Clients wrap long attribution lines once.
      (/^on\s/i.test(line.trim()) && ATTRIBUTION.test(joined) && !line.trim().endsWith(":")) ||
      ORIGINAL_MESSAGE.test(line) ||
      OUTLOOK_RULE.test(line) ||
      (previousBlank && OUTLOOK_FROM.test(line) && index > 0) ||
      line === "-- "
    ) {
      end = index;
      break;
    }
  }
  const kept = lines.slice(0, end);
  // A trailing block of quoted lines (bottom quoting without an attribution).
  while (kept.length > 0) {
    const last = (kept.at(-1) ?? "").trim();
    if (last === "" || last.startsWith(">")) kept.pop();
    else break;
  }
  const result = kept.join("\n").trim();
  return result || text.trim();
}

/** The first characters of a message's own text on one line, for lists. */
export function messagePreview(text: string | null, length = 200): string | null {
  const own = extractReplyText(text);
  if (!own) return null;
  const line = own.replace(/\s+/g, " ").trim();
  return line.length > length ? `${line.slice(0, length - 1)}…` : line;
}
