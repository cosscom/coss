/**
 * The email template language: a small Mustache-like subset, parsed into a tree, checked against the
 * template's declared variables, and rendered with send-time values. No code runs and output size is
 * bounded, so customers' templates and values are safe to render on coss.com's servers and in the
 * dashboard's live preview. Client-safe (no database, no Node APIs): exported as `@coss/email/templates`.
 *
 *   {{name}}                          a variable (HTML-escaped in `html`, as is in `subject`/`text`)
 *   {{{name}}}                        raw HTML (`html` only)
 *   {{#if name}}…{{else}}…{{/if}}     a conditional
 *   {{#each list}}…{{else}}…{{/each}} a loop; inside, names resolve to the item's fields first
 *   {{! comment }}                    left out of the output
 *   \{{                               a literal `{{`
 */

export const TEMPLATE_FIELDS = ["subject", "html", "text"] as const;
export type TemplateField = (typeof TEMPLATE_FIELDS)[number];

/** Source length (characters) per field. */
export const TEMPLATE_SOURCE_LIMITS: Readonly<Record<TemplateField, number>> = {
  subject: 2_000,
  html: 512 * 1024,
  text: 256 * 1024,
};
/** Rendered length (characters) per field, checked while rendering so loops can't amplify past it. */
export const MAX_RENDERED_LENGTH = 2 * 1024 * 1024;
/**
 * Nodes visited (and loop iterations) while rendering one field: nested `#each` blocks can repeat
 * work that emits nothing, which the output length alone would never stop.
 */
export const MAX_RENDER_STEPS = 1_000_000;
/** Nesting depth of `#if`/`#each` blocks. */
export const MAX_TEMPLATE_DEPTH = 10;
export const MAX_TEMPLATE_VARIABLES = 50;
export const MAX_TEMPLATE_LIST_FIELDS = 20;
export const MAX_TEMPLATE_LIST_ITEMS = 1_000;
/** Serialized size of one send's `variables`. */
export const MAX_TEMPLATE_VARIABLES_BYTES = 64 * 1024;
export const MAX_TEMPLATE_LOCALES = 30;

/** Variable and list field names. `else` is a tag of its own. */
export const TEMPLATE_VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
// `__proto__` can't be a plain object's own key by assignment: its value would vanish.
export const RESERVED_TEMPLATE_NAMES: ReadonlySet<string> = new Set(["else", "this", "__proto__"]);

export const TEMPLATE_SCALAR_TYPES = ["string", "number", "boolean"] as const;
export type TemplateScalarType = (typeof TEMPLATE_SCALAR_TYPES)[number];
export const TEMPLATE_VARIABLE_TYPES = [...TEMPLATE_SCALAR_TYPES, "list"] as const;
export type TemplateVariableType = (typeof TEMPLATE_VARIABLE_TYPES)[number];

export type TemplateListField = { name: string; type: TemplateScalarType; required: boolean };

/** A declared variable (the parsed wire shape of `TemplateVariable`). */
export type TemplateVariable = {
  name: string;
  type: TemplateVariableType;
  required: boolean;
  default?: string | number | boolean | undefined;
  description?: string | undefined;
  /** List items' fields; only (and always) for `list` variables. */
  fields?: TemplateListField[] | undefined;
};

export type TemplateScalar = string | number | boolean;
export type TemplateListItem = Record<string, TemplateScalar>;
export type TemplateValue = TemplateScalar | TemplateListItem[];
export type TemplateValues = Record<string, TemplateValue>;

type Position = { line: number; column: number };

export type TemplateNode =
  | { kind: "text"; value: string }
  | ({ kind: "variable"; name: string; raw: boolean } & Position)
  | ({ kind: "if"; name: string; body: TemplateNode[]; otherwise: TemplateNode[] } & Position)
  | ({ kind: "each"; name: string; body: TemplateNode[]; otherwise: TemplateNode[] } & Position);

/** A problem in a template, at a 1-based line and column of its source. */
export type TemplateProblem = { message: string; line: number; column: number };

export type ParsedTemplate =
  | { ok: true; nodes: TemplateNode[] }
  | { ok: false; problem: TemplateProblem };

