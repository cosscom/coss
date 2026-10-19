/**
 * The one description of each command: `run` dispatches by it, and help and shell completion are
 * generated from it, so they can't drift from the flags a command actually takes.
 */
import { type Flag, type Flags, type FlagValues, GLOBAL_FLAGS } from "./args.ts";
import type { Context } from "./context.ts";
import type { CliIo } from "./io.ts";

export type CommandInput<F extends Flags> = {
  values: FlagValues<F>;
  positionals: string[];
  context: Context;
};

export type Command<F extends Flags = Flags> = {
  /** As typed: `emails send`. */
  name: string;
  /** One line for `coss --help`. */
  summary: string;
  /** What follows the name in the usage line. Default `[options]`. */
  usage?: string;
  /** What the command does, for `coss <command> --help` (paragraphs, wrapped to the width). */
  description: string;
  flags: F;
  /** Takes positional arguments (`coss api <path>`). */
  positionals?: boolean;
  /** Values completion offers for the positional arguments. */
  positionalChoices?: readonly string[];
  /** Or values that depend on the machine (saved profiles). */
  completePositional?: (io: CliIo) => Promise<readonly string[]>;
  /** Not followed by the update notice (instant or machine-read commands). */
  noUpdateNotice?: boolean;
  run(input: CommandInput<F>): Promise<number>;
};

/** Keeps a command's flag names in its `run`'s types. */
export function defineCommand<const F extends Flags>(command: Command<F>): Command<F> {
  return command;
}

const WIDTH = 100;
/** Flags whose label is longer get their description on the next line. */
const MAX_LABEL = 26;

/** Words of `text` in lines of at most `width - indent` characters, indented by `indent`. */
export function wrap(text: string, indent: number, width: number = WIDTH): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && indent + line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.map((text) => " ".repeat(indent) + text);
}

export function flagLabel(name: string, flag: Flag): string {
  const short = flag.short ? `-${flag.short}, ` : "";
  return `${short}--${name}${flag.value ? ` ${flag.value}` : ""}`;
}

/** `  --to <address>   Recipient…` lines, descriptions aligned and wrapped. */
export function flagTable(flags: Flags): string[] {
  const entries = Object.entries(flags).map(
    ([name, flag]) => [flagLabel(name, flag), flag] as const,
  );
  const column = Math.min(MAX_LABEL, Math.max(...entries.map(([label]) => label.length))) + 4;
  const lines: string[] = [];
  for (const [label, flag] of entries) {
    const description = wrap(flag.description, column);
    if (label.length + 4 > column) {
      lines.push(`  ${label}`, ...description);
    } else {
      const [first = "", ...rest] = description;
      lines.push(`  ${label.padEnd(column - 2)}${first.slice(column)}`, ...rest);
    }
  }
  return lines;
}

/** `coss <command> --help`. */
export function commandHelp(command: Command): string {
  const own = command.flags;
  const shared = Object.keys(GLOBAL_FLAGS).filter((name) => !(name in own));
  const lines = [
    `Usage: coss ${command.name} ${command.usage ?? "[options]"}`,
    "",
    ...command.description
      .split("\n\n")
      .flatMap((paragraph, index) => [...(index > 0 ? [""] : []), ...wrap(paragraph, 0)]),
  ];
  if (Object.keys(own).length > 0) lines.push("", "Options:", ...flagTable(own));
  lines.push(
    "",
    ...wrap(
      `Also: ${shared.map((name) => flagLabel(name, GLOBAL_FLAGS[name] as Flag)).join(", ")}.`,
      0,
    ),
  );
  return `${lines.join("\n")}\n`;
}
