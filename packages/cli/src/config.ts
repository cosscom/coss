/**
 * `config.json` in the config directory: the saved profiles (an API key each, with what it belongs
 * to). Written atomically and readable only by its owner (0600), like other CLIs' credentials.
 */
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CliError } from "./errors.ts";
import type { CliIo } from "./io.ts";

export const DEFAULT_PROFILE = "default";

export type Named = { id: string; name: string; slug: string };

export type Profile = {
  api_key: string;
  api_key_id?: string;
  /** How the key was saved: `browser` keys were created for the CLI, so logout revokes them. */
  login: "browser" | "manual";
  /** Set when signed in against another API (`COSS_BASE_URL` at login). */
  base_url?: string;
  dashboard_url?: string;
  organization?: Named;
  project?: Named;
  environment?: Named & { mode: "live" | "sandbox" };
  /** `coss listen`'s signing secret, stable so the local app's configuration doesn't change. */
  listen_secret?: string;
  created_at: string;
};

export type Config = {
  version: 1;
  default_profile?: string;
  profiles: Record<string, Profile>;
};

export function configPath(io: CliIo): string {
  return join(io.configDir, "config.json");
}

const PROFILE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

export function checkedProfileName(name: string): string {
  if (!PROFILE_NAME.test(name)) {
    throw new CliError(`Invalid profile name "${name}": use letters, digits, ".", "-" or "_".`, 2);
  }
  return name;
}

export async function readConfig(io: CliIo): Promise<Config> {
  const path = configPath(io);
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, profiles: {} };
    throw error;
  }
  try {
    const parsed = JSON.parse(text) as Partial<Config>;
    if (parsed.version !== 1 || typeof parsed.profiles !== "object" || parsed.profiles === null) {
      throw new Error("unknown format");
    }
    return {
      version: 1,
      default_profile: parsed.default_profile,
      profiles: parsed.profiles,
    };
  } catch {
    throw new CliError(`${path} is not a valid coss.com CLI config. Fix it or delete it.`);
  }
}

/** Whether others can read the file (only checked where permissions mean something). */
export async function configIsShared(io: CliIo): Promise<boolean> {
  if (process.platform === "win32") return false;
  try {
    return ((await stat(configPath(io))).mode & 0o077) !== 0;
  } catch {
    return false;
  }
}

export async function writeConfig(io: CliIo, config: Config): Promise<void> {
  await mkdir(io.configDir, { recursive: true, mode: 0o700 });
  const path = configPath(io);
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  // The mode of `writeFile` is masked by the umask; be explicit.
  await chmod(temporary, 0o600);
  await rename(temporary, path);
}

/** The profile commands use: `--profile`, else `COSS_PROFILE`, else the saved default. */
export function profileName(io: CliIo, config: Config, flag: string | undefined): string {
  return checkedProfileName(
    flag ?? io.env.COSS_PROFILE ?? config.default_profile ?? DEFAULT_PROFILE,
  );
}