class SyntaxProblem extends Error {
  constructor(
    message: string,
    readonly position: Position,
  ) {
    super(message);
  }
}

/**
 * Maps offsets in `source` to lines and columns. The line starts are found once, on first use, so
 * positioning every tag of a large template stays linear.
 */
function positionsIn(source: string): (offset: number) => Position {
  let lineStarts: number[] | null = null;
  return (offset) => {
    if (!lineStarts) {
      lineStarts = [0];
      for (let i = source.indexOf("\n"); i !== -1; i = source.indexOf("\n", i + 1)) {
        lineStarts.push(i + 1);
      }
    }
    // The last line starting at or before `offset`.
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if ((lineStarts[middle] as number) <= offset) low = middle;
      else high = middle - 1;
    }
    return { line: low + 1, column: offset - (lineStarts[low] as number) + 1 };
  };
}

type Tag =
  | { kind: "text"; value: string }
  | { kind: "variable"; name: string; raw: boolean; offset: number }
  | { kind: "open"; block: "if" | "each"; name: string; offset: number }
  | { kind: "else"; offset: number }
  | { kind: "close"; block: "if" | "each"; offset: number };

function tokenize(source: string, positionAt: (offset: number) => Position): Tag[] {
  const tags: Tag[] = [];
  let text = "";
  let i = 0;
  const fail = (message: string, offset: number): never => {
    throw new SyntaxProblem(message, positionAt(offset));
  };
  const name = (value: string, offset: number): string => {
    if (!TEMPLATE_VARIABLE_NAME.test(value) || RESERVED_TEMPLATE_NAMES.has(value)) {
      fail(
        value === ""
          ? "Expected a variable name."
          : `"${value}" is not a valid variable name (letters, digits and _, not starting with a digit).`,
        offset,
      );
    }
    return value;
  };
  while (i < source.length) {
    const next = source.indexOf("{{", i);
    if (next === -1) {
      text += source.slice(i);
      break;
    }
    if (next > i && source.charCodeAt(next - 1) === 92) {
      // `\{{` is a literal `{{`.
      text += `${source.slice(i, next - 1)}{{`;
      i = next + 2;
      continue;
    }
    text += source.slice(i, next);
    i = next;
    const start = i;
    if (text) tags.push({ kind: "text", value: text });
    text = "";
    if (source.startsWith("{{{", i)) {
      const end = source.indexOf("}}}", i + 3);
      if (end === -1) fail("Unclosed {{{ tag: expected }}}.", start);
      tags.push({
        kind: "variable",
        name: name(source.slice(i + 3, end).trim(), start),
        raw: true,
        offset: start,
      });
      i = end + 3;
      continue;
    }
    const end = source.indexOf("}}", i + 2);
    if (end === -1) fail("Unclosed {{ tag: expected }}.", start);
    const body = source.slice(i + 2, end).trim();
    i = end + 2;
    if (body.startsWith("!")) continue;
    if (body === "else") {
      tags.push({ kind: "else", offset: start });
    } else if (body.startsWith("#")) {
      const [keyword = "", target = "", ...rest] = body.slice(1).trim().split(/\s+/);
      if (keyword !== "if" && keyword !== "each") {
        fail(`Unknown block {{#${keyword}}}: use {{#if …}} or {{#each …}}.`, start);
      }
      if (rest.length > 0) fail(`{{#${keyword}}} takes one variable name.`, start);
      tags.push({
        kind: "open",
        block: keyword as "if" | "each",
        name: name(target, start),
        offset: start,
      });
    } else if (body.startsWith("/")) {
      const keyword = body.slice(1).trim();
      if (keyword !== "if" && keyword !== "each") {
        fail(`Unknown closing tag {{/${keyword}}}: use {{/if}} or {{/each}}.`, start);
      }
      tags.push({ kind: "close", block: keyword as "if" | "each", offset: start });
    } else {
      tags.push({ kind: "variable", name: name(body, start), raw: false, offset: start });
    }
  }
  if (text) tags.push({ kind: "text", value: text });
  return tags;
}

