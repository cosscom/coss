/**
 * The API reference as Markdown, for coding agents: each operation's method and URL, its SDK call,
 * parameters, request body and responses, read from the OpenAPI document (apps/api/openapi.json).
 * The HTML pages render the same document through fumadocs-openapi; this is their text twin, served
 * at `<page>.md`, by "Copy Markdown" and (compact) in /llms-full.txt.
 */
import { renderSdkSample, type SampleRequest } from "./sdk-samples";
import { SITE_URL } from "./site";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** The parts of a JSON Schema (OpenAPI 3.1) the reference uses. */
export interface Schema {
  $ref?: string;
  type?: string | string[];
  description?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  additionalProperties?: boolean | Schema;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
  enum?: Json[];
  const?: Json;
  format?: string;
  default?: Json;
  examples?: Json[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
}

interface Parameter {
  $ref?: string;
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema?: Schema;
}

interface Response {
  description?: string;
  content?: Record<string, { schema?: Schema }>;
}

export interface Operation {
  operationId?: string;
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: (Parameter | { $ref: string })[];
  requestBody?: { required?: boolean; content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, Response>;
}

export interface OpenApiDocument {
  servers?: { url: string }[];
  paths: Record<string, Record<string, Operation>>;
  components?: { schemas?: Record<string, Schema>; parameters?: Record<string, Parameter> };
}

/** Every generated SDK's sample of an operation, keyed by language (tooling/sdkgen/snippets.json). */
export type SdkSnippets = Record<string, Record<string, string>>;

/** The generated SDKs' samples, in the API reference's tab order. */
const SNIPPET_LANGUAGES = [
  { id: "python", label: "Python", lang: "python" },
  { id: "go", label: "Go", lang: "go" },
  { id: "ruby", label: "Ruby", lang: "ruby" },
  { id: "php", label: "PHP", lang: "php" },
  { id: "java", label: "Java", lang: "java" },
  { id: "csharp", label: ".NET", lang: "csharp" },
] as const;

/** Headers every operation takes, explained once on the API reference's overview. */
const COMMON_HEADERS = new Set(["coss-version"]);

/** Nested object fields are listed this deep; deeper ones keep their type only. */
const MAX_DEPTH = 4;

/** Enums longer than this are left to the description. */
const MAX_ENUM = 16;

export interface ReferencedOperation {
  method: string;
  path: string;
  operation: Operation;
}

export interface OperationMarkdownOptions {
  /** The SDKs' samples (omitted: no samples of other languages). */
  snippets?: SdkSnippets;
}

export function createOperationMarkdown(document: OpenApiDocument) {
  const baseUrl = document.servers?.[0]?.url ?? "https://api.coss.com";

  function resolve<T extends { $ref?: string }>(value: T): T {
    let current = value;
    const seen = new Set<string>();
    while (current.$ref && !seen.has(current.$ref)) {
      seen.add(current.$ref);
      const [, , kind, name] = current.$ref.split("/");
      const target =
        kind === "schemas"
          ? document.components?.schemas?.[name ?? ""]
          : kind === "parameters"
            ? document.components?.parameters?.[name ?? ""]
            : undefined;
      if (!target) throw new Error(`Unknown reference ${current.$ref}.`);
      current = target as unknown as T;
    }
    return current;
  }

  /** A schema with its `allOf` merged into one object (the document uses it only for objects). */
  function flatten(schema: Schema): Schema {
    const resolved = resolve(schema);
    if (!resolved.allOf) return resolved;
    const parts = resolved.allOf.map(flatten);
    return {
      ...resolved,
      allOf: undefined,
      type: "object",
      properties: Object.assign({}, ...parts.map((part) => part.properties ?? {})),
      required: parts.flatMap((part) => part.required ?? []),
    };
  }

  /** The schema's variants: `anyOf`/`oneOf` members, else itself. */
  function variants(schema: Schema): Schema[] {
    const resolved = flatten(schema);
    const members = resolved.anyOf ?? resolved.oneOf;
    return members ? members.flatMap(variants) : [resolved];
  }

  /** `string`, `string[]`, `"a" | "b"`, `object`, `integer | null`… */
  function typeOf(schema: Schema): string {
    const all = variants(schema);
    if (all.length > 1) return [...new Set(all.map(typeOf))].join(" | ");
    const resolved = all[0] ?? {};
    if (resolved.const !== undefined) return JSON.stringify(resolved.const);
    if (resolved.enum && resolved.enum.length <= MAX_ENUM) {
      return resolved.enum.map((value) => JSON.stringify(value)).join(" | ");
    }
    const types = Array.isArray(resolved.type)
      ? resolved.type
      : resolved.type
        ? [resolved.type]
        : [];
    if (types.length === 0) return resolved.properties ? "object" : "any";
    return types
      .map((type) => {
        if (type === "array") {
          const item = resolved.items ? typeOf(resolved.items) : "any";
          return item.includes(" | ") ? `(${item})[]` : `${item}[]`;
        }
        if (
          type === "object" &&
          !resolved.properties &&
          typeof resolved.additionalProperties === "object"
        ) {
          return `map of ${typeOf(resolved.additionalProperties)}`;
        }
        return type;
      })
      .join(" | ");
  }

  function constraints(schema: Schema): string[] {
    const notes: string[] = [];
    for (const variant of variants(schema)) {
      if (variant.format) notes.push(variant.format);
      if (variant.minLength !== undefined || variant.maxLength !== undefined) {
        notes.push(range(variant.minLength, variant.maxLength, "characters"));
      }
      if (variant.minimum !== undefined || variant.maximum !== undefined) {
        notes.push(range(variant.minimum, variant.maximum, ""));
      }
      if (variant.minItems !== undefined || variant.maxItems !== undefined) {
        notes.push(range(variant.minItems, variant.maxItems, "items"));
      }
      if (variant.enum && variant.enum.length > MAX_ENUM) {
        notes.push(`one of ${variant.enum.map((value) => JSON.stringify(value)).join(", ")}`);
      }
    }
    const resolved = resolve(schema);
    if (resolved.default !== undefined) notes.push(`default ${JSON.stringify(resolved.default)}`);
    return [...new Set(notes.filter(Boolean))];
  }

  function describe(schema: Schema): string {
    const resolved = resolve(schema);
    if (resolved.description) return resolved.description;
    return variants(schema).find((variant) => variant.description)?.description ?? "";
  }

  /** The object (or array of objects) whose fields a field's entry lists below it. */
  function nestedObjects(schema: Schema): Schema[] {
    return variants(schema).flatMap((variant) => {
      if (variant.properties) return [variant];
      if (variant.items) return variants(variant.items).filter((item) => item.properties);
      return [];
    });
  }

  function fieldLines(schema: Schema, indent: string, depth: number, refs: string[]): string[] {
    const object = flatten(schema);
    const required = new Set(object.required ?? []);
    const lines: string[] = [];
    for (const [name, property] of Object.entries(object.properties ?? {})) {
      const facts = [
        typeOf(property),
        ...(required.has(name) ? ["required"] : []),
        ...constraints(property),
      ];
      const description = describe(property);
      lines.push(
        `${indent}- \`${name}\` (${facts.join(", ")})${description ? `: ${oneLine(description)}` : ""}`,
      );
      const ref = property.$ref ?? property.items?.$ref;
      if (depth >= MAX_DEPTH || (ref && refs.includes(ref))) continue;
      const nested = nestedObjects(property);
      const next = ref ? [...refs, ref] : refs;
      if (nested.length === 1 && nested[0]) {
        lines.push(...fieldLines(nested[0], `${indent}  `, depth + 1, next));
      } else {
        nested.forEach((variant, index) => {
          lines.push(`${indent}  - One of (${index + 1}):`);
          lines.push(...fieldLines(variant, `${indent}    `, depth + 1, next));
        });
      }
    }
    if (typeof object.additionalProperties === "object" && !object.properties) {
      lines.push(`${indent}- any key (${typeOf(object.additionalProperties)})`);
    }
    return lines;
  }

  /** A body schema as a field list: an object's fields, or each variant's. */
  function bodyFields(schema: Schema): string[] {
    const objects = variants(schema).filter((variant) => variant.properties);
    if (objects.length === 0) return [`- ${typeOf(schema)}`];
    if (objects.length === 1 && objects[0])
      return fieldLines(objects[0], "", 1, schema.$ref ? [schema.$ref] : []);
    return objects.flatMap((variant, index) => [
      `- One of (${index + 1}):`,
      ...fieldLines(variant, "  ", 2, []),
    ]);
  }

  function example(schema: Schema | undefined): Json | undefined {
    if (!schema) return undefined;
    const resolved = resolve(schema);
    if (resolved.examples?.length) return resolved.examples[0];
    return undefined;
  }

  function parameters(operation: Operation): Parameter[] {
    return (operation.parameters ?? []).map((parameter) => resolve(parameter as Parameter));
  }

  /** The example request the reference's code tabs start from: every example given. */
  function sampleRequest(method: string, path: string, operation: Operation): SampleRequest {
    const request: SampleRequest = {
      method: method.toUpperCase() as SampleRequest["method"],
      url: "",
      path: {},
      query: {},
      header: {},
      cookie: {},
    };
    let url = path;
    for (const parameter of parameters(operation)) {
      const value = parameter.schema ? example(parameter.schema) : undefined;
      if (value === undefined || value === null) continue;
      const text = typeof value === "string" ? value : JSON.stringify(value);
      if (parameter.in === "path") {
        request.path[parameter.name] = { value: text };
        url = url.replace(`{${parameter.name}}`, encodeURIComponent(text));
      } else if (parameter.in === "query") {
        request.query[parameter.name] = {
          values: Array.isArray(value) ? value.map(String) : [text],
        };
      } else if (parameter.in === "header" && !COMMON_HEADERS.has(parameter.name.toLowerCase())) {
        request.header[parameter.name] = { value: text };
      }
    }
    const body = example(jsonSchema(operation.requestBody?.content));
    if (body !== undefined) {
      request.body = body;
      request.bodyMediaType = "application/json";
    }
    request.url = `${baseUrl}${url}`;
    return request;
  }

  function curl(request: SampleRequest): string {
    const query = Object.entries(request.query)
      .flatMap(([name, param]) =>
        (param?.values ?? []).map((value) => `${name}=${encodeURIComponent(value)}`),
      )
      .join("&");
    const lines = [`curl -X ${request.method} "${request.url}${query ? `?${query}` : ""}"`];
    lines.push(`  -H "Authorization: Bearer $COSS_API_KEY"`);
    for (const [name, param] of Object.entries(request.header)) {
      lines.push(`  -H "${name}: ${param?.value ?? ""}"`);
    }
    if (request.body !== undefined) {
      lines.push(`  -H "Content-Type: application/json"`);
      lines.push(`  -d '${JSON.stringify(request.body, null, 2).replaceAll("'", "'\\''")}'`);
    }
    return lines.join(" \\\n");
  }

  function parameterSection(title: string, list: Parameter[]): string[] {
    if (list.length === 0) return [];
    return [
      `## ${title}`,
      "",
      ...list.map((parameter) => {
        const schema = parameter.schema ?? {};
        const facts = [
          typeOf(schema),
          ...(parameter.required ? ["required"] : []),
          ...constraints(schema),
        ];
        const description = parameter.description ?? describe(schema);
        return `- \`${parameter.name}\` (${facts.join(", ")})${description ? `: ${oneLine(description)}` : ""}`;
      }),
      "",
    ];
  }

  /** The full page: what `<page>.md` and "Copy Markdown" serve. */
  function full(
    { method, path, operation }: ReferencedOperation,
    options: OperationMarkdownOptions = {},
  ): string {
    const request = sampleRequest(method, path, operation);
    const verb = method.toUpperCase();
    const out: string[] = [];
    if (operation.description) out.push(operation.description, "");
    out.push(`\`${verb} ${baseUrl}${path}\``, "");
    out.push(
      "Authenticate with your API key as a bearer token (`Authorization: Bearer coss_test_…`). " +
        "Responses are JSON with snake_case fields; errors are " +
        "`{ error: { type, code, message, param?, issues?, request_id } }` " +
        `(${SITE_URL}/docs/api-reference/errors.md).`,
      "",
    );

    const all = parameters(operation);
    out.push(
      ...parameterSection(
        "Path parameters",
        all.filter((p) => p.in === "path"),
      ),
    );
    out.push(
      ...parameterSection(
        "Query parameters",
        all.filter((p) => p.in === "query"),
      ),
    );
    out.push(
      ...parameterSection(
        "Headers",
        all.filter((p) => p.in === "header" && !COMMON_HEADERS.has(p.name.toLowerCase())),
      ),
    );

    const bodySchema = jsonSchema(operation.requestBody?.content);
    if (bodySchema) {
      out.push("## Request body", "", ...bodyFields(bodySchema), "");
    }

    out.push("## Example request", "", "TypeScript (the `coss` package):", "");
    out.push(fence("ts", renderSdkSample(request)), "");
    out.push("HTTP:", "", fence("sh", curl(request)), "");
    const snippets = options.snippets?.[`${verb} ${path}`];
    if (snippets) {
      for (const language of SNIPPET_LANGUAGES) {
        const source = snippets[language.id];
        if (source) out.push(`${language.label}:`, "", fence(language.lang, source.trim()), "");
      }
    }

    const responses = Object.entries(operation.responses ?? {});
    const success = responses.filter(([status]) => status.startsWith("2"));
    const failures = responses.filter(([status]) => !status.startsWith("2"));
    for (const [status, response] of success) {
      out.push(`## Response ${status}`, "");
      if (response.description) out.push(oneLine(response.description), "");
      const schema = jsonSchema(response.content);
      if (schema) {
        out.push(...bodyFields(schema), "");
        const value = example(schema);
        if (value !== undefined)
          out.push("Example:", "", fence("json", JSON.stringify(value, null, 2)), "");
      } else if (response.content) {
        out.push(`Content type: ${Object.keys(response.content).join(", ")}.`, "");
      }
    }
    if (failures.length > 0) {
      out.push("## Errors", "");
      for (const [status, response] of failures) {
        out.push(`- \`${status}\`: ${oneLine(response.description ?? "")}`);
      }
      out.push("");
    }
    return out.join("\n").trimEnd();
  }

  /** One line per operation for /llms-full.txt; the page's `.md` has the rest. */
  function summary({ method, path, operation }: ReferencedOperation, markdownUrl: string): string {
    const sdk = renderSdkSample(sampleRequest(method, path, operation)).match(
      /await coss\.([\w.]+)\(/,
    )?.[1];
    const facts = [
      `\`${method.toUpperCase()} ${path}\``,
      ...(sdk ? [`TypeScript: \`coss.${sdk}()\``] : []),
      `parameters, body and responses: ${markdownUrl}`,
    ];
    return [facts.join(" · "), operation.description].filter(Boolean).join("\n\n");
  }

  return { full, summary };
}

function jsonSchema(content: Record<string, { schema?: Schema }> | undefined): Schema | undefined {
  return content?.["application/json"]?.schema;
}

function range(min: number | undefined, max: number | undefined, unit: string): string {
  const suffix = (count: number | undefined) =>
    !unit ? "" : count === 1 ? ` ${unit.replace(/s$/, "")}` : ` ${unit}`;
  if (min !== undefined && max !== undefined) return `${min}-${max}${suffix(max)}`;
  if (min !== undefined) return `at least ${min}${suffix(min)}`;
  return `at most ${max}${suffix(max)}`;
}

function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

function fence(lang: string, code: string): string {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((match) => match[0].length));
  const ticks = "`".repeat(longest + 1);
  return `${ticks}${lang}\n${code}\n${ticks}`;
}
