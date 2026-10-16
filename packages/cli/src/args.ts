import { type ParseArgsOptionsConfig, parseArgs } from "node:util";
import { UsageError } from "./errors.ts";

/** Flags every command takes. */
const GLOBAL_OPTIONS = {
  profile: { type: "string" },
  json: { type: "boolean" },
  "no-color": { type: "boolean" },
  help: { type: "boolean", short: "h" },
} as const satisfies ParseArgsOptionsConfig;

export type GlobalFlags = { profile?: string; json: boolean; color: boolean; help: boolean };

type OptionValue<O> = O extends { type: "boolean" }
  ? O extends { multiple: true }
    ? boolean[]
    : boolean
  : O extends { multiple: true }
    ? string[]
    : string;

/** What `parseArgs` gives for these options (each may be missing). */
export type FlagValues<T extends ParseArgsOptionsConfig> = { [K in keyof T]?: OptionValue<T[K]> };

export type ParsedFlags<T extends ParseArgsOptionsConfig> = {
  values: FlagValues<T>;
  positionals: string[];
  global: GlobalFlags;
};

/** Parses a command's flags (strict: unknown flags are a usage error) plus the global ones. */
export function parseFlags<const T extends ParseArgsOptionsConfig>(
  argv: string[],
  options: T,
  allowPositionals = false,
): ParsedFlags<T> {
  try {
    const parsed = parseArgs({
      args: argv,
      options: { ...GLOBAL_OPTIONS, ...options },
      strict: true,
      allowPositionals,
    });
    const values = parsed.values as Record<string, unknown>;
    const global: GlobalFlags = {
      profile: typeof values.profile === "string" ? values.profile : undefined,
      json: values.json === true,
      color: values["no-color"] !== true,
      help: values.help === true,
    };
    return { values: parsed.values as FlagValues<T>, positionals: parsed.positionals, global };
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
}

/** Repeatable flags that may also be comma-separated: `--events a,b --events c`. */
/**
 * Email addresses from repeated and comma-separated flags. Commas inside a quoted display name
 * (`"Acme, Inc." <hello@acme.com>`) or angle brackets don't separate addresses.
 */
export function addresses(value: string | string[] | undefined): string[] {
  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const item of values) {
    let current = "";
    let quoted = false;
    let angle = false;
    for (let i = 0; i < item.length; i++) {
      const char = item[i];
      if (quoted && char === "\\" && i + 1 < item.length) {
        current += char + item[++i];
        continue;
      }
      if (char === '"') quoted = !quoted;
      else if (!quoted && char === "<") angle = true;
      else if (!quoted && char === ">") angle = false;
      else if (char === "," && !quoted && !angle) {
        out.push(current);
        current = "";
        continue;
      }
      current += char;
    }
    out.push(current);
  }
  return out.map((item) => item.trim()).filter(Boolean);
}

export function list(value: string | string[] | undefined): string[] {
  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}
