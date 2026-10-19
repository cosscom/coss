/**
 * The shared half of the template converters: each dialect parses its source into the tree below,
 * and `convertTemplate` writes it out in coss.com's template language (`@coss/email/templates`),
 * declaring the variables it uses and noting everything it couldn't carry over exactly.
 *
 * Contexts: Handlebars and Mustache templates walk into objects and list items; coss.com has flat
 * top-level variables and, inside `{{#each list}}`, the item's scalar fields. Object paths are
 * flattened (`user.name` → `user_name`), objects entered with `#with` or a section are unwrapped
 * (their fields become prefixed names), and list items' paths become item fields.
 */
import {
  checkTemplate,
  MARKETING_PLACEHOLDERS,
  MAX_TEMPLATE_LIST_FIELDS,
  MAX_TEMPLATE_VARIABLES,
  MAX_TEMPLATE_VARIABLES_BYTES,
  parseTemplate,
  TEMPLATE_FIELDS,
  TEMPLATE_SOURCE_LIMITS,
  type TemplateField,
  type TemplateScalarType,
  type TemplateVariable,
} from "@coss/email/templates";
import {
  isRecord,
  NameAllocator,
  RESERVED_VARIABLE_NAMES,
  type SampleType,
  sampleType,
  valueAt,
} from "./names.ts";
import type {
  ConversionWarning,
  ConvertedTemplate,
  ConvertedVariable,
  VariableRename,
} from "./types.ts";

/** A variable reference as the source wrote it. */
export type SourcePath = {
  segments: string[];
  /** `../` steps up the context stack. */
  up: number;
  /** `@root.x`: the top-level data. */
  root: boolean;
};

export type Placeholder = "unsubscribe_url" | "preferences_url" | "mailing_address";

export type SourceNode =
  | { kind: "text"; value: string }
  | {
      kind: "var";
      path: SourcePath;
      raw: boolean;
      /** A default the source gave the value (`insert x "default=…"`, Resend's `x|fallback`). */
      fallback?: string | undefined;
      /** The tag as written, emitted unchanged where it can't be converted. */
      source: string;
    }
  /** A coss.com placeholder (an unsubscribe link); `link` wraps it in an anchor in HTML. */
  | { kind: "placeholder"; name: Placeholder; link: boolean; source: string }
  | {
      kind: "block";
      /** `section` (Mustache `{{#x}}`) becomes a loop, an unwrap or a condition by the data. */
      type: "if" | "unless" | "each" | "with" | "section";
      path: SourcePath;
      body: SourceNode[];
      otherwise: SourceNode[];
      open: string;
      elseSource: string | null;
      close: string;
    }
  /** A tag coss.com has no equivalent for, left as written (the draft won't publish). */
  | { kind: "verbatim"; source: string; message: string }
  /** A block of a helper coss.com doesn't have: its tags as written, its content converted. */
  | {
      kind: "verbatimBlock";
      body: SourceNode[];
      otherwise: SourceNode[];
      open: string;
      elseSource: string | null;
      close: string;
      message: string;
    }
  /** Something to tell the customer about at this point of the output, which writes nothing. */
  | { kind: "note"; message: string; lossy: boolean };

/** How names resolve: Mustache looks a name up the context stack when the item doesn't have it. */
export type Dialect = { walksUp: boolean };

type Warning = ConversionWarning & { lossy: boolean };

type FieldEntry = {
  key: string;
  segments: string[];
  name: string;
  sample: SampleType;
  /** Printed or tested (paths only walked through to an object aren't declared). */
  used: boolean;
};

type TopEntry = {
  key: string;
  segments: string[];
  name: string;
  sample: SampleType;
  /** A declared type (Resend's), which wins over the sample's. */
  declaredType?: "string" | "number" | undefined;
  uses: Set<"value" | "if" | "each">;
  required: boolean;
  fallback?: string | undefined;
  /** The fallback was declared for the variable (Resend), not written at one use of it. */
  declaredFallback?: boolean | undefined;
  /** Used somewhere without an inline fallback (a plain tag, a condition, a loop). */
  usedBare?: boolean | undefined;
  description?: string | undefined;
  fields: Map<string, FieldEntry>;
  fieldNames: NameAllocator;
  /** The list's first item in the sample, for its fields' types. */
  itemSample: unknown;
};

