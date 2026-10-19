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

const STYLE_CODES = new Set(["0", ...Object.values(CODES).map(String)]);
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point.
const CONTROLS = /\u001b\[([\d;]*)m|[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;

/**
 * `value` as JSON whose text has no control characters: JSON escapes C0 controls itself, and DEL
 * and C1 controls (which terminals can read as escape sequences) are escaped here.
 */
export function toJson(value: unknown, indent?: number): string {
  return JSON.stringify(value, null, indent).replace(
    /[\u007f-\u009f]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/**
 * `text` as the terminal may get it: tab, newline and the styles `Output.style` adds, nothing else.
 * Lines carry text from elsewhere (an email's subject, a webhook receiver's answer, a DNS record),
 * which must never move the cursor, retitle the window or write the clipboard.
 */
export function terminalSafe(text: string): string {
  return text.replace(CONTROLS, (match, codes: string | undefined) =>
    codes?.split(";").every((code) => STYLE_CODES.has(code)) ? match : "",
  );
}

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
    this.#io.stdout.write(`${terminalSafe(text)}\n`);
  }

  /** A result as one JSON line (stdout). */
  data(value: unknown): void {
    this.#io.stdout.write(`${toJson(value)}\n`);
  }

  /** A result as it came (stdout), bytes included: only for output that isn't a terminal's. */
  raw(chunk: string | Uint8Array): void {
    this.#io.stdout.write(chunk);
  }

  /** Progress or context (stderr), so stdout stays the result. */
  info(text = ""): void {
    this.#io.stderr.write(`${terminalSafe(text)}\n`);
  }

  warn(text: string): void {
    this.#io.stderr.write(`${this.style("yellow", "!")} ${terminalSafe(text)}\n`);
  }

  error(text: string): void {
    this.#io.stderr.write(`${this.style("red", "✖")} ${terminalSafe(text)}\n`);
  }
}
