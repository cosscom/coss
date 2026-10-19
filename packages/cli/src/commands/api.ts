import { readFile } from "node:fs/promises";
import { API_VERSION, type CossError, type CossRequestMethod } from "coss";
import type { Flags } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import { clientFor, resolveCredentials } from "../context.ts";
import { printable } from "../emails/format.ts";
import { apiError, CliError, UsageError } from "../errors.ts";
import { collect, field } from "../fields.ts";
import type { CliIo } from "../io.ts";
import { type Output, toJson } from "../output.ts";

const METHODS: readonly CossRequestMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const FLAGS = {
  method: {
    type: "string",
    short: "X",
    value: "<method>",
    choices: METHODS,
    description: "GET, POST, PUT, PATCH or DELETE (default: GET, or POST with --input)",
  },
  field: {
    type: "string",
    short: "F",
    multiple: true,
    value: "<name=value>",
    description:
      "A field (repeatable). Its value is JSON when it parses (5, true, null, [1,2]), a file's " +
      "contents with @path, else a string; name[]=value adds to a list. GET and DELETE send " +
      "fields as query parameters, other methods as the JSON body",
  },
  "raw-field": {
    type: "string",
    short: "f",
    multiple: true,
    value: "<name=value>",
    description: "A field whose value is always a string (repeatable)",
  },
  input: {
    type: "string",
    value: "<file>",
    description: "The JSON body, from a file or - for stdin (fields then go in the query)",
  },
  paginate: {
    type: "boolean",
    description: "Read every page of a list and print its items, one JSON object per line",
  },
  raw: {
    type: "boolean",
    description:
      "Print the response body as it is, for one that isn't JSON (a CSV export, a received " +
      "email's raw message, an attachment)",
  },
  "api-version": {
    type: "string",
    value: "<date>",
    description: `The API version to call (default: ${API_VERSION}, this CLI's)`,
  },
  json: { type: "boolean", description: "Print JSON on one line instead of indented" },
} as const satisfies Flags;

export const apiCommand: Command = defineCommand({
  name: "api",
  summary: "Call any endpoint of the API",
  usage: "<path> [options]",
  description:
    "Calls an endpoint of the public API with the CLI's key and prints the response's JSON. The " +
    "path is relative to /v1: `coss api domains`, `coss api /v1/emails?limit=5` and " +
    "`coss api -X POST domains/<id>/verify` all work. Every endpoint is in the API reference: " +
    "https://coss.com/docs/api-reference\n\n" +
    "A failed call prints the error as JSON too, and exits with 1.",
  flags: FLAGS,
  positionals: true,
  run: api,
});

/** `domains`, `/domains`, `v1/domains` and `/v1/domains` are all `/v1/domains`. */
export function apiPath(input: string): string {
  const value = input.trim();
  // A URL would send the key wherever it points; the API is the profile's.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
    throw new UsageError(
      `coss api takes a path like /v1/domains, not a URL; got "${input}". The API it calls is ` +
        "your profile's (or COSS_BASE_URL).",
    );
  }
  const path = value.replace(/^\/+/, "").replace(/^v1(\/|$)/, "");
  if (!path || path.startsWith("?")) throw new UsageError("Pass a path, e.g. `coss api domains`.");
  return `/v1/${path}`;
}

