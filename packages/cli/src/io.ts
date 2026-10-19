/**
 * Everything the CLI touches outside itself, injectable so tests can run commands in process: the
 * environment, terminal streams, `fetch`, the clock, the browser, the config directory and the
 * interrupt signal. `nodeIo()` is the real thing.
 */
import { spawn } from "node:child_process";
import { homedir, hostname } from "node:os";
import { join } from "node:path";

export interface OutputStream {
  /** Text, or bytes as they are (`coss api --raw`). */
  write(chunk: string | Uint8Array): void;
  isTTY?: boolean;
}

/** `fetch` as the CLI calls it (the SDK's `FetchLike` too). */
export type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface CliIo {
  env: Record<string, string | undefined>;
  stdout: OutputStream;
  stderr: OutputStream;
  /** Whether stdin is a terminal (prompts can be answered). */
  stdinIsTTY: boolean;
  fetch: Fetch;
  now(): Date;
  /** Resolves after `ms`, or as soon as `signal` aborts. */
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  /** Opens `url` in the default browser; `false` when none could be started. */
  openBrowser(url: string): Promise<boolean>;
  /** Everything piped to stdin, as text (`coss api --input -`). */
  readStdin(): Promise<string>;
  /** Asks a question on stderr and reads one line (not echoed when `secret`). */
  prompt(question: string, options?: { secret?: boolean }): Promise<string>;
  /** This machine's name (names the CLI's API key and listener). */
  hostname(): string;
  /** Where `config.json` lives. */
  configDir: string;
  /** Aborted on Ctrl-C (SIGINT) and SIGTERM. */
  signal: AbortSignal;
}

/** `$XDG_CONFIG_HOME/coss`, `%APPDATA%\coss` on Windows, else `~/.config/coss`. */
export function defaultConfigDir(
  env: Record<string, string | undefined>,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string {
  if (env.XDG_CONFIG_HOME) return join(env.XDG_CONFIG_HOME, "coss");
  if (platform === "win32" && env.APPDATA) return join(env.APPDATA, "coss");
  return join(home, ".config", "coss");
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
  });
}

function browserCommand(url: string): [string, string[]] {
  if (process.platform === "darwin") return ["open", [url]];
  // `start` would read `&` in the URL as a command separator.
  if (process.platform === "win32") return ["rundll32", ["url.dll,FileProtocolHandler", url]];
  return ["xdg-open", [url]];
}

function openBrowser(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const [command, args] = browserCommand(url);
    try {
      const child = spawn(command, args, { detached: true, stdio: "ignore" });
      child.once("error", () => resolve(false));
      child.once("spawn", () => {
        child.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

/** Reads a line from a non-terminal stdin (e.g. `echo $KEY | coss login --manual`). */
async function readPipedLine(): Promise<string> {
  let text = "";
  for await (const chunk of process.stdin) {
    text += String(chunk);
    if (text.includes("\n")) break;
  }
  return text.split(/\r?\n/)[0]?.trim() ?? "";
}

/** One line from the terminal, typed without echo when `secret` (raw mode). */
function readTerminalLine(secret: boolean): Promise<string> {
  const stdin = process.stdin;
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stderr.write("\n");
      if (error) reject(error);
      else resolve(value.trim());
    };
    const onData = (chunk: Buffer | string) => {
      for (const char of String(chunk)) {
        if (char === "\r" || char === "\n") return finish();
        if (char === "\u0003") return finish(new Error("Interrupted."));
        if (char === "\u007f" || char === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            if (!secret) process.stderr.write("\b \b");
          }
          continue;
        }
        value += char;
        if (!secret) process.stderr.write(char);
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

/** The real process: its environment, streams, network and signals. */
export function nodeIo(): CliIo {
  const controller = new AbortController();
  let interrupts = 0;
  for (const name of ["SIGINT", "SIGTERM"] as const) {
    process.on(name, () => {
      interrupts++;
      // A second Ctrl-C doesn't wait for the cleanup the first one started.
      if (interrupts > 1) process.exit(130);
      controller.abort();
    });
  }
  return {
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
    stdinIsTTY: process.stdin.isTTY === true,
    fetch: (input, init) => globalThis.fetch(input, init),
    now: () => new Date(),
    sleep,
    openBrowser,
    async readStdin() {
      // Decoded once: a character can be split between chunks.
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks).toString("utf8");
    },
    async prompt(question, options = {}) {
      process.stderr.write(question);
      if (!process.stdin.isTTY) {
        const line = await readPipedLine();
        // Nothing was echoed: end the prompt's line.
        process.stderr.write("\n");
        return line;
      }
      return readTerminalLine(options.secret === true);
    },
    hostname: () => hostname(),
    configDir: defaultConfigDir(process.env),
    signal: controller.signal,
  };
}
