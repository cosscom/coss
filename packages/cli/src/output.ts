import type { CliIo } from "./io.ts";

const CODES = {
  bold: 1,
  dim: 2,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  gray: 90,
} as const;

export type Style = keyof typeof CODES;

/**
 * Results go to stdout (one JSON object per line with `--json`, for pipes); progress, prompts and
 * warnings to stderr. Colors only on a terminal, never with `NO_COLOR`, `--no-color` or `--json`.
 */
export class Output {
  readonly json: boolean;
  readonly #io: CliIo;
  readonly #color: boolean;

  constructor(io: CliIo, options: { json: boolean; color: boolean }) {
    this.#io = io;
    this.json = options.json;
    this.#color =
      options.color && !options.json && io.stdout.isTTY === true && !("NO_COLOR" in io.env);
  }

  style(style: Style | Style[], text: string): string {
    if (!this.#color) return text;
    const codes = (Array.isArray(style) ? style : [style]).map((name) => CODES[name]).join(";");
    return `\u001b[${codes}m${text}\u001b[0m`;
  }

  /** A result line (stdout). */
  line(text = ""): void {
    this.#io.stdout.write(`${text}\n`);
  }

  /** A result as one JSON line (stdout). */
  data(value: unknown): void {
    this.#io.stdout.write(`${JSON.stringify(value)}\n`);
  }

  /** Progress or context (stderr), so stdout stays the result. */
  info(text = ""): void {
    this.#io.stderr.write(`${text}\n`);
  }

  warn(text: string): void {
    this.#io.stderr.write(`${this.style("yellow", "!")} ${text}\n`);
  }

  error(text: string): void {
    this.#io.stderr.write(`${this.style("red", "✖")} ${text}\n`);
  }
}