/** Parses a template's source. The first syntax problem (with its position) fails the parse. */
export function parseTemplate(source: string): ParsedTemplate {
  try {
    const positionAt = positionsIn(source);
    const tags = tokenize(source, positionAt);
    let index = 0;
    const parseUntil = (depth: number, open: Extract<Tag, { kind: "open" }> | null) => {
      const nodes: TemplateNode[] = [];
      let otherwise: TemplateNode[] | null = null;
      const target = () => otherwise ?? nodes;
      while (index < tags.length) {
        const tag = tags[index++] as Tag;
        switch (tag.kind) {
          case "text":
            target().push(tag);
            break;
          case "variable":
            target().push({
              kind: "variable",
              name: tag.name,
              raw: tag.raw,
              ...positionAt(tag.offset),
            });
            break;
          case "else":
            if (!open) {
              throw new SyntaxProblem(
                "{{else}} outside of an {{#if}} or {{#each}} block.",
                positionAt(tag.offset),
              );
            }
            if (otherwise) {
              throw new SyntaxProblem(
                `A {{#${open.block}}} block can have only one {{else}}.`,
                positionAt(tag.offset),
              );
            }
            otherwise = [];
            break;
          case "open": {
            if (depth >= MAX_TEMPLATE_DEPTH) {
              throw new SyntaxProblem(
                `Blocks can be nested at most ${MAX_TEMPLATE_DEPTH} deep.`,
                positionAt(tag.offset),
              );
            }
            const inner = parseUntil(depth + 1, tag);
            const position = positionAt(tag.offset);
            target().push(
              tag.block === "if"
                ? {
                    kind: "if",
                    name: tag.name,
                    body: inner.nodes,
                    otherwise: inner.otherwise,
                    ...position,
                  }
                : {
                    kind: "each",
                    name: tag.name,
                    body: inner.nodes,
                    otherwise: inner.otherwise,
                    ...position,
                  },
            );
            break;
          }
          case "close":
            if (!open || open.block !== tag.block) {
              throw new SyntaxProblem(
                open
                  ? `Expected {{/${open.block}}} to close {{#${open.block} ${open.name}}}, found {{/${tag.block}}}.`
                  : `{{/${tag.block}}} without a matching {{#${tag.block}}}.`,
                positionAt(tag.offset),
              );
            }
            return { nodes, otherwise: otherwise ?? [] };
        }
      }
      if (open) {
        throw new SyntaxProblem(
          `Unclosed {{#${open.block} ${open.name}}}: expected {{/${open.block}}}.`,
          positionAt(open.offset),
        );
      }
      return { nodes, otherwise: otherwise ?? [] };
    };
    return { ok: true, nodes: parseUntil(0, null).nodes };
  } catch (error) {
    if (error instanceof SyntaxProblem) {
      return { ok: false, problem: { message: error.message, ...error.position } };
    }
    throw error;
  }
}

/**
 * Names a template may use without declaring them: the marketing footer's placeholders, kept as
 * `{{{name}}}` (in any field) for dispatch to fill with the recipient's links and the postal
 * address (`applyMarketingFooter`). A declared variable of the same name wins.
 */
export const MARKETING_PLACEHOLDERS: ReadonlySet<string> = new Set([
  "unsubscribe_url",
  "preferences_url",
  "mailing_address",
]);

/**
 * What's wrong with a parsed template given the declared variables: undeclared names, raw output
 * outside `html`, lists printed or looped wrongly. Names inside `{{#each}}` resolve to the list
 * item's fields first, then to the top-level variables.
 */
