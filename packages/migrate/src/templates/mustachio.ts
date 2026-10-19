/**
 * Postmark templates: Mustachio (Mustache with `{{#each}}`), optionally inside a layout whose
 * `{{{ @content }}}` the template's body fills. Layouts aren't imported on their own: each template
 * gets its layout inlined. Whether `{{#x}}` loops, enters an object or tests a value depends on the
 * data, which the template's suggested model shows.
 */
import { convertTemplate, Registry, type SourceNode, type SourcePath } from "./convert.ts";
import { parseSample } from "./names.ts";
import type { ConvertedTemplate } from "./types.ts";

export type PostmarkTemplateInput = {
  subject: string | null;
  html: string | null;
  text: string | null;
  /** The template's layout (Postmark's `LayoutTemplate`), inlined at its `{{{ @content }}}`. */
  layout?: { html: string | null; text: string | null } | null;
  /** Postmark's `SuggestedTemplateModel` (from `/templates/validate`). */
  suggestedModel?: unknown;
};

const CONTENT_PLACEHOLDER = /\{\{\{?\s*@content\s*\}?\}\}/;

/** A Mustachio path (`a.b`, `../a`, `.`), or `null` for one coss.com can't address. */
function parsePath(value: string): SourcePath | null {
  let rest = value;
  let up = 0;
  while (rest.startsWith("../")) {
    up++;
    rest = rest.slice(3);
  }
  if (rest === "." || rest === "this") return { segments: [], up, root: false };
  const segments = rest.split(".");
  if (segments.some((segment) => segment === "" || /\s/.test(segment) || /^\d+$/.test(segment))) {
    return null;
  }
  return { segments, up, root: false };
}

class MustachioSyntaxError extends Error {}

type Open = {
  node: Extract<SourceNode, { kind: "block" | "verbatimBlock" }>;
  /** What closes it: `each` for `{{#each x}}`, else the section's name. */
  closer: string;
};

function parse(source: string): SourceNode[] {
  const root: SourceNode[] = [];
  const stack: Open[] = [];
  const target = () => stack.at(-1)?.node.body ?? root;
  let i = 0;
  while (i < source.length) {
    const next = source.indexOf("{{", i);
    if (next === -1) {
      target().push({ kind: "text", value: source.slice(i) });
      break;
    }
    if (next > i) target().push({ kind: "text", value: source.slice(i, next) });
    const triple = source.startsWith("{{{", next);
    const closer = triple ? "}}}" : "}}";
    const end = source.indexOf(closer, next + closer.length);
    if (end === -1) throw new MustachioSyntaxError(`Unclosed ${triple ? "{{{" : "{{"} tag.`);
    const tag = source.slice(next, end + closer.length);
    const body = source.slice(next + (triple ? 3 : 2), end).trim();
    i = end + closer.length;
    if (triple || body.startsWith("&")) {
      const name = triple ? body : body.slice(1).trim();
      if (name === "pm:unsubscribe") {
        // Inside an `href` it's the URL; elsewhere Postmark prints a whole link.
        const before = source.slice(0, next);
        target().push({
          kind: "placeholder",
          name: "unsubscribe_url",
          link: !/href\s*=\s*["']?\s*$/i.test(before),
          source: tag,
        });
        continue;
      }
      const path = parsePath(name);
      target().push(
        path
          ? { kind: "var", path, raw: true, source: tag }
          : { kind: "verbatim", source: tag, message: `"${name}".` },
      );
      continue;
    }
    if (body.startsWith("!")) continue;
    if (body.startsWith(">") || body.startsWith("=")) {
      target().push({
        kind: "verbatim",
        source: tag,
        message: body.startsWith(">") ? "partials." : "changed delimiters.",
      });
      continue;
    }
    if (body.startsWith("#") || body.startsWith("^")) {
      const rest = body.slice(1).trim();
      const each = /^each\s+/.exec(rest);
      const name = each ? rest.slice(each[0].length).trim() : rest;
      const path = parsePath(name);
      const node: Open["node"] = path
        ? {
            kind: "block",
            type: body.startsWith("^") ? "unless" : each ? "each" : "section",
            path,
            body: [],
            otherwise: [],
            open: tag,
            elseSource: null,
            close: "",
          }
        : {
            kind: "verbatimBlock",
            body: [],
            otherwise: [],
            open: tag,
            elseSource: null,
            close: "",
            message: `the section "${rest}".`,
          };
      target().push(node);
      stack.push({ node, closer: each ? "each" : name });
      continue;
    }
    if (body.startsWith("/")) {
      const name = body.slice(1).trim();
      const open = stack.pop();
      if (!open || open.closer !== name) throw new MustachioSyntaxError(`Unexpected ${tag}.`);
      open.node.close = tag;
      continue;
    }
    const path = parsePath(body);
    target().push(
      path
        ? { kind: "var", path, raw: false, source: tag }
        : { kind: "verbatim", source: tag, message: `"${body}".` },
    );
  }
  if (stack.length > 0) throw new MustachioSyntaxError(`Unclosed ${stack.at(-1)?.node.open}.`);
  return root;
}

function parseField(source: string | null): SourceNode[] | null {
  if (source === null || source === "") return null;
  try {
    return parse(source);
  } catch (error) {
    if (!(error instanceof MustachioSyntaxError)) throw error;
    return [{ kind: "verbatim", source, message: `the template doesn't parse (${error.message})` }];
  }
}

/** The template's body inside its layout's. */
function inLayout(
  body: string | null,
  layout: string | null | undefined,
  notes: { message: string; lossy: boolean }[],
): string | null {
  if (body === null || body === "" || !layout) return body;
  if (!CONTENT_PLACEHOLDER.test(layout)) {
    notes.push({ message: "The layout has no {{{ @content }}}: it was left out.", lossy: true });
    return body;
  }
  return layout.replace(CONTENT_PLACEHOLDER, () => body);
}

export function convertPostmarkTemplate(input: PostmarkTemplateInput): ConvertedTemplate {
  const notes: { message: string; lossy: boolean }[] = [];
  const html = inLayout(input.html, input.layout?.html, notes);
  const text = inLayout(input.text, input.layout?.text, notes);
  return convertTemplate({
    subject: parseField(input.subject),
    html: parseField(html),
    text: parseField(text),
    registry: new Registry(parseSample(input.suggestedModel)),
    dialect: { walksUp: true },
    notes: [...new Map(notes.map((note) => [note.message, note])).values()],
  });
}
