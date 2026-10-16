/**
 * Instruments an email's HTML for open/click tracking. The document is parsed only to locate
 * `<a href>` attributes and `</body>`; edits are spliced into the original string so the rest of
 * the markup reaches the recipient byte for byte (email HTML is fragile, re-serializing it is not).
 */
import { type DefaultTreeAdapterTypes, parse } from "parse5";

/** Anchors with this attribute keep their link; the attribute itself is removed. */
export const NO_TRACK_ATTRIBUTE = "data-coss-no-track";

const TRACKABLE_URL = /^https?:\/\//i;
// Merge tags left for another system to fill in (Handlebars/Liquid/Mailchimp): rewriting them
// would freeze the placeholder.
const TEMPLATE_SYNTAX = /\{\{|\{%|\*\||%%/;

/** Bounds stored links and the maximum click-event/webhook fanout for one message. */
export const MAX_TRACKED_LINKS = 100;

export type TrackedLink = { position: number; url: string };

export type InstrumentOptions = {
  /** Origin (and optional path prefix) the `/t/*` routes are served under, without a trailing slash. */
  baseUrl: string;
  token: string;
  opens: boolean;
  clicks: boolean;
};

export function openPixelUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/t/o/${token}`;
}

export function clickUrl(baseUrl: string, token: string, position: number): string {
  return `${baseUrl}/t/c/${token}/${position}`;
}

/** The one-click unsubscribe URL (RFC 8058) of an email's `List-Unsubscribe` header. */
export function unsubscribeUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/t/u/${token}`;
}

type Edit = { start: number; end: number; text: string };
type Element = DefaultTreeAdapterTypes.Element;
type ParentNode = DefaultTreeAdapterTypes.ParentNode;

function* elements(node: ParentNode): Generator<Element> {
  for (const child of node.childNodes) {
    if (!("tagName" in child)) continue;
    yield child;
    yield* elements(child);
    if (child.tagName === "template") {
      yield* elements((child as DefaultTreeAdapterTypes.Template).content);
    }
  }
}

/**
 * Rewrites trackable links to coss.com's click redirect (in document order, numbered from 0) and adds
 * the open pixel before `</body>` (or at the end). Returns the links so their targets can be
 * stored: the redirect only ever sends a recipient to a stored URL.
 */
export function instrumentHtml(
  html: string,
  opts: InstrumentOptions,
): { html: string; links: TrackedLink[] } {
  if (!opts.opens && !opts.clicks) return { html, links: [] };
  const document = parse(html, { sourceCodeLocationInfo: true });
  const edits: Edit[] = [];
  const links: TrackedLink[] = [];
  const seenAttributes = new Set<string>();
  let bodyEnd: number | null = null;

  for (const element of elements(document)) {
    const location = element.sourceCodeLocation;
    if (element.tagName === "body" && location?.endTag) bodyEnd = location.endTag.startOffset;
    if (!opts.clicks || element.tagName !== "a" || !location?.attrs) continue;
    const noTrack = location.attrs[NO_TRACK_ATTRIBUTE];
    const attributeLocation = noTrack ?? location.attrs.href;
    if (!attributeLocation) continue;
    // parse5 can reconstruct multiple anchors from the same source attribute.
    const range = `${attributeLocation.startOffset}:${attributeLocation.endOffset}`;
    if (seenAttributes.has(range)) continue;
    seenAttributes.add(range);
    if (noTrack) {
      edits.push({ start: noTrack.startOffset, end: noTrack.endOffset, text: "" });
      continue;
    }
    const href = element.attrs.find((attr) => attr.name === "href" && !attr.namespace);
    const hrefLocation = location.attrs.href;
    if (!href || !hrefLocation) continue;
    const url = href.value.trim();
    if (!TRACKABLE_URL.test(url) || TEMPLATE_SYNTAX.test(url)) continue;
    if (links.length >= MAX_TRACKED_LINKS) continue;
    const position = links.length;
    links.push({ position, url });
    edits.push({
      start: hrefLocation.startOffset,
      end: hrefLocation.endOffset,
      text: `href="${clickUrl(opts.baseUrl, opts.token, position)}"`,
    });
  }

  if (opts.opens) {
    const at = bodyEnd ?? html.length;
    edits.push({
      start: at,
      end: at,
      text:
        `<img src="${openPixelUrl(opts.baseUrl, opts.token)}" width="1" height="1" alt="" ` +
        'style="display:block;width:1px;height:1px;border:0;" />',
    });
  }

  // Apply back to front so earlier offsets stay valid.
  edits.sort((a, b) => b.start - a.start);
  let out = html;
  for (const edit of edits) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  return { html: out, links };
}
