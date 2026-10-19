/**
 * The update notice: at most once a day, one GET of coss-cli's latest version from the npm
 * registry (nothing else is sent), cached in the config directory. It runs alongside the command
 * and never delays or fails it: a check still running when the command ends is dropped.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CliIo } from "./io.ts";
import { VERSION } from "./version.ts";

export const LATEST_URL = "https://registry.npmjs.org/coss-cli/latest";
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 2000;

type Cache = { checked_at: string; latest: string | null };

function enabled(value: string | undefined): boolean {
  return value !== undefined && value !== "" && value !== "0" && value.toLowerCase() !== "false";
}

/** Whether this invocation may show the notice: a person at a terminal, not CI or a pipe. */
export function updateCheckAllowed(io: CliIo, argv: readonly string[]): boolean {
  return (
    io.stderr.isTTY === true &&
    !argv.includes("--json") &&
    !enabled(io.env.CI) &&
    !enabled(io.env.COSS_NO_UPDATE_CHECK)
  );
}

/** `1.2.3` → [1, 2, 3]; `null` for anything else (pre-releases included: they're never nagged). */
function parse(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function isNewer(latest: string, current: string): boolean {
  const a = parse(latest);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

function cachePath(io: CliIo): string {
  return join(io.configDir, "update-check.json");
}

async function readCache(io: CliIo): Promise<Cache | null> {
  try {
    const cache = JSON.parse(await readFile(cachePath(io), "utf8")) as Partial<Cache>;
    if (typeof cache.checked_at !== "string") return null;
    return {
      checked_at: cache.checked_at,
      latest: typeof cache.latest === "string" ? cache.latest : null,
    };
  } catch {
    return null;
  }
}

async function fetchLatest(io: CliIo): Promise<string | null> {
  try {
    const response = await io.fetch(LATEST_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.any([io.signal, AbortSignal.timeout(TIMEOUT_MS)]),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { version?: unknown };
    return typeof body.version === "string" ? body.version : null;
  } catch {
    return null;
  }
}

/** The notice to print after the command (`null`: none). Never rejects. */
export async function checkForUpdate(io: CliIo, current: string = VERSION): Promise<string | null> {
  try {
    const cache = await readCache(io);
    let latest = cache?.latest ?? null;
    const age = cache
      ? io.now().getTime() - Date.parse(cache.checked_at)
      : Number.POSITIVE_INFINITY;
    if (!(age >= 0 && age < CHECK_EVERY_MS)) {
      // A failed check keeps the last answer and waits a day too: offline, it isn't retried on
      // every command.
      latest = (await fetchLatest(io)) ?? latest;
      const next: Cache = { checked_at: io.now().toISOString(), latest };
      await mkdir(io.configDir, { recursive: true, mode: 0o700 })
        .then(() => writeFile(cachePath(io), `${JSON.stringify(next)}\n`, { mode: 0o600 }))
        .catch(() => undefined);
    }
    if (!latest || !isNewer(latest, current)) return null;
    return `coss-cli ${latest} is available (this is ${current}): npm i -g coss-cli`;
  } catch {
    return null;
  }
}
