/**
 * `name=value` fields and JSON values from the command line, shared by `coss api` and the commands
 * that send a JSON payload (`coss hooks send -F …`, `--data`).
 */
import { readFile } from "node:fs/promises";
import { CliError, UsageError } from "./errors.ts";
import type { CliIo } from "./io.ts";

/** A field of `-F`/`-f`: `name[]=value` adds to a list. */
export type Field = { name: string; list: boolean; value: unknown; text: string };

export async function field(pair: string, typed: boolean, flag: string): Promise<Field> {
  const index = pair.indexOf("=");
  const key = index > 0 ? pair.slice(0, index) : "";
  const list = key.endsWith("[]");
  const name = list ? key.slice(0, -2) : key;
  if (!name) throw new UsageError(`--${flag} takes name=value, got "${pair}".`);
  let text = pair.slice(index + 1);
  if (!typed) return { name, list, value: text, text };
  if (text.startsWith("@")) {
    const file = text.slice(1);
    try {
      text = await readFile(file, "utf8");
    } catch (error) {
      throw new CliError(`Couldn't read ${file}: ${(error as Error).message}`);
    }
    return { name, list, value: text, text };
  }
  try {
    return { name, list, value: JSON.parse(text) as unknown, text };
  } catch {
    return { name, list, value: text, text };
  }
}

/** Fields as a JSON body (typed values) or as query parameters (the text as typed). */
export function collect(fields: Field[], as: "body" | "query"): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const item of fields) {
    const value = as === "body" ? item.value : item.text;
    if (!item.list) out[item.name] = value;
    else out[item.name] = [...((out[item.name] as unknown[] | undefined) ?? []), value];
  }
  return out;
}

/**
 * A JSON value given on the command line: inline (`'{"a":1}'`), `@path` (a file) or `-` (stdin).
 * `flag` names it in errors.
 */
export async function jsonValue(io: CliIo, source: string, flag: string): Promise<unknown> {
  let text = source;
  if (source === "-" || source.startsWith("@")) {
    const file = source.slice(1);
    try {
      text = source === "-" ? await io.readStdin() : await readFile(file, "utf8");
    } catch (error) {
      throw new CliError(`Couldn't read ${file}: ${(error as Error).message}`);
    }
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new UsageError(`--${flag} takes JSON (inline, @file or - for stdin).`);
  }
}

/** A JSON object given on the command line (see `jsonValue`). */
export async function jsonObject(
  io: CliIo,
  source: string,
  flag: string,
): Promise<Record<string, unknown>> {
  const value = await jsonValue(io, source, flag);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new UsageError(`--${flag} takes a JSON object, e.g. '{"id":"in_1"}'.`);
  }
  return value as Record<string, unknown>;
}