type Frame = {
  /** The list whose item this context is, or `null` for the top-level data. */
  list: TopEntry | null;
  /** Path of this context inside the list item (or the top-level data): unwrapped objects. */
  prefix: string[];
  sample: unknown;
  /** Inside a loop coss.com can't express: every tag is written as it was. */
  opaque?: boolean;
};

type Resolution =
  | { kind: "top"; entry: TopEntry; frame: Frame; full: string[] }
  | { kind: "field"; list: TopEntry; field: FieldEntry; frame: Frame; full: string[] }
  | { kind: "self"; list: TopEntry; field: FieldEntry }
  | { kind: "opaque" }
  | { kind: "unsupported"; message: string };

/** Output with its current line and column, for warnings that point at what was written. */
class Output {
  value = "";
  line = 1;
  column = 1;

  write(chunk: string): void {
    this.value += chunk;
    let start = 0;
    for (let i = chunk.indexOf("\n"); i !== -1; i = chunk.indexOf("\n", i + 1)) {
      this.line++;
      start = i + 1;
    }
    this.column = start === 0 ? this.column + chunk.length : chunk.length - start + 1;
  }
}

export class Registry {
  readonly entries = new Map<string, TopEntry>();
  readonly #names = new NameAllocator(RESERVED_VARIABLE_NAMES);

  constructor(readonly sample: Record<string, unknown> | null) {}

  top(segments: readonly string[]): TopEntry {
    const key = segments.join(".");
    let entry = this.entries.get(key);
    if (!entry) {
      const value = valueAt(this.sample, segments);
      const item = Array.isArray(value) ? value[0] : undefined;
      entry = {
        key,
        segments: [...segments],
        name: this.#names.nameFor(key, segments),
        sample: sampleType(value),
        uses: new Set(),
        required: false,
        fields: new Map(),
        fieldNames: new NameAllocator(),
        itemSample: item,
      };
      this.entries.set(key, entry);
    }
    return entry;
  }

  /** Declares a variable up front (Resend declares its variables with a type and fallback). */
  declare(
    key: string,
    opts: { type: "string" | "number"; fallback?: string | undefined; required: boolean },
  ): TopEntry {
    const entry = this.top([key]);
    entry.declaredType = opts.type;
    entry.fallback = opts.fallback;
    entry.declaredFallback = opts.fallback !== undefined;
    entry.required = opts.required;
    return entry;
  }

  field(list: TopEntry, segments: readonly string[]): FieldEntry {
    const key = segments.join(".");
    let field = list.fields.get(key);
    if (!field) {
      field = {
        key,
        segments: [...segments],
        name: list.fieldNames.nameFor(key, key === "." ? ["value"] : segments),
        sample: sampleType(key === "." ? list.itemSample : valueAt(list.itemSample, segments)),
        used: false,
      };
      list.fields.set(key, field);
    }
    return field;
  }
}

/** A top-level name used inside a loop over `list`, which an item field of that name would shadow. */
type OuterReference = { list: TopEntry; name: string; at: ConversionWarning };

class FieldConverter {
  readonly out = new Output();

  constructor(
    readonly field: TemplateField,
    readonly registry: Registry,
    readonly dialect: Dialect,
    readonly warnings: Warning[],
    readonly outer: OuterReference[],
  ) {}

  warn(message: string, lossy: boolean, at = this.here()): void {
    this.warnings.push({ ...at, message, lossy });
  }

  here(): ConversionWarning {
    return { field: this.field, line: this.out.line, column: this.out.column, message: "" };
  }

  text(value: string): void {
    // `{{` in text is a literal in the output too.
    this.out.write(value.replaceAll("{{", "\\{{"));
  }

  tag(value: string): void {
    // A backslash right before a tag would turn it into a literal `{{`.
    if (this.out.value.endsWith("\\")) {
      this.warn("A backslash right before a tag: check this spot.", true);
    }
    this.out.write(value);
  }