export function checkTemplate(
  nodes: TemplateNode[],
  variables: readonly TemplateVariable[],
  field: TemplateField,
): TemplateProblem[] {
  const problems: TemplateProblem[] = [];
  const declared = new Map(variables.map((variable) => [variable.name, variable]));
  const visit = (list: TemplateNode[], item: TemplateVariable | null) => {
    for (const node of list) {
      if (node.kind === "text") continue;
      const at = { line: node.line, column: node.column };
      const itemField = item?.fields?.find((candidate) => candidate.name === node.name);
      const variable = itemField ? null : declared.get(node.name);
      if (
        node.kind === "variable" &&
        !itemField &&
        !variable &&
        MARKETING_PLACEHOLDERS.has(node.name)
      ) {
        continue;
      }
      if (!itemField && !variable) {
        problems.push({
          message: `"${node.name}" is not a declared variable${item ? ` or a field of "${item.name}"` : ""}.`,
          ...at,
        });
      }
      const type = itemField?.type ?? variable?.type;
      switch (node.kind) {
        case "variable":
          if (node.raw && field !== "html") {
            problems.push({ message: `{{{${node.name}}}} is only allowed in HTML.`, ...at });
          }
          if (type === "list") {
            problems.push({
              message: `"${node.name}" is a list: loop over it with {{#each ${node.name}}}.`,
              ...at,
            });
          }
          break;
        case "if":
          visit(node.body, item);
          visit(node.otherwise, item);
          break;
        case "each":
          if (type !== undefined && type !== "list") {
            problems.push({ message: `"${node.name}" is not a list.`, ...at });
          }
          visit(node.body, type === "list" && variable ? variable : null);
          visit(node.otherwise, item);
          break;
      }
    }
  };
  visit(nodes, null);
  return problems;
}

/** Every name a template uses, in order of first use. */
export function templateNames(nodes: TemplateNode[]): string[] {
  const names = new Set<string>();
  const visit = (list: TemplateNode[]) => {
    for (const node of list) {
      if (node.kind === "text") continue;
      names.add(node.name);
      if (node.kind === "if" || node.kind === "each") {
        visit(node.body);
        visit(node.otherwise);
      }
    }
  };
  visit(nodes);
  return [...names];
}

export class TemplateRenderError extends Error {}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("`", "&#96;");
}

function truthy(value: TemplateValue | undefined): boolean {
  if (value === undefined || value === false || value === "") return false;
  return !Array.isArray(value) || value.length > 0;
}

function display(value: TemplateValue | undefined): string {
  if (value === undefined || Array.isArray(value)) return "";
  return String(value);
}

/**
 * Renders a parsed template. `{{name}}` is HTML-escaped when rendering `html`. Missing values render
 * as nothing; throws `TemplateRenderError` once the output passes `maxLength` or the work passes
 * `maxSteps`. Inside `{{#each list}}`, a declared field of the list's items shadows the top-level
 * variable of that name even when an item leaves it out (as `checkTemplate` resolves it); a list
 * that isn't declared (a draft's preview) resolves by the item's own keys.
 */
export function renderTemplate(
  nodes: TemplateNode[],
  values: TemplateValues,
  opts: {
    field: TemplateField;
    variables: readonly TemplateVariable[];
    maxLength?: number;
    maxSteps?: number;
  },
): string {
  const itemFields = new Map<string, ReadonlySet<string>>();
  for (const variable of opts.variables) {
    if (variable.type === "list") {
      itemFields.set(variable.name, new Set((variable.fields ?? []).map((field) => field.name)));
    }
  }
  const maxLength = opts.maxLength ?? MAX_RENDERED_LENGTH;
  const maxSteps = opts.maxSteps ?? MAX_RENDER_STEPS;
  let steps = 0;
  const step = () => {
    steps++;
    if (steps > maxSteps) {
      throw new TemplateRenderError(
        `Rendering ${opts.field} takes too many steps (more than ${maxSteps.toLocaleString("en-US")}): ` +
          "nest fewer loops over long lists.",
      );
    }
  };
  const escapeOutput = opts.field === "html";
  const parts: string[] = [];
  let length = 0;
  const emit = (value: string) => {
    length += value.length;
    if (length > maxLength) {
      throw new TemplateRenderError(
        `The rendered ${opts.field} is longer than ${maxLength.toLocaleString("en-US")} characters.`,
      );
    }
    parts.push(value);
  };
  type Scope = { item: TemplateListItem; fields: ReadonlySet<string> | undefined } | null;
  const lookup = (name: string, scope: Scope): TemplateValue | undefined => {
    if (scope && (scope.fields ? scope.fields.has(name) : Object.hasOwn(scope.item, name))) {
      return Object.hasOwn(scope.item, name) ? scope.item[name] : undefined;
    }
    return Object.hasOwn(values, name) ? values[name] : undefined;
  };
  const declaredNames = new Set(opts.variables.map((variable) => variable.name));
  // An undeclared marketing placeholder (not a list item's field) is kept for dispatch.
  const isPassthrough = (name: string, scope: Scope) =>
    MARKETING_PLACEHOLDERS.has(name) &&
    !declaredNames.has(name) &&
    !(scope && (scope.fields ? scope.fields.has(name) : Object.hasOwn(scope.item, name)));
  const visit = (list: TemplateNode[], item: Scope) => {
    for (const node of list) {
      step();
      switch (node.kind) {
        case "text":
          emit(node.value);
          break;
        case "variable": {
          if (isPassthrough(node.name, item)) {
            emit(`{{{${node.name}}}}`);
            break;
          }
          const text = display(lookup(node.name, item));
          emit(escapeOutput && !node.raw ? escapeHtml(text) : text);
          break;
        }
        case "if":
          visit(truthy(lookup(node.name, item)) ? node.body : node.otherwise, item);
          break;
        case "each": {
          const value = lookup(node.name, item);
          if (Array.isArray(value) && value.length > 0) {
            const fields = itemFields.get(node.name);
            for (const entry of value) {
              step();
              visit(node.body, { item: entry, fields });
            }
          } else {
            visit(node.otherwise, item);
          }
          break;
        }
      }
    }
  };
  visit(nodes, null);
  return parts.join("");
}

