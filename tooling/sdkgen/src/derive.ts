/**
 * Turns the public OpenAPI document (apps/api/openapi.json) into the one Fern generates the SDKs
 * from (sdks/fern/openapi.sdk.json). The public document stays what the docs and `GET
 * /openapi.json` serve; everything here only shapes the generated code:
 *
 * - every operation gets the SDK group and method of `SDK_METHODS` (the TypeScript SDK's names);
 * - `Coss-Version` becomes one client option (default: the latest version) instead of a parameter
 *   of every method;
 * - the API key comes from the client or `COSS_API_KEY`;
 * - operations the API doesn't deduplicate are never retried (`NO_RETRY`, the TypeScript SDK's
 *   `retry: false`);
 * - integers that may exceed 2³¹ − 1 are 64-bit, so Go, Java and .NET don't overflow on them;
 * - anonymous schemas that would get awkward generated names are named;
 * - per language, schemas named like a resource group are renamed where the language can't have
 *   both (`RENAMES`).
 */
import { NO_RETRY, SDK_METHODS } from "./methods.ts";

export type OpenApiDocument = {
  info: { version: string };
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, Schema>;
    parameters?: Record<string, unknown>;
    securitySchemes?: Record<string, Record<string, unknown>>;
  };
  [key: string]: unknown;
};

type Schema = Record<string, unknown>;
type Operation = Record<string, unknown> & { parameters?: unknown[] };

const HTTP_METHODS = ["get", "put", "post", "patch", "delete"] as const;
const INT32_MAX = 2 ** 31 - 1;
const COSS_VERSION_REF = "#/components/parameters/CossVersion";

/** Names for anonymous schemas, by JSON pointer under `components/schemas`. */
const TYPE_NAMES: Record<string, string> = {
  "Error/properties/error": "ErrorBody",
};

/**
 * Schemas renamed for one language. In C# a type can't share its name with the namespace of a
 * resource group next to it (`Coss.Email` holds the email methods), so the generator would emit
 * `Email_` and a `Coss.Email__` namespace instead, nor with one of its own properties
 * (`Error.error` would become `Error_`).
 */
const RENAMES: Record<string, Record<string, string>> = {
  csharp: { Email: "EmailMessage", Billing: "BillingOverview", Error: "ErrorResponse" },
};

/**
 * Properties whose `null` is dropped for one language, by JSON pointer under
 * `components/schemas`. C#'s explicit optional-nullable values (`Optional<T?>`, which send a
 * null that clears a field) don't convert implicitly from one branch of a union, so the
 * generator's own code for this one doesn't compile; on a create, null and omitted are the same.
 */
const NOT_NULLABLE: Record<string, string[]> = {
  csharp: ["CreateContactPropertyRequest/properties/fallback"],
};

/** The operations of a document, keyed by `METHOD /path` like `SDK_METHODS`. */
export function operationsOf(doc: OpenApiDocument): Map<string, Operation> {
  const operations = new Map<string, Operation>();
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (operation) operations.set(`${method.toUpperCase()} ${path}`, operation as Operation);
    }
  }
  return operations;
}