  resolve(path: SourcePath, frames: readonly Frame[]): Resolution {
    if (path.segments.some((segment) => segment.startsWith("@"))) {
      return {
        kind: "unsupported",
        message: `${path.segments.join(".")} has no coss.com equivalent.`,
      };
    }
    let index = path.root ? 0 : Math.max(0, frames.length - 1 - path.up);
    for (;;) {
      const frame = frames[index] as Frame;
      if (frame.opaque) return { kind: "opaque" };
      if (
        this.dialect.walksUp &&
        !path.root &&
        path.up === 0 &&
        index > 0 &&
        path.segments.length > 0 &&
        isRecord(frame.sample) &&
        valueAt(frame.sample, path.segments) === undefined &&
        valueAt((frames[index - 1] as Frame).sample, path.segments) !== undefined
      ) {
        index--;
        continue;
      }
      const full = [...frame.prefix, ...path.segments];
      if (frame.list) {
        if (full.length === 0) {
          return { kind: "self", list: frame.list, field: this.registry.field(frame.list, ["."]) };
        }
        return {
          kind: "field",
          list: frame.list,
          field: this.registry.field(frame.list, full),
          frame,
          full,
        };
      }
      if (full.length === 0) {
        return { kind: "unsupported", message: "The whole data object can't be printed." };
      }
      return { kind: "top", entry: this.registry.top(full), frame, full };
    }
  }

  /** The innermost loop around the current spot, whose fields shadow top-level names. */
  innermostList(frames: readonly Frame[]): TopEntry | null {
    for (let i = frames.length - 1; i >= 0; i--) {
      const list = (frames[i] as Frame).list;
      if (list) return list;
    }
    return null;
  }

  nameOf(resolution: Resolution & { kind: "top" | "field" | "self" }, frames: readonly Frame[]) {
    if (resolution.kind === "top") {
      const list = this.innermostList(frames);
      if (list) this.outer.push({ list, name: resolution.entry.name, at: this.here() });
      return { name: resolution.entry.name, sample: resolution.entry.sample };
    }
    resolution.field.used = true;
    return { name: resolution.field.name, sample: resolution.field.sample };
  }

  emit(nodes: readonly SourceNode[], frames: readonly Frame[]): void {
    for (const node of nodes) this.emitNode(node, frames);
  }

  emitNode(node: SourceNode, frames: readonly Frame[]): void {
    switch (node.kind) {
      case "text":
        this.text(node.value);
        return;
      case "note":
        this.warn(node.message, node.lossy);
        return;
      case "verbatim":
        this.warn(`Not converted: ${node.message}`, true);
        this.tag(node.source);
        return;
      case "verbatimBlock":
        this.warn(`Not converted: ${node.message}`, true);
        this.tag(node.open);
        this.emit(node.body, frames);
        if (node.elseSource !== null) this.tag(node.elseSource);
        this.emit(node.otherwise, frames);
        this.tag(node.close);
        return;
      case "placeholder":
        this.placeholder(node.name, node.link);
        return;
      case "var":
        this.variable(node, frames);
        return;
      case "block":
        this.block(node, frames);
        return;
    }
  }

  placeholder(name: Placeholder, link: boolean): void {
    if (this.field === "subject") {
      this.warn(`{{{${name}}}} can only be used in the HTML and text.`, true);
    } else if (MARKETING_PLACEHOLDERS.has(name)) {
      this.warn(
        `{{{${name}}}} is filled in on marketing sends only (transactional sends leave it empty).`,
        false,
      );
    }
    const tag = `{{{${name}}}}`;
    if (link && this.field === "html") {
      this.text('<a href="');
      this.tag(tag);
      this.text('">Unsubscribe</a>');
    } else {
      this.tag(tag);
    }
  }

  variable(node: Extract<SourceNode, { kind: "var" }>, frames: readonly Frame[]): void {
    const resolution = this.resolve(node.path, frames);
    if (resolution.kind === "opaque") {
      this.tag(node.source);
      return;
    }
    if (resolution.kind === "unsupported") {
      this.warn(`Not converted: ${resolution.message}`, true);
      this.tag(node.source);
      return;
    }
    if (resolution.kind === "top") {
      resolution.entry.uses.add("value");
      if (node.fallback === undefined) resolution.entry.usedBare = true;
      if (node.fallback !== undefined) {
        if (resolution.entry.fallback === undefined) resolution.entry.fallback = node.fallback;
        else if (resolution.entry.fallback !== node.fallback) {
          this.warn(
            `"${resolution.entry.name}" has two different defaults: "${resolution.entry.fallback}" is used.`,
            true,
          );
        }
      }
    } else if (node.fallback !== undefined) {
      this.warn("List item fields can't have a default: it was left out.", true);
    }
    if (resolution.kind === "self") {
      this.warn(
        `Lists of plain values become lists of objects: each item's value is its "value" field.`,
        true,
      );
    }
    const { name, sample } = this.nameOf(resolution, frames);
    if (sample === "object" || sample === "list") {
      this.warn(
        `"${name}" is ${sample === "list" ? "a list" : "an object"} in the sample data.`,
        true,
      );
    }
    this.tag(node.raw && this.field === "html" ? `{{{${name}}}}` : `{{${name}}}`);
  }