export type VariablesIssue = { path: (string | number)[]; message: string };
export type ValidatedVariables =
  | { ok: true; values: TemplateValues }
  | { ok: false; issues: VariablesIssue[] };

function scalarIssue(type: TemplateScalarType, value: unknown): string | null {
  switch (type) {
    case "string":
      return typeof value === "string" ? null : "Expected a string.";
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : "Expected a number.";
    case "boolean":
      return typeof value === "boolean" ? null : "Expected true or false.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isScalar(value: unknown): value is TemplateScalar {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * What can be rendered of values that failed validation (a draft's sample while it's being typed):
 * scalars, and lists of objects with their scalar fields; everything else is left out, so the
 * preview renders instead of tripping over `null` items or nested objects.
 */
export function renderableValues(raw: unknown): TemplateValues {
  if (!isRecord(raw)) return {};
  const values: TemplateValues = {};
  for (const [name, value] of Object.entries(raw)) {
    if (isScalar(value)) {
      values[name] = value;
    } else if (Array.isArray(value)) {
      values[name] = value
        .filter(isRecord)
        .map((item) =>
          Object.fromEntries(Object.entries(item).filter(([, field]) => isScalar(field))),
        ) as TemplateListItem[];
    }
  }
  return values;
}

/**
 * Checks send-time `variables` against the declarations: unknown names are refused (a typo would
 * otherwise render as nothing), `null` counts as absent, defaults fill in, required ones must be
 * there, and lists hold at most `MAX_TEMPLATE_LIST_ITEMS` objects of their declared fields.
 */
export function validateTemplateVariables(
  variables: readonly TemplateVariable[],
  input: Record<string, unknown>,
): ValidatedVariables {
  const issues: VariablesIssue[] = [];
  const values: TemplateValues = {};
  const declared = new Map(variables.map((variable) => [variable.name, variable]));
  for (const name of Object.keys(input)) {
    if (!declared.has(name)) {
      issues.push({ path: [name], message: `The template declares no variable "${name}".` });
    }
  }
  for (const variable of variables) {
    const raw = Object.hasOwn(input, variable.name) ? input[variable.name] : undefined;
    if (raw === undefined || raw === null) {
      if (variable.default !== undefined) values[variable.name] = variable.default;
      else if (variable.required) issues.push({ path: [variable.name], message: "Required." });
      continue;
    }
    if (variable.type !== "list") {
      const problem = scalarIssue(variable.type, raw);
      if (problem) issues.push({ path: [variable.name], message: problem });
      else values[variable.name] = raw as TemplateScalar;
      continue;
    }
    if (!Array.isArray(raw)) {
      issues.push({ path: [variable.name], message: "Expected a list." });
      continue;
    }
    if (raw.length > MAX_TEMPLATE_LIST_ITEMS) {
      issues.push({
        path: [variable.name],
        message: `A list can have at most ${MAX_TEMPLATE_LIST_ITEMS} items.`,
      });
      continue;
    }
    const fields = variable.fields ?? [];
    const items: TemplateListItem[] = [];
    for (const [index, entry] of raw.entries()) {
      if (!isRecord(entry)) {
        issues.push({ path: [variable.name, index], message: "Expected an object." });
        continue;
      }
      const item: TemplateListItem = {};
      for (const key of Object.keys(entry)) {
        if (!fields.some((field) => field.name === key)) {
          issues.push({
            path: [variable.name, index, key],
            message: `"${variable.name}" items have no field "${key}".`,
          });
        }
      }
      for (const field of fields) {
        const value = Object.hasOwn(entry, field.name) ? entry[field.name] : undefined;
        if (value === undefined || value === null) {
          if (field.required) {
            issues.push({ path: [variable.name, index, field.name], message: "Required." });
          }
          continue;
        }
        const problem = scalarIssue(field.type, value);
        if (problem) issues.push({ path: [variable.name, index, field.name], message: problem });
        else item[field.name] = value as TemplateScalar;
      }
      items.push(item);
    }
    values[variable.name] = items;
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, values };
}

/**
 * Picks the locale to render: an exact match, then the requested language without its region
 * (`pt-BR` → `pt`), then the default. Locales compare case-insensitively.
 */
export function pickTemplateLocale(
  available: readonly string[],
  requested: string | undefined,
  defaultLocale: string,
): string {
  if (requested) {
    const lower = requested.toLowerCase();
    const exact = available.find((locale) => locale.toLowerCase() === lower);
    if (exact) return exact;
    const language = lower.split("-")[0];
    const base = available.find((locale) => locale.toLowerCase() === language);
    if (base) return base;
  }
  return defaultLocale;
}

/** A BCP 47 language tag in canonical form (`en-us` → `en-US`), or `null` if it isn't one. */
export function canonicalLocale(value: string): string | null {
  try {
    const [canonical] = Intl.getCanonicalLocales(value);
    return canonical ?? null;
  } catch {
    return null;
  }
}

export type TemplateContentSource = {
  locale: string;
  subject: string;
  html: string | null;
  text: string | null;
};

/** A problem in one field of one locale's content. */
export type TemplateContentProblem = TemplateProblem & { locale: string; field: TemplateField };

/** Parses and checks every field of every locale: what keeps a draft from being published. */
export function checkTemplateContents(
  contents: readonly TemplateContentSource[],
  variables: readonly TemplateVariable[],
): TemplateContentProblem[] {
  const problems: TemplateContentProblem[] = [];
  for (const content of contents) {
    for (const field of TEMPLATE_FIELDS) {
      const source = content[field];
      if (source === null) continue;
      const parsed = parseTemplate(source);
      const found = parsed.ok ? checkTemplate(parsed.nodes, variables, field) : [parsed.problem];
      for (const problem of found) problems.push({ ...problem, locale: content.locale, field });
    }
  }
  return problems;
}

export type RenderedTemplate = { subject: string; html: string | null; text: string | null };

/**
 * Renders one locale's content with validated values. Throws `TemplateRenderError` for a field that
 * doesn't parse (only drafts can hold one) or renders too long.
 */
export function renderTemplateContent(
  content: Omit<TemplateContentSource, "locale">,
  values: TemplateValues,
  variables: readonly TemplateVariable[],
  opts: { maxLength?: number } = {},
): RenderedTemplate {
  const render = (field: TemplateField, source: string) => {
    const parsed = parseTemplate(source);
    if (!parsed.ok) {
      const { message, line, column } = parsed.problem;
      throw new TemplateRenderError(`${field} (line ${line}, column ${column}): ${message}`);
    }
    return renderTemplate(parsed.nodes, values, { field, variables, maxLength: opts.maxLength });
  };
  return {
    subject: render("subject", content.subject),
    html: content.html === null ? null : render("html", content.html),
    text: content.text === null ? null : render("text", content.text),
  };
}
