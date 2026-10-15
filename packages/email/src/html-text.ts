/**
 * The plain-text alternative COSS generates for a send that has only `html`: an HTML-only message
 * scores worse with spam filters, and some clients and screen readers prefer text. It is built
 * for the provider's copy at dispatch (the stored email keeps what the customer sent) from the
 * original HTML, so links point at their real targets rather than click redirects.
 */
import { type DefaultTreeAdapterTypes, parse } from "parse5";

type Element = DefaultTreeAdapterTypes.Element;
type ParentNode = DefaultTreeAdapterTypes.ParentNode;

// Never rendered as text in a mail client.
const SKIPPED = new Set([
  "head",
  "title",
  "script",
  "style",
  "template",
  "noscript",
  "svg",
  "math",
]);
// Separated from what follows by a blank line.
const PARAGRAPHS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
  "dl",
  "figure",
  "hr",
]);
// Rendered on their own line. Email layouts nest tables deeply, so tables only break lines.
const LINES = new Set([
  "address",
  "article",
  "aside",
  "caption",
  "center",
  "dd",
  "details",
  "div",
  "dt",
  "fieldset",
  "figcaption",
  "footer",
  "form",
  "header",
  "legend",
  "li",
  "main",
  "nav",
  "section",
  "summary",
  "table",
  "tr",
]);

const HIDDEN_STYLE = /(?:^|;)\s*display\s*:\s*none\b/i;
// Invisible characters used as spacers (preheader padding, soft hyphens).
const INVISIBLE = /\u00ad|\u034f|\u200b|\u2060|\ufeff/g;
// Runs of whitespace and the zero-width non-joiners that pad preheaders between spaces; a run
// without whitespace is kept (a non-joiner between letters is meaningful in some scripts).
const WHITESPACE = /(?:\s|\u200c)+/g;

function attribute(element: Element, name: string): string | undefined {
  return element.attrs.find((attr) => attr.name === name && !attr.namespace)?.value;
}

function hidden(element: Element): boolean {
  if (element.attrs.some((attr) => attr.name === "hidden")) return true;
  const style = attribute(element, "style");
  return style !== undefined && HIDDEN_STYLE.test(style);
}

function collapse(text: string): string {
  return text.replace(INVISIBLE, "").replace(WHITESPACE, (run) => (/\s/.test(run) ? " " : run));
}

/** The visible text of an element on one line (a link's label). */
function inlineText(node: ParentNode): string {
  let text = "";
  for (const child of node.childNodes) {
    if (child.nodeName === "#text") text += (child as DefaultTreeAdapterTypes.TextNode).value;
    if (!("tagName" in child) || SKIPPED.has(child.tagName) || hidden(child)) continue;
    if (child.tagName === "img") text += ` ${attribute(child, "alt") ?? ""} `;
    else text += ` ${inlineText(child)} `;
  }
  return collapse(text).trim();
}

/** What a link adds after its label: its `http(s)` URL or `mailto:` address, else nothing. */
function linkTarget(href: string | undefined): string | null {
  const value = href?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^mailto:/i.test(value)) {
    const address = value.slice("mailto:".length).split("?")[0] ?? "";
    try {
      return decodeURIComponent(address) || null;
    } catch {
      return address || null;
    }
  }
  return null;
}

/**
 * Labels that already are the link's destination: the same URL once parsed (host case and an
 * empty path don't matter), or its host and path without the target's scheme (`acme.com` for
 * `https://acme.com/`). Anything else shows the target: `www.`, another scheme or a trailing slash
 * can name a different resource, and a plain-text reader must never lose where a link goes.
 */
