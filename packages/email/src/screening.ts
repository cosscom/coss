/**
 * What content screening sees of an email: sender, subject, readable text and link targets. The
 * HTML is parsed for its text and `href`s; nothing here changes what is sent.
 */
import { prepareLinks, prepareText, type ScreeningContent, urlsInText } from "@coss/screening";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import type { EmailRow } from "./read.ts";

type ParentNode = DefaultTreeAdapterTypes.ParentNode;

// Never rendered as text in a mail client.
const SKIPPED = new Set(["head", "script", "style", "template", "noscript"]);
// Rendered on their own line.
const BLOCKS = new Set([
  "address",
  "article",
  "blockquote",
  "br",
  "dd",
  "div",
  "dl",
  "dt",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);

/** Visible text and `href` values of an HTML document. */
export function htmlTextAndLinks(html: string): { text: string; hrefs: string[] } {
  const parts: string[] = [];
  const hrefs: string[] = [];
  const walk = (node: ParentNode) => {
    for (const child of node.childNodes) {
      if (child.nodeName === "#text") {
        parts.push((child as DefaultTreeAdapterTypes.TextNode).value);
        continue;
      }
      if (!("tagName" in child) || SKIPPED.has(child.tagName)) continue;
      if (child.tagName === "a") {
        const href = child.attrs.find((attr) => attr.name === "href")?.value;
        if (href) hrefs.push(href);
      }
      if (child.tagName === "img") {
        // Image-only emails carry their message in alt text.
        const alt = child.attrs.find((attr) => attr.name === "alt")?.value;
        if (alt) parts.push(` ${alt} `);
      }
      const block = BLOCKS.has(child.tagName);
      if (block) parts.push("\n");
      walk(child);
      if (block) parts.push("\n");
    }
  };
  walk(parse(html));
  return { text: parts.join(""), hrefs };
}

/** The screening view of an email row: plain text preferred over HTML when both exist. */
export function emailScreeningContent(
  row: Pick<EmailRow, "from" | "subject" | "html" | "text">,
): ScreeningContent {
  const html = row.html ? htmlTextAndLinks(row.html) : { text: "", hrefs: [] };
  const body = row.text?.trim() ? row.text : html.text;
  return {
    kind: "email",
    from: row.from,
    subject: prepareText(row.subject, 500),
    text: prepareText(body),
    links: prepareLinks([...html.hrefs, ...urlsInText(row.text ?? "")]),
  };
}
