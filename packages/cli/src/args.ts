import { type ParseArgsOptionsConfig, parseArgs } from "node:util";
import { savedProfileNames } from "./config.ts";
import { UsageError } from "./errors.ts";
import type { CliIo } from "./io.ts";

/** A flag as a command declares it: what `parseArgs` needs, plus what help and completion show. */
export type Flag = {
  type: "string" | "boolean";
  short?: string;
  multiple?: boolean;
  /** The value's placeholder in help: `--to <address>`. */
  value?: string;
  description: string;
  /** Values completion offers. */
  choices?: readonly string[];
  /** Values completion offers that depend on the machine (saved profiles). */
  complete?: (io: CliIo) => Promise<readonly string[]>;
};

export type Flags = Record<string, Flag>;

/** Flags every command takes. A command may declare one again to describe it its own way. */
export const GLOBAL_FLAGS: Flags = {
  profile: {
    type: "string",
    value: "<name>",
    description: "Use a saved profile other than the default (or set COSS_PROFILE)",
    complete: savedProfileNames,
  },
  json: { type: "boolean", description: "Machine-readable output" },
  "no-color": { type: "boolean", description: "No colors (also NO_COLOR)" },
  help: { type: "boolean", short: "h", description: "Help for a command" },
};

export type GlobalFlags = { profile?: string; json: boolean; color: boolean; help: boolean };

type OptionValue<O> = O extends { type: "boolean" }
  ? O extends { multiple: true }
    ? boolean[]
    : boolean
  : O extends { multiple: true }
    ? string[]
    : string;

/** What `parseArgs` gives for these flags (each may be missing). */
export type FlagValues<T extends Flags> = { [K in keyof T]?: OptionValue<T[K]> };

export type ParsedFlags<T extends Flags> = {
  values: FlagValues<T>;
  positionals: string[];
  global: GlobalFlags;
};

/** Parses a command's flags (strict: unknown flags are a usage error) plus the global ones. */
export function parseFlags<const T extends Flags>(
  argv: string[],
  flags: T,
  allowPositionals = false,
): ParsedFlags<T> {
  const options: ParseArgsOptionsConfig = {};
  for (const [name, flag] of Object.entries({ ...GLOBAL_FLAGS, ...flags })) {
    options[name] = {
      type: flag.type,
      ...(flag.short && { short: flag.short }),
      ...(flag.multiple && { multiple: true }),
    };
  }
  try {
    const parsed = parseArgs({ args: argv, options, strict: true, allowPositionals });
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

/**
 * A command's positional arguments when it takes exactly `count` (`usage` is the command line to
 * show otherwise, without `coss`).
 */
export function requireArgs(positionals: string[], count: number, usage: string): string[] {
  if (positionals.length !== count) {
    throw new UsageError(
      `Usage: coss ${usage}${positionals.length > count ? ` (got ${positionals.length} arguments)` : ""}`,
    );
  }
  return positionals;
}

/** Repeatable flags that may also be comma-separated: `--events a,b --events c`. */
export function list(value: string | string[] | undefined): string[] {
  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}
