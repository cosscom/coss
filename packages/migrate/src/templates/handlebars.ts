/**
 * SendGrid templates. Dynamic templates are Handlebars (with SendGrid's helpers); legacy ones are
 * HTML with `<%body%>`/`<%subject%>` and substitution tags whose delimiters each sender chose, so
 * those are imported as they are, for review.
 */
import {
  convertTemplate,
  type Placeholder,
  Registry,
  type SourceNode,
  type SourcePath,
} from "./convert.ts";
import { parseSample } from "./names.ts";
import type { ConvertedTemplate } from "./types.ts";

export type SendGridTemplateInput = {
  generation: "dynamic" | "legacy";
  subject: string | null;
  html: string | null;
  text: string | null;
  /** The version's `test_data` (a JSON string). */
  testData?: unknown;
};

/** SendGrid's unsubscribe substitutions (in any template) and what coss.com puts there. */
const ASM_TAGS: Readonly<Record<string, Placeholder>> = {
  asm_group_unsubscribe_raw_url: "unsubscribe_url",
  asm_global_unsubscribe_raw_url: "unsubscribe_url",
  asm_preferences_raw_url: "preferences_url",
};

/** Dynamic templates' own unsubscribe tags, which print URLs. */
const DYNAMIC_UNSUBSCRIBE: Readonly<Record<string, Placeholder>> = {
  unsubscribe: "unsubscribe_url",
  unsubscribe_preferences: "preferences_url",
};

/** The sender's postal address, which coss.com keeps as one value (`mailing_address`). */
const SENDER_TAGS = new Set([
  "Sender_Name",
  "Sender_Address",
  "Sender_City",
  "Sender_State",
  "Sender_Zip",
]);

/** Text with SendGrid's `<%…%>` substitutions replaced. */
function sendGridText(value: string, legacy: boolean): SourceNode[] {
  const nodes: SourceNode[] = [];
  let last = 0;
  for (const match of value.matchAll(/<%\s*([A-Za-z_]+)\s*%>/g)) {
    const name = match[1] as string;
    const placeholder = ASM_TAGS[name];
    let node: SourceNode | null = null;
    if (placeholder) {
      node = { kind: "placeholder", name: placeholder, link: false, source: match[0] };
    } else if (legacy && (name === "body" || name === "subject")) {
      node = {
        kind: "var",
        path: { segments: [name], up: 0, root: false },
        raw: name === "body",
        source: match[0],
      };
    } else if (name.startsWith("asm_")) {
      node = { kind: "verbatim", source: match[0], message: `SendGrid's ${match[0]}.` };
    }
    if (!node) continue;
    if (match.index > last) nodes.push({ kind: "text", value: value.slice(last, match.index) });
    nodes.push(node);
    last = match.index + match[0].length;
  }
  if (last < value.length) nodes.push({ kind: "text", value: value.slice(last) });
  return nodes;
}

/** A Handlebars path expression, or `null` for one coss.com can't address (`items.[0]`, `@index`). */
export function parseHandlebarsPath(value: string): SourcePath | null {
  let rest = value;
  let up = 0;
  let root = false;
  if (rest.startsWith("@root.") || rest.startsWith("@root/")) {
    root = true;
    rest = rest.slice(6);
  } else if (rest === "@root") {
    return { segments: [], up: 0, root: true };
  }
  while (rest.startsWith("../")) {
    up++;
    rest = rest.slice(3);
  }
  if (rest === ".." && !root) return { segments: [], up: up + 1, root: false };
  if (rest.startsWith("./")) rest = rest.slice(2);
  if (rest === "this" || rest === "." || rest === "") return { segments: [], up, root };
  if (rest.startsWith("this.") || rest.startsWith("this/")) rest = rest.slice(5);
  const segments: string[] = [];
  for (const part of rest.match(/\[[^\]]*\]|[^./]+/g) ?? []) {
    const segment = part.startsWith("[") ? part.slice(1, -1) : part;
    if (/^\d+$/.test(segment)) return null;
    segments.push(segment);
  }
  if (segments.length === 0) return null;
  // `@index`, `@first`, … stay in the path for the converter to refuse with a message.
  return { segments, up, root };
}

type Expression = { tokens: string[]; plain: boolean };

