/**
 * A development key from the project env file, for when the MCP process itself has no
 * `COSS_API_KEY`. A `coss_live_` key in that file is never loaded: the user sets that explicitly.
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

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