/** The spec one language is generated from (`language`: its group in generators.yml). */
export function deriveSdkSpec(source: OpenApiDocument, language?: string): OpenApiDocument {
  const doc = renameSchemas(structuredClone(source), RENAMES[language ?? ""] ?? {});
  const operations = operationsOf(doc);

  const missing = [...operations.keys()].filter((key) => !(key in SDK_METHODS));
  if (missing.length > 0) {
    throw new Error(`No SDK method in tooling/sdkgen/src/methods.ts for: ${missing.join(", ")}`);
  }
  const stale = [...Object.keys(SDK_METHODS), ...NO_RETRY].filter((key) => !operations.has(key));
  if (stale.length > 0) {
    throw new Error(`tooling/sdkgen/src/methods.ts names unknown operations: ${stale.join(", ")}`);
  }

  for (const [key, operation] of operations) {
    const segments = (SDK_METHODS[key] as string).split(".");
    const method = segments.pop() as string;
    if (segments.length > 0) {
      operation["x-fern-sdk-group-name"] = segments.length === 1 ? segments[0] : segments;
    }
    operation["x-fern-sdk-method-name"] = method;
    if (NO_RETRY.has(key)) operation["x-fern-retries"] = { disabled: true };
    if (operation.parameters) {
      operation.parameters = operation.parameters.filter(
        (parameter) => (parameter as { $ref?: string }).$ref !== COSS_VERSION_REF,
      );
      if (operation.parameters.length === 0) delete operation.parameters;
    }
  }
  delete doc.components.parameters?.CossVersion;

  doc["x-fern-global-headers"] = [
    {
      header: "Coss-Version",
      name: "apiVersion",
      optional: true,
      "x-fern-default": doc.info.version,
    },
  ];

  const bearer = doc.components.securitySchemes?.bearerAuth;
  if (!bearer) throw new Error("The document has no bearerAuth security scheme");
  bearer["x-fern-bearer"] = { name: "apiKey", env: "COSS_API_KEY" };

  for (const [pointer, name] of Object.entries(TYPE_NAMES)) {
    const [schemaName = "", ...rest] = pointer.split("/");
    const renamed = RENAMES[language ?? ""]?.[schemaName] ?? schemaName;
    const schema = resolve(doc.components.schemas, [renamed, ...rest].join("/"));
    if (!schema) throw new Error(`No schema at components/schemas/${pointer} to name ${name}`);
    schema["x-fern-type-name"] = name;
  }

  for (const pointer of NOT_NULLABLE[language ?? ""] ?? []) {
    const schema = resolve(doc.components.schemas, pointer);
    const branches = schema?.anyOf;
    if (!schema || !Array.isArray(branches)) {
      throw new Error(`No anyOf at components/schemas/${pointer}`);
    }
    schema.anyOf = branches.filter((branch) => (branch as Schema).type !== "null");
  }

  visitSchemas(doc, widenIntegers);
  return doc;
}

/** Renames component schemas and every `$ref` to them. */
function renameSchemas(doc: OpenApiDocument, renames: Record<string, string>): OpenApiDocument {
  const entries = Object.entries(renames);
  if (entries.length === 0) return doc;
  for (const [from, to] of entries) {
    if (!doc.components.schemas[from]) throw new Error(`No schema ${from} to rename to ${to}`);
    if (doc.components.schemas[to]) throw new Error(`Can't rename ${from}: ${to} already exists`);
  }
  doc.components.schemas = Object.fromEntries(
    Object.entries(doc.components.schemas).map(([name, schema]) => [renames[name] ?? name, schema]),
  );
  const refs = new Map(
    entries.map(([from, to]) => [`#/components/schemas/${from}`, `#/components/schemas/${to}`]),
  );
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const record = node as Record<string, unknown>;
    const ref = typeof record.$ref === "string" ? refs.get(record.$ref) : undefined;
    if (ref) record.$ref = ref;
    for (const child of Object.values(record)) walk(child);
  };
  walk(doc);
  return doc;
}

/** Marks an integer schema that may exceed 2³¹ − 1 (unbounded, or allowed past it) as int64. */
function widenIntegers(schema: Schema): void {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.includes("integer") || schema.format) return;
  const max = typeof schema.maximum === "number" ? schema.maximum : Number.POSITIVE_INFINITY;
  const min = typeof schema.minimum === "number" ? schema.minimum : Number.NEGATIVE_INFINITY;
  if (max > INT32_MAX || min < -INT32_MAX - 1) schema.format = "int64";
}

/** Calls `visit` on every schema object reachable from the document (each one once). */
export function visitSchemas(value: unknown, visit: (schema: Schema) => void): void {
  const seen = new Set<unknown>();
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const record = node as Schema;
    if ("type" in record || "anyOf" in record || "oneOf" in record) visit(record);
    for (const [key, child] of Object.entries(record)) {
      // Examples are data, not schemas (an example error has a `type` too).
      if (key !== "examples" && key !== "example") walk(child);
    }
  };
  walk(value);
}

function resolve(root: Record<string, unknown>, pointer: string): Schema | undefined {
  let node: unknown = root;
  for (const segment of pointer.split("/")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node !== null && typeof node === "object" ? (node as Schema) : undefined;
}