  block(node: Extract<SourceNode, { kind: "block" }>, frames: readonly Frame[]): void {
    const resolution = this.resolve(node.path, frames);
    if (resolution.kind === "opaque") {
      this.opaqueBlock(node, frames);
      return;
    }
    if (resolution.kind === "unsupported" || resolution.kind === "self") {
      this.warn(
        `Not converted: ${resolution.kind === "self" ? "a block over the current item." : resolution.message}`,
        true,
      );
      this.opaqueBlock(node, frames);
      return;
    }
    let type = node.type;
    if (type === "section") {
      const sample = resolution.kind === "top" ? resolution.entry.sample : resolution.field.sample;
      type = sample === "list" ? "each" : sample === "object" ? "with" : "if";
    }
    switch (type) {
      case "if":
      case "unless": {
        const { name, sample } = this.nameOf(resolution, frames);
        if (resolution.kind === "top") {
          resolution.entry.uses.add("if");
          resolution.entry.usedBare = true;
        }
        if (sample === "number") {
          this.warn(`"${name}" is a number: coss.com treats 0 as true in {{#if}}.`, true);
        } else if (sample === "object") {
          this.warn(`"${name}" is an object in the sample data: {{#if}} can't test one.`, true);
        }
        const [first, second] =
          type === "if" ? [node.body, node.otherwise] : [node.otherwise, node.body];
        this.tag(`{{#if ${name}}}`);
        this.emit(first, frames);
        if (second.length > 0) {
          this.tag("{{else}}");
          this.emit(second, frames);
        }
        this.tag("{{/if}}");
        return;
      }
      case "each": {
        if (resolution.kind === "field") {
          this.warn("Not converted: a loop inside a loop (list items can't hold lists).", true);
          this.opaqueBlock(node, frames);
          return;
        }
        const entry = resolution.entry;
        entry.uses.add("each");
        entry.usedBare = true;
        const sample = valueAt(resolution.frame.sample, node.path.segments);
        this.tag(`{{#each ${entry.name}}}`);
        this.emit(node.body, [
          ...frames,
          { list: entry, prefix: [], sample: Array.isArray(sample) ? sample[0] : undefined },
        ]);
        if (node.otherwise.length > 0) {
          this.tag("{{else}}");
          this.emit(node.otherwise, frames);
        }
        this.tag("{{/each}}");
        return;
      }
      case "with": {
        const full = resolution.full;
        this.warn(
          `"${full.join(".")}" is an object: its fields became separate variables, shown even when it's missing.`,
          true,
        );
        if (node.otherwise.length > 0) {
          this.warn("The {{else}} part of a block over an object was left out.", true);
        }
        const frame = resolution.frame;
        this.emit(node.body, [
          ...frames,
          {
            list: frame.list,
            prefix: full,
            sample: valueAt(frame.sample, node.path.segments),
          },
        ]);
        return;
      }
    }
  }

  /** A block written as it was, including everything inside it. */
  opaqueBlock(node: Extract<SourceNode, { kind: "block" }>, frames: readonly Frame[]): void {
    this.tag(node.open);
    this.emit(node.body, [...frames, { list: null, prefix: [], sample: undefined, opaque: true }]);
    if (node.elseSource !== null) this.tag(node.elseSource);
    this.emit(node.otherwise, frames);
    this.tag(node.close);
  }
}

export type ConvertInput = {
  subject: SourceNode[] | null;
  html: SourceNode[] | null;
  text: SourceNode[] | null;
  registry: Registry;
  dialect: Dialect;
  /** Warnings about the template as a whole (at line 1, column 1 of the first field). */
  notes?: { message: string; lossy: boolean }[];
};