/** Splits a tag's expression into its words, keeping quoted strings and sub-expressions whole. */
function expression(body: string): Expression {
  const tokens: string[] = [];
  let plain = true;
  let i = 0;
  while (i < body.length) {
    const char = body[i] as string;
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    let end = i;
    if (char === '"' || char === "'") {
      end = body.indexOf(char, i + 1);
      end = end === -1 ? body.length : end + 1;
    } else if (char === "(") {
      plain = false;
      let depth = 0;
      for (; end < body.length; end++) {
        if (body[end] === "(") depth++;
        else if (body[end] === ")" && --depth === 0) break;
      }
      end++;
    } else {
      while (end < body.length && !/\s/.test(body[end] as string)) end++;
    }
    const token = body.slice(i, end);
    if (token.includes("=") || token.startsWith("|") || token === "as") plain = false;
    tokens.push(token);
    i = end;
  }
  return { tokens, plain };
}

/** `"default=Customer"` → `Customer`. */
function insertDefault(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const quote = token[0];
  if ((quote !== '"' && quote !== "'") || !token.endsWith(quote)) return undefined;
  const match = /^default=(.*)$/s.exec(token.slice(1, -1));
  return match?.[1];
}

type Tag =
  | { kind: "text"; value: string }
  | { kind: "comment" }
  | { kind: "expression"; body: string; raw: boolean; source: string }
  | { kind: "open"; helper: string; body: string; inverse: boolean; source: string }
  | { kind: "else"; body: string; source: string }
  | { kind: "close"; helper: string; source: string }
  | { kind: "verbatim"; source: string; message: string };

class HandlebarsSyntaxError extends Error {}

function tokenize(source: string): { tags: Tag[]; whitespaceControl: boolean } {
  const tags: Tag[] = [];
  let whitespaceControl = false;
  let text = "";
  let i = 0;
  while (i < source.length) {
    const next = source.indexOf("{{", i);
    if (next === -1) {
      text += source.slice(i);
      break;
    }
    if (next > i && source[next - 1] === "\\") {
      // `\{{` prints `{{`.
      text += `${source.slice(i, next - 1)}{{`;
      i = next + 2;
      continue;
    }
    text += source.slice(i, next);
    if (text) tags.push({ kind: "text", value: text });
    text = "";
    const triple = source.startsWith("{{{", next) && !source.startsWith("{{{{", next);
    if (source.startsWith("{{{{", next)) {
      const end = source.indexOf("}}}}", next);
      if (end === -1) throw new HandlebarsSyntaxError("Unclosed {{{{ tag.");
      tags.push({
        kind: "verbatim",
        source: source.slice(next, end + 4),
        message: "a raw block.",
      });
      i = end + 4;
      continue;
    }
    let bodyStart = next + (triple ? 3 : 2);
    if (source[bodyStart] === "~") {
      whitespaceControl = true;
      bodyStart++;
    }
    if (!triple && source.startsWith("!--", bodyStart)) {
      const pattern = /--~?\}\}/g;
      pattern.lastIndex = bodyStart + 3;
      const close = pattern.exec(source);
      if (!close) throw new HandlebarsSyntaxError("Unclosed comment.");
      tags.push({ kind: "comment" });
      i = close.index + close[0].length;
      continue;
    }
    const closer = triple ? "}}}" : "}}";
    const end = source.indexOf(closer, bodyStart);
    if (end === -1) throw new HandlebarsSyntaxError(`Unclosed ${triple ? "{{{" : "{{"} tag.`);
    let body = source.slice(bodyStart, end);
    if (body.endsWith("~")) {
      whitespaceControl = true;
      body = body.slice(0, -1);
    }
    body = body.trim();
    const tagSource = source.slice(next, end + closer.length);
    i = end + closer.length;
    if (triple) {
      tags.push({ kind: "expression", body, raw: true, source: tagSource });
    } else if (body.startsWith("!")) {
      tags.push({ kind: "comment" });
    } else if (body.startsWith("#>") || body.startsWith("#*") || body.startsWith(">")) {
      tags.push({ kind: "verbatim", source: tagSource, message: "partials." });
    } else if (body.startsWith("#") || (body.startsWith("^") && body.length > 1)) {
      const rest = body.slice(1).trim();
      const helper = rest.split(/\s+/)[0] ?? "";
      tags.push({
        kind: "open",
        helper,
        body: rest.slice(helper.length).trim(),
        inverse: body.startsWith("^"),
        source: tagSource,
      });
    } else if (body === "^" || body === "else" || body.startsWith("else ")) {
      tags.push({
        kind: "else",
        body: body === "^" ? "" : body.slice(4).trim(),
        source: tagSource,
      });
    } else if (body.startsWith("/")) {
      tags.push({ kind: "close", helper: body.slice(1).trim(), source: tagSource });
    } else if (body.startsWith("&")) {
      tags.push({ kind: "expression", body: body.slice(1).trim(), raw: true, source: tagSource });
    } else {
      tags.push({ kind: "expression", body, raw: false, source: tagSource });
    }
  }
  if (text) tags.push({ kind: "text", value: text });
  return { tags, whitespaceControl };
}

