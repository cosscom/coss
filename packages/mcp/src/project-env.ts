/**
 * The project env file: a development key when the MCP process itself has no `COSS_API_KEY`
 * (a `coss_live_` key in that file is never loaded), and where `create_webhook_endpoint` writes
 * `COSS_WEBHOOK_SECRET`. The file choice matches the CLI (`coss init`, `coss listen`,
 * `coss webhooks add`): the file that already holds `COSS_API_KEY` or `COSS_WEBHOOK_SECRET`,
 * else `.env.local` in a Next.js project and `.env` otherwise.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const NAMED = (name: string): RegExp =>
  new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*["']?([^"'\\s#]*)`, "m");

function value(text: string, name: string): string {
  return NAMED(name).exec(text)?.[1] ?? "";
}

export type ProjectKey =
  | { kind: "test"; apiKey: string; baseUrl?: string; file: string }
  | { kind: "live"; file: string }
  | { kind: "none" };

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

/**
 * Walks from `dir` upward. At each directory, `.env.local` is read before `.env`. The first
 * `COSS_API_KEY` wins: a `coss_test_` key is returned, and anything else (including `coss_live_`)
 * stops the walk so a parent project's key is not picked up after this one refused.
 */
export async function readProjectApiKey(dir: string): Promise<ProjectKey> {
  let current = resolve(dir);
  for (;;) {
    for (const name of [".env.local", ".env"]) {
      const path = join(current, name);
      const text = await readOptional(path);
      if (text === null) continue;
      const apiKey = value(text, "COSS_API_KEY");
      if (!apiKey) continue;
      if (apiKey.startsWith("coss_test_")) {
        const baseUrl = value(text, "COSS_BASE_URL");
        return { kind: "test", apiKey, ...(baseUrl ? { baseUrl } : {}), file: path };
      }
      return { kind: "live", file: path };
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return { kind: "none" };
}

const WEBHOOK_SECRET = "COSS_WEBHOOK_SECRET";

/** `text` with `name=value` set: an existing line replaced, else one appended. */
function setEnvVar(text: string, name: string, value: string): string {
  const line = new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=.*$`, "m");
  // A function, so `$` in the value is never a replacement pattern.
  if (line.test(text)) return text.replace(line, () => `${name}=${value}`);
  const separator = text === "" || text.endsWith("\n") ? "" : "\n";
  return `${text}${separator}${name}=${value}\n`;
}

function holdsCredential(text: string): boolean {
  return value(text, "COSS_API_KEY") !== "" || value(text, WEBHOOK_SECRET) !== "";
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

interface EnvFile {
  path: string;
  text: string | null;
}

/** The env file `coss webhooks add` would write, walking up from `dir`. */
async function projectEnvFile(dir: string): Promise<EnvFile> {
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

/**
 * Writes `COSS_WEBHOOK_SECRET` into the project env file. A different value already there is
 * replaced, so `coss listen` and `verifyWebhook` use the endpoint's secret. A new file is mode
 * 0600. `file` is relative to `dir`.
 */
export async function saveWebhookSecret(
  dir: string,
  secret: string,
): Promise<{ file: string; replaced: boolean; wrote: boolean }> {
  const file = await projectEnvFile(dir);
  const existing = file.text ? value(file.text, WEBHOOK_SECRET) : "";
  const next = setEnvVar(file.text ?? "", WEBHOOK_SECRET, secret);
  const wrote = next !== (file.text ?? "");
  if (wrote) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, next, file.text === null ? { mode: 0o600 } : undefined);
  }
  return {
    file: relative(resolve(dir), file.path) || file.path,
    replaced: existing !== "" && existing !== secret,
    wrote,
  };
}
