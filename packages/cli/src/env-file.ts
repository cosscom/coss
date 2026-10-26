/**
 * The project's env file: where `coss init` writes `COSS_API_KEY` and `coss listen` writes
 * `COSS_WEBHOOK_SECRET`. One file holds both, so a handler and the CLI share them.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/** The env file with `name=value` set: an existing line replaced, else one appended. */
export function setEnvVar(text: string, name: string, value: string): string {
  const line = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=.*$`, "m");
  // A function, so `$` in the value is never a replacement pattern.
  if (line.test(text)) return text.replace(line, () => `${name}=${value}`);
  const separator = text === "" || text.endsWith("\n") ? "" : "\n";
  return `${text}${separator}${name}=${value}\n`;
}

/** `text` without `name`'s assignments. */
export function removeEnvVar(text: string, name: string): string {
  return text.replace(
    new RegExp(`^[ \\t]*(?:export[ \\t]+)?${name}[ \\t]*=.*(?:\\r?\\n|$)`, "gm"),
    "",
  );
}

/** The value of `name` in an env file, without surrounding quotes. Empty when it is absent. */
export function readEnvValue(text: string, name: string): string {
  const match = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*["']?([^"'\\s#]*)`, "m").exec(text);
  return match?.[1] ?? "";
}

export interface ProjectEnvFile {
  path: string;
  /** `null` when the file does not exist yet. */
  text: string | null;
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

function holdsCredential(text: string): boolean {
  return (
    readEnvValue(text, "COSS_API_KEY") !== "" || readEnvValue(text, "COSS_WEBHOOK_SECRET") !== ""
  );
}

async function isNextProject(dir: string): Promise<boolean> {
  const text = await readOptional(join(dir, "package.json"));
  if (!text) return false;
  try {
    const pkg = JSON.parse(text) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };
    return Boolean(pkg.dependencies?.next ?? pkg.devDependencies?.next);
  } catch {
    return false;
  }
}

/**
 * The env file that already holds `COSS_API_KEY` or `COSS_WEBHOOK_SECRET` (`.env.local` before
 * `.env`, walking up from `dir`), else the file `coss init` would create: `.env.local` in a
 * Next.js project, `.env` otherwise.
 */
export async function projectEnvFile(dir: string): Promise<ProjectEnvFile> {
  let current = resolve(dir);
  for (;;) {
    for (const name of [".env.local", ".env"]) {
      const path = join(current, name);
      const text = await readOptional(path);
      if (text !== null && holdsCredential(text)) return { path, text };
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const root = resolve(dir);
  const path = join(root, (await isNextProject(root)) ? ".env.local" : ".env");
  return { path, text: await readOptional(path) };
}

/** Writes `name=value` into the file. Returns whether the file changed. A new file is mode 0600. */
export async function writeEnvValue(
  file: ProjectEnvFile,
  name: string,
  value: string,
): Promise<boolean> {
  const next = setEnvVar(file.text ?? "", name, value);
  if (next === (file.text ?? "")) return false;
  await mkdir(dirname(file.path), { recursive: true });
  await writeFile(file.path, next, file.text === null ? { mode: 0o600 } : undefined);
  file.text = next;
  return true;
}