const SUBJECT_PLACEHOLDER = "(no subject)";

/** Writes the parsed fields in coss.com's language and declares what they use. */
export function convertTemplate(input: ConvertInput): ConvertedTemplate {
  const warnings: Warning[] = [];
  const outer: OuterReference[] = [];
  const outputs: Record<TemplateField, string | null> = { subject: null, html: null, text: null };
  for (const field of TEMPLATE_FIELDS) {
    const nodes = input[field];
    if (!nodes) continue;
    const converter = new FieldConverter(field, input.registry, input.dialect, warnings, outer);
    converter.emit(nodes, [{ list: null, prefix: [], sample: input.registry.sample }]);
    outputs[field] = converter.out.value;
  }
  const firstField: TemplateField =
    outputs.html !== null ? "html" : outputs.text !== null ? "text" : "subject";
  const general = (message: string, lossy: boolean, field: TemplateField = firstField) =>
    warnings.push({ field, line: 1, column: 1, message, lossy });
  for (const note of input.notes ?? []) general(note.message, note.lossy);

  let subject = outputs.subject ?? "";
  if (subject.trim() === "") {
    subject = SUBJECT_PLACEHOLDER;
    general("The template has no subject: one was put in for you to replace.", true, "subject");
  }
  for (const field of TEMPLATE_FIELDS) {
    const value = field === "subject" ? subject : outputs[field];
    if (value !== null && value.length > TEMPLATE_SOURCE_LIMITS[field]) {
      general(
        `The ${field} is longer than coss.com allows (${TEMPLATE_SOURCE_LIMITS[field]} characters).`,
        true,
        field,
      );
    }
  }
  for (const reference of outer) {
    if ([...reference.list.fields.values()].some((field) => field.name === reference.name)) {
      warnings.push({
        ...reference.at,
        message: `Inside the loop over "${reference.list.name}", "${reference.name}" is the item's field, not the top-level variable.`,
        lossy: true,
      });
    }
  }

  const { variables, renames } = declarations(input.registry, general);
  const sampleVariables = sampleValues(input.registry, variables);

  let checks = true;
  for (const field of TEMPLATE_FIELDS) {
    const value = field === "subject" ? subject : outputs[field];
    if (value === null) continue;
    const parsed = parseTemplate(value);
    if (!parsed.ok) {
      checks = false;
      continue;
    }
    if (checkTemplate(parsed.nodes, variables as TemplateVariable[], field).length > 0) {
      checks = false;
    }
  }
  // Informational notes once per template: the first spot is enough.
  const seen = new Set<string>();
  const kept = warnings.filter((warning) => {
    if (warning.lossy) return true;
    if (seen.has(warning.message)) return false;
    seen.add(warning.message);
    return true;
  });
  kept.sort(
    (a, b) =>
      TEMPLATE_FIELDS.indexOf(a.field) - TEMPLATE_FIELDS.indexOf(b.field) ||
      a.line - b.line ||
      a.column - b.column,
  );
  return {
    subject,
    html: outputs.html,
    text: outputs.text,
    variables,
    sampleVariables,
    renames,
    warnings: kept.map(({ lossy: _, ...warning }) => warning),
    lossless: checks && !kept.some((warning) => warning.lossy),
  };
}

function scalarType(sample: SampleType): TemplateScalarType {
  return sample === "number" || sample === "boolean" ? sample : "string";
}

function typedDefault(
  value: string,
  type: TemplateScalarType,
): string | number | boolean | undefined {
  if (type === "string") return value;
  if (type === "number") {
    const number = Number(value);
    return value.trim() !== "" && Number.isFinite(number) ? number : undefined;
  }
  return value === "true" ? true : value === "false" ? false : undefined;
}