const BLOCK_TYPES = new Set(["if", "unless", "each", "with"]);

type Open = {
  node: Extract<SourceNode, { kind: "block" | "verbatimBlock" }>;
  helper: string;
  inOtherwise: boolean;
  /** Opened by `{{else if …}}`: closed together with the block it continues. */
  chained: boolean;
};

class Parser {
  readonly root: SourceNode[] = [];
  readonly stack: Open[] = [];

  constructor(readonly legacy: boolean) {}

  target(): SourceNode[] {
    const top = this.stack.at(-1);
    if (!top) return this.root;
    return top.inOtherwise ? top.node.otherwise : top.node.body;
  }

  /** Not inside a loop or an object, where names are the item's or the object's. */
  atTopLevel(): boolean {
    return this.stack.every(
      (open) =>
        open.node.kind === "verbatimBlock" ||
        open.node.type === "if" ||
        open.node.type === "unless",
    );
  }

  push(node: SourceNode): void {
    this.target().push(node);
  }

  expression(tag: Extract<Tag, { kind: "expression" }>): SourceNode {
    const { tokens, plain } = expression(tag.body);
    const [first = "", ...rest] = tokens;
    if (first === "insert" && rest.length >= 1 && rest.length <= 2) {
      const path = parseHandlebarsPath(rest[0] as string);
      const fallback = insertDefault(rest[1]);
      if (path && (rest.length === 1 || fallback !== undefined)) {
        return { kind: "var", path, raw: tag.raw, fallback, source: tag.source };
      }
    }
    if (!plain || rest.length > 0) {
      return { kind: "verbatim", source: tag.source, message: `the helper "${first}".` };
    }
    const path = parseHandlebarsPath(first);
    if (!path) return { kind: "verbatim", source: tag.source, message: `"${first}".` };
    const name =
      path.segments.length === 1 && path.up === 0 && !path.root ? path.segments[0] : null;
    if (name && Object.hasOwn(DYNAMIC_UNSUBSCRIBE, name) && this.atTopLevel()) {
      return {
        kind: "placeholder",
        name: DYNAMIC_UNSUBSCRIBE[name] as Placeholder,
        link: false,
        source: tag.source,
      };
    }
    if (name && SENDER_TAGS.has(name)) {
      if (name === "Sender_Address") {
        return { kind: "placeholder", name: "mailing_address", link: false, source: tag.source };
      }
      return {
        kind: "note",
        message: `{{${name}}} was removed: coss.com prints the whole postal address as {{{mailing_address}}}.`,
        lossy: true,
      };
    }
    return { kind: "var", path, raw: tag.raw, source: tag.source };
  }

  /**
   * A block for `helper args`, or a verbatim one when coss.com has no such block. A block named
   * after a value (`{{#user}}`) is a Mustache-style section.
   */
  block(helper: string, args: string, open: string): Open["node"] {
    const { tokens, plain } = expression(args);
    const path = tokens.length === 1 && plain ? parseHandlebarsPath(tokens[0] as string) : null;
    const section = args === "" && !BLOCK_TYPES.has(helper) ? parseHandlebarsPath(helper) : null;
    if (section) {
      return {
        kind: "block",
        type: "section",
        path: section,
        body: [],
        otherwise: [],
        open,
        elseSource: null,
        close: "",
      };
    }
    if (BLOCK_TYPES.has(helper) && path) {
      return {
        kind: "block",
        type: helper as "if" | "unless" | "each" | "with",
        path,
        body: [],
        otherwise: [],
        open,
        elseSource: null,
        close: "",
      };
    }
    return {
      kind: "verbatimBlock",
      body: [],
      otherwise: [],
      open,
      elseSource: null,
      close: "",
      message: BLOCK_TYPES.has(helper)
        ? `{{#${helper}}} with ${args.includes("(") ? "a sub-expression" : "these arguments"}.`
        : `the block helper "${helper}".`,
    };
  }

