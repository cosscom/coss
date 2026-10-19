/**
 * Everything the CLI touches outside itself, injectable so tests can run commands in process: the
 * environment, terminal streams, `fetch`, the clock, the browser, the config directory and the
 * interrupt signal. `nodeIo()` is the real thing.
 */
import { spawn } from "node:child_process";
import { watch } from "node:fs";
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
  /**
   * Calls `onChange` with the name of each file that changes in `dir` (not its subdirectories)
   * until `signal` aborts (`coss templates push --watch`).
   */
  watch(dir: string, signal: AbortSignal, onChange: (file: string) => void): void;
  /** This machine's name (names the CLI's API key and listener). */
  hostname(): string;
  /** The directory the command runs in (`coss init`'s project). */
  cwd: string;
  /**
   * Runs a program (a package manager, `git`) and resolves with its exit code, `null` when it
   * couldn't be started. Its output goes to stderr (stdout stays the result), or nowhere when
   * `quiet`.
   */
  exec(
    command: string,
    args: string[],
    options: { cwd: string; quiet?: boolean },
  ): Promise<number | null>;
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

/** Package managers that are `.cmd` shims on Windows, which only a shell can start. */
const WINDOWS_SHIMS = new Set(["npm", "npx", "pnpm", "yarn"]);
/** What may go through that shell unquoted: the CLI's own arguments (`add coss`), nothing else. */
const SHELL_SAFE = /^[\w@./:=-]+$/;

/**
 * Whether `command` runs through a shell: only a Windows package-manager shim, and only with
 * arguments a shell reads as they are. `null`: refuse (it would need quoting cmd.exe can't do).
 * Anything else, like git with a user's path, never goes through one.
 */
export function shellFor(
  command: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
): boolean | null {
  if (platform !== "win32" || !WINDOWS_SHIMS.has(command)) return false;
  return args.every((arg) => SHELL_SAFE.test(arg)) ? true : null;
}

function exec(
  command: string,
  args: string[],
  options: { cwd: string; quiet?: boolean },
): Promise<number | null> {
  return new Promise((resolve) => {
    const shell = shellFor(command, args);
    if (shell === null) return resolve(null);
    try {
      const child = spawn(command, args, {
        cwd: options.cwd,
        // The child's output on our stderr: stdout is the command's result.
        stdio: options.quiet ? "ignore" : ["ignore", 2, 2],
        shell,
      });
      child.once("error", () => resolve(null));
      child.once("close", (code) => resolve(code ?? 1));
    } catch {
      resolve(null);
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

/** Writes not yet handed to the OS: the bin waits for them before it exits. */
const pending = new Set<Promise<void>>();

/**
 * A stream whose every write is tracked until its callback. `writableLength` isn't enough: the
 * compiled (Bun) binary reports 0 while a pipe still has output queued, and exiting then cut a
 * busy `coss api --paginate | …` short.
 */
function tracked(stream: NodeJS.WriteStream): OutputStream {
  return {
    get isTTY() {
      return stream.isTTY;
    },
    write(chunk) {
      const written = new Promise<void>((resolve) => {
        // Called with an error too (a closed pipe): nothing more will be written either way.
        stream.write(chunk, () => resolve());
      });
      pending.add(written);
      void written.then(() => pending.delete(written));
    },
  };
}

/** Resolves once every write so far has reached the OS. */
export async function flushOutput(): Promise<void> {
  while (pending.size > 0) await Promise.all(pending);
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
    stdout: tracked(process.stdout),
    stderr: tracked(process.stderr),
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
    watch(dir, signal, onChange) {
      const watcher = watch(dir, { signal }, (_event, file) => {
        if (file) onChange(String(file));
      });
      // Aborting closes it; anything else (the directory removed) just ends the watch.
      watcher.on("error", () => watcher.close());
    },
    hostname: () => hostname(),
    cwd: process.cwd(),
    exec,
    configDir: defaultConfigDir(process.env),
    signal: controller.signal,
  };
}