function declarations(
  registry: Registry,
  general: (message: string, lossy: boolean) => void,
): { variables: ConvertedVariable[]; renames: VariableRename[] } {
  const variables: ConvertedVariable[] = [];
  const renames: VariableRename[] = [];
  for (const entry of registry.entries.values()) {
    // Objects only walked through (`#with`, sections) aren't variables themselves.
    if (entry.uses.size === 0 && entry.declaredType === undefined) continue;
    if (entry.name !== entry.key) renames.push({ from: entry.key, to: entry.name });
    if (!entry.uses.has("each") && entry.sample === "list") {
      general(
        `"${entry.name}" is a list in the sample data but is only tested, so it was declared as text.`,
        true,
      );
    }
    if (entry.uses.has("each")) {
      // Items with fields nobody prints are still sent: declare the sample item's scalars too, or
      // sends of the same data would be refused.
      if (isRecord(entry.itemSample)) {
        for (const [key, value] of Object.entries(entry.itemSample)) {
          const type = sampleType(value);
          if (type === "string" || type === "number" || type === "boolean") {
            registry.field(entry, [key]).used = true;
          }
        }
      }
      let fields = [...entry.fields.values()].filter((field) => field.used);
      if (fields.length === 0) {
        const value = registry.field(entry, ["."]);
        value.used = true;
        fields = [value];
      }
      if (fields.length > MAX_TEMPLATE_LIST_FIELDS) {
        general(
          `"${entry.name}" items have ${fields.length} fields; coss.com allows ${MAX_TEMPLATE_LIST_FIELDS}.`,
          true,
        );
        fields = fields.slice(0, MAX_TEMPLATE_LIST_FIELDS);
      }
      for (const field of fields) {
        if (field.key !== "." && field.name !== field.key) {
          renames.push({
            from: `${entry.key}[].${field.key}`,
            to: `${entry.name}[].${field.name}`,
          });
        }
      }
      variables.push({
        name: entry.name,
        type: "list",
        required: false,
        fields: fields.map((field) => ({
          name: field.name,
          type: scalarType(field.sample),
          required: false,
        })),
      });
      continue;
    }
    const type: TemplateScalarType = entry.declaredType ?? scalarType(entry.sample);
    const variable: ConvertedVariable = { name: entry.name, type, required: entry.required };
    if (entry.fallback !== undefined && !entry.declaredFallback && entry.usedBare) {
      // coss.com defaults apply to every use: a fallback written at one use would change the others.
      general(
        `"${entry.name}" has a default ("${entry.fallback}") at one use only: on coss.com it applies to every use.`,
        true,
      );
    }
    if (entry.fallback !== undefined) {
      const value = typedDefault(entry.fallback, type);
      if (value === undefined) {
        general(`The default "${entry.fallback}" of "${entry.name}" isn't a ${type}.`, true);
      } else {
        variable.default = value;
        variable.required = false;
      }
    }
    variables.push(variable);
  }
  if (variables.length > MAX_TEMPLATE_VARIABLES) {
    general(
      `The template uses ${variables.length} variables; coss.com allows ${MAX_TEMPLATE_VARIABLES}.`,
      true,
    );
    variables.length = MAX_TEMPLATE_VARIABLES;
  }
  return { variables, renames };
}

/** The sample data under the converted names, keeping only values of the declared types. */
function sampleValues(
  registry: Registry,
  variables: readonly ConvertedVariable[],
): Record<string, unknown> | null {
  if (!registry.sample) return null;
  const declared = new Map(variables.map((variable) => [variable.name, variable]));
  const values: Record<string, unknown> = {};
  const fits = (value: unknown, type: string) =>
    typeof value === type && (type !== "number" || Number.isFinite(value));
  for (const entry of registry.entries.values()) {
    const variable = declared.get(entry.name);
    if (!variable) continue;
    const value = valueAt(registry.sample, entry.segments);
    if (variable.type !== "list") {
      if (fits(value, variable.type)) values[entry.name] = value;
      continue;
    }
    if (!Array.isArray(value)) continue;
    const fields = [...entry.fields.values()].filter((field) =>
      variable.fields?.some((declaredField) => declaredField.name === field.name),
    );
    values[entry.name] = value.map((item) => {
      const out: Record<string, unknown> = {};
      for (const field of fields) {
        const fieldValue = field.key === "." ? item : valueAt(item, field.segments);
        const type = variable.fields?.find((f) => f.name === field.name)?.type ?? "string";
        if (fits(fieldValue, type)) out[field.name] = fieldValue;
      }
      return out;
    });
  }
  if (Object.keys(values).length === 0) return null;
  return JSON.stringify(values).length > MAX_TEMPLATE_VARIABLES_BYTES ? null : values;
}