async function inputBody(io: CliIo, source: string): Promise<unknown> {
  let text: string;
  try {
    text = source === "-" ? await io.readStdin() : await readFile(source, "utf8");
  } catch (error) {
    throw new CliError(`Couldn't read ${source}: ${(error as Error).message}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new UsageError(`--input takes JSON; ${source === "-" ? "stdin" : source} isn't.`);
  }
}

/**
 * Lists page with `after` set to the last item's `id`, except those of items without one (the
 * API reference's `after` of each list says which field it takes).
 */
export const CURSOR_FIELDS: Readonly<Record<string, string>> = {
  hook_event_type: "name",
  email_template_version: "version",
};

function isList(value: unknown): value is { data: unknown[]; has_more: boolean } {
  const list = value as { object?: unknown; data?: unknown; has_more?: unknown } | null;
  return (
    typeof list === "object" &&
    list !== null &&
    list.object === "list" &&
    Array.isArray(list.data) &&
    typeof list.has_more === "boolean"
  );
}

function print(out: Output, value: unknown): void {
  out.line(out.json ? toJson(value) : toJson(value, 2));
}

/** The error on stdout (it's the response), its explanation on stderr. */
function failure(out: Output, doing: string, error: CossError): CliError {
  if (error.status !== null) print(out, { error });
  if (error.code === "invalid_response") {
    return new CliError(`${doing}: ${error.message}\nAdd --raw to print a body that isn't JSON.`);
  }
  return apiError(doing, error);
}

async function api({ values, positionals, context }: CommandInput<typeof FLAGS>): Promise<number> {
  const { io, out } = context;
  const [input, ...extra] = positionals;
  if (input === undefined) throw new UsageError("Pass a path, e.g. `coss api domains`.");
  if (extra.length > 0) {
    throw new UsageError(`coss api takes one path; got ${positionals.length} arguments.`);
  }
  const path = apiPath(input);
  const method = (values.method?.toUpperCase() ??
    (values.input !== undefined ? "POST" : "GET")) as CossRequestMethod;
  if (!METHODS.includes(method)) {
    throw new UsageError(`--method takes ${METHODS.join(", ")}; got "${values.method}".`);
  }
  if (values.paginate && (method !== "GET" || values.raw)) {
    throw new UsageError("--paginate reads lists: it needs GET, and JSON (no --raw).");
  }
  const version = values["api-version"];
  if (version !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(version)) {
    throw new UsageError("--api-version takes a date, e.g. 2026-10-01.");
  }

  const fields = [
    ...(await Promise.all(
      (values["raw-field"] ?? []).map((pair) => field(pair, false, "raw-field")),
    )),
    ...(await Promise.all((values.field ?? []).map((pair) => field(pair, true, "field")))),
  ];
  const inQuery = method === "GET" || method === "DELETE" || values.input !== undefined;
  const query = inQuery ? (collect(fields, "query") as Record<string, string | string[]>) : {};
  const body =
    values.input !== undefined
      ? await inputBody(io, values.input)
      : !inQuery && fields.length > 0
        ? collect(fields, "body")
        : undefined;

  const credentials = await resolveCredentials(context);
  const coss = clientFor(io, credentials, { apiVersion: version });
  const doing = `${method} ${path}`;

  if (values.paginate) {
    let after: string | undefined;
    for (;;) {
      const { data, error } = await coss.request("GET", path, {
        query: { ...query, ...(after !== undefined && { after }) },
        signal: io.signal,
      });
      if (io.signal.aborted) return 130;
      if (error) throw failure(out, doing, error);
      if (!isList(data)) {
        throw new CliError(
          `${path} isn't a list, so there are no pages to follow: drop --paginate.`,
        );
      }
      for (const item of data.data) out.data(item);
      const last = data.data.at(-1) as Record<string, unknown> | undefined;
      if (!data.has_more || last === undefined) return 0;
      const cursor = last[CURSOR_FIELDS[String(last.object)] ?? "id"];
      if (typeof cursor !== "string" && typeof cursor !== "number") {
        throw new CliError(`${path}'s items have no id to read the next page after.`);
      }
      after = String(cursor);
    }
  }

  const { data, error } = await coss.request(method, path, {
    query,
    body,
    signal: io.signal,
    ...(values.raw && { responseType: "bytes" as const }),
  });
  if (io.signal.aborted) return 130;
  if (error) throw failure(out, doing, error);
  if (values.raw) {
    // Bytes as they came, unless they'd reach a terminal: then the text without control characters.
    if (io.stdout.isTTY) out.line(printable(new TextDecoder().decode(data as Uint8Array), true));
    else out.raw(data as Uint8Array);
  } else print(out, data);
  return 0;
}