function labelShowsTarget(label: string, target: string): boolean {
  if (!/^https?:\/\//i.test(target)) return label.toLowerCase() === target.toLowerCase();
  if (/\s/.test(label)) return false;
  try {
    const expected = new URL(target);
    const scheme = /^[a-z][a-z\d+.-]*:/i.test(label) ? "" : `${expected.protocol}//`;
    return new URL(`${scheme}${label}`).href === expected.href;
  } catch {
    return false;
  }
}

type Prefix = { first: string; rest: string; used: boolean };

/** Accumulates text with collapsed line breaks and per-line prefixes (list markers, quotes). */
class TextWriter {
  out = "";
  #pendingBreaks = 0;
  #pendingSpace = false;
  #atLineStart = true;
  readonly #prefixes: Prefix[] = [];
  preformatted = 0;

  /** Ends the current line; `2` leaves a blank line. Breaks never stack beyond the largest. */
  block(lines: 1 | 2): void {
    if (this.out === "") return;
    this.#pendingBreaks = Math.max(this.#pendingBreaks, lines);
    this.#pendingSpace = false;
  }

  /** A hard line break (`<br>`, a newline in `<pre>`): these do stack. */
  newline(): void {
    if (this.out === "") return;
    this.#pendingBreaks += 1;
    this.#pendingSpace = false;
  }

  /** A space before the next text, unless that starts a line. */
  space(): void {
    this.#pendingSpace = true;
  }

  /** Flowing text: whitespace collapses as a browser would. */
  text(value: string): void {
    const collapsed = collapse(value);
    if (collapsed.startsWith(" ")) this.space();
    const content = collapsed.trim();
    if (content === "") return;
    this.write(content);
    if (collapsed.endsWith(" ")) this.space();
  }

  write(content: string): void {
    if (content === "") return;
    if (this.out !== "" && this.#pendingBreaks > 0) {
      const breaks = this.preformatted > 0 ? this.#pendingBreaks : Math.min(this.#pendingBreaks, 2);
      const blankPrefix = this.#prefixes
        .filter((prefix) => prefix.used)
        .map((prefix) => prefix.rest)
        .join("")
        .trimEnd();
      this.out += `\n${`${blankPrefix}\n`.repeat(breaks - 1)}`;
      this.#atLineStart = true;
    }
    this.#pendingBreaks = 0;
    if (this.#atLineStart) {
      this.out += this.#prefixes
        .map((prefix) => (prefix.used ? prefix.rest : prefix.first))
        .join("");
      for (const prefix of this.#prefixes) prefix.used = true;
    } else if (this.#pendingSpace) {
      this.out += " ";
    }
    this.out += content;
    this.#atLineStart = false;
    this.#pendingSpace = false;
  }

  withPrefix(first: string, rest: string, body: () => void): void {
    this.#prefixes.push({ first, rest, used: false });
    body();
    this.#prefixes.pop();
  }
}

function walk(node: ParentNode, writer: TextWriter, listDepth: number): void {
  let item = 0;
  for (const child of node.childNodes) {
    if (child.nodeName === "#text") {
      const value = (child as DefaultTreeAdapterTypes.TextNode).value;
      if (writer.preformatted === 0) {
        writer.text(value);
        continue;
      }
      const lines = value.replace(INVISIBLE, "").split(/\r?\n/);
      lines.forEach((line, index) => {
        if (index > 0) writer.newline();
        writer.write(line);
      });
      continue;
    }
    if (!("tagName" in child) || SKIPPED.has(child.tagName) || hidden(child)) continue;
    const tag = child.tagName;

    if (tag === "br") {
      writer.newline();
      continue;
    }
    if (tag === "hr") {
      writer.block(2);
      writer.write("---");
      writer.block(2);
      continue;
    }
    if (tag === "img") {
      const alt = collapse(attribute(child, "alt") ?? "").trim();
      if (alt) {
        writer.space();
        writer.write(alt);
        writer.space();
      }
      continue;
    }
    if (tag === "td" || tag === "th") {
      writer.space();
      walk(child, writer, listDepth);
      writer.space();
      continue;
    }
    if (tag === "a") {
      const target = linkTarget(attribute(child, "href"));
      const label = inlineText(child);
      walk(child, writer, listDepth);
      if (target && !label) {
        writer.space();
        writer.write(target);
      } else if (target && !labelShowsTarget(label, target)) {
        writer.space();
        writer.write(`[${target}]`);
      }
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      writer.block(listDepth === 0 ? 2 : 1);
      walk(child, writer, listDepth + 1);
      writer.block(listDepth === 0 ? 2 : 1);
      continue;
    }
    if (tag === "li") {
      const ordered = "tagName" in node && node.tagName === "ol";
      const start = ordered ? Number.parseInt(attribute(node as Element, "start") ?? "1", 10) : 1;
      const marker = ordered ? `${(Number.isNaN(start) ? 1 : start) + item}. ` : "- ";
      item += 1;
      writer.block(1);
      writer.withPrefix(marker, " ".repeat(marker.length), () => walk(child, writer, listDepth));
      writer.block(1);
      continue;
    }
    if (tag === "blockquote") {
      writer.block(2);
      writer.withPrefix("> ", "> ", () => walk(child, writer, listDepth));
      writer.block(2);
      continue;
    }

    const lines = PARAGRAPHS.has(tag) ? 2 : LINES.has(tag) ? 1 : 0;
    if (lines) writer.block(lines);
    if (tag === "pre") writer.preformatted += 1;
    walk(child, writer, listDepth);
    if (tag === "pre") writer.preformatted -= 1;
    if (lines) writer.block(lines);
  }
}

/**
 * The readable text of an HTML email: paragraphs and line breaks kept, lists marked, quotes
 * prefixed with `>`, links followed by their target in brackets, images by their alt text, and
 * hidden content (preheaders, `display:none`) left out. `null` when nothing readable is left.
 */
export function htmlToText(html: string): string | null {
  const writer = new TextWriter();
  try {
    walk(parse(html), writer, 0);
  } catch (error) {
    // Nesting deep enough to exhaust the stack: send the email as it was given, without text.
    if (error instanceof RangeError) return null;
    throw error;
  }
  return writer.out === "" ? null : writer.out;
}