  parse(tags: Tag[]): SourceNode[] {
    for (const tag of tags) {
      switch (tag.kind) {
        case "text":
          for (const node of sendGridText(tag.value, this.legacy)) this.push(node);
          break;
        case "comment":
          break;
        case "verbatim":
          this.push({ kind: "verbatim", source: tag.source, message: tag.message });
          break;
        case "expression":
          this.push(this.expression(tag));
          break;
        case "open": {
          // `{{^x}}` is `{{#unless x}}`.
          const node = tag.inverse
            ? this.block("unless", `${tag.helper} ${tag.body}`.trim(), tag.source)
            : this.block(tag.helper, tag.body, tag.source);
          this.push(node);
          this.stack.push({ node, helper: tag.helper, inOtherwise: false, chained: false });
          break;
        }
        case "else": {
          const top = this.stack.at(-1);
          if (!top || top.inOtherwise) throw new HandlebarsSyntaxError("Unexpected {{else}}.");
          top.inOtherwise = true;
          if (tag.body === "") {
            top.node.elseSource = tag.source;
            break;
          }
          // `{{else if x}}`: a block of its own inside this one's else part.
          top.node.elseSource = "{{else}}";
          const helper = tag.body.split(/\s+/)[0] ?? "";
          const node = this.block(helper, tag.body.slice(helper.length).trim(), `{{#${tag.body}}}`);
          this.push(node);
          this.stack.push({ node, helper, inOtherwise: false, chained: true });
          break;
        }
        case "close": {
          let top = this.stack.pop();
          while (top?.chained) {
            top.node.close = `{{/${top.helper}}}`;
            top = this.stack.pop();
          }
          if (!top || top.helper !== tag.helper) {
            throw new HandlebarsSyntaxError(`Unexpected {{/${tag.helper}}}.`);
          }
          top.node.close = tag.source;
          break;
        }
      }
    }
    if (this.stack.length > 0) {
      throw new HandlebarsSyntaxError(`Unclosed {{#${this.stack.at(-1)?.helper}}}.`);
    }
    return this.root;
  }
}

/** A field that doesn't parse as Handlebars: kept as it was, for the customer to fix. */
function unparsed(source: string, message: string): SourceNode[] {
  return [{ kind: "verbatim", source, message: `the template doesn't parse (${message})` }];
}

function parseField(
  source: string | null,
  generation: "dynamic" | "legacy",
  notes: { message: string; lossy: boolean }[],
): SourceNode[] | null {
  if (source === null || source === "") return null;
  if (generation === "legacy") return sendGridText(source, true);
  try {
    const { tags, whitespaceControl } = tokenize(source);
    if (whitespaceControl) {
      // Spacing can matter (a space left inside a link): the template is reviewed first.
      notes.push({
        message: "Whitespace control (~) was removed: check the spacing around those tags.",
        lossy: true,
      });
    }
    return new Parser(false).parse(tags);
  } catch (error) {
    if (error instanceof HandlebarsSyntaxError) return unparsed(source, error.message);
    throw error;
  }
}

export function convertSendGridTemplate(input: SendGridTemplateInput): ConvertedTemplate {
  const notes: { message: string; lossy: boolean }[] = [];
  if (input.generation === "legacy") {
    notes.push({
      message:
        "A legacy template: its substitution tags (like -name-) can't be recognized. Replace them with {{variables}} and declare them.",
      lossy: true,
    });
  }
  const subject = parseField(input.subject, input.generation, notes);
  const html = parseField(input.html, input.generation, notes);
  const text = parseField(input.text, input.generation, notes);
  return convertTemplate({
    subject,
    html,
    text,
    registry: new Registry(input.generation === "dynamic" ? parseSample(input.testData) : null),
    dialect: { walksUp: false },
    notes: [...new Map(notes.map((note) => [note.message, note])).values()],
  });
}
