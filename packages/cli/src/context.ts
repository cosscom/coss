/**
 * Which key, API and dashboard a command uses. `COSS_API_KEY` wins over a saved profile (CI, one-off
 * commands); there is no flag for it, since command lines are visible to other local processes.
 */
import { type ApiVersion, Coss } from "coss";
import type { GlobalFlags } from "./args.ts";
import { type Config, type Profile, profileName, readConfig } from "./config.ts";
import { CliError } from "./errors.ts";
import type { CliIo } from "./io.ts";
import { Output } from "./output.ts";

export const DEFAULT_BASE_URL = "https://api.coss.com";
export const DEFAULT_DASHBOARD_URL = "https://coss.com";
export const API_KEY_FORMAT: RegExp = /^coss_(live|test)_[A-Za-z]{64}$/;

export type Credentials = {
  apiKey: string;
  /** Where the key came from, for `coss whoami`. */
  source: "env" | "profile";
  profileName: string;
  /** The saved profile, when the key came from it. */
  profile: Profile | null;
  config: Config;
  baseUrl: string;
  dashboardUrl: string;
};

export type Context = { io: CliIo; flags: GlobalFlags; out: Output };

export function createContext(io: CliIo, flags: GlobalFlags): Context {
  return { io, flags, out: new Output(io, { json: flags.json, color: flags.color }) };
}

function trimmed(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text.replace(/\/+$/, "") : undefined;
}

export function apiBaseUrl(io: CliIo, profile: Profile | null): string {
  return trimmed(io.env.COSS_BASE_URL) ?? profile?.base_url ?? DEFAULT_BASE_URL;
}

/**
 * Where a saved profile's key lives, whatever `COSS_BASE_URL` says now: revoking a key anywhere
 * else would answer 401 and look like it worked.
 */
export function savedApiBaseUrl(profile: Profile): string {
  return profile.base_url ?? DEFAULT_BASE_URL;
}

export function dashboardBaseUrl(io: CliIo, profile: Profile | null): string {
  return trimmed(io.env.COSS_DASHBOARD_URL) ?? profile?.dashboard_url ?? DEFAULT_DASHBOARD_URL;
}

/** The key to use, or a `CliError` telling the user how to get one. */
export async function resolveCredentials(context: Context): Promise<Credentials> {
  const { io, flags } = context;
  const config = await readConfig(io);
  const name = profileName(io, config, flags.profile);
  const fromEnv = io.env.COSS_API_KEY?.trim();
  if (fromEnv) {
    return {
      apiKey: fromEnv,
      source: "env",
      profileName: name,
      profile: null,
      config,
      baseUrl: apiBaseUrl(io, null),
      dashboardUrl: dashboardBaseUrl(io, null),
    };
  }
  const profile = config.profiles[name];
  if (!profile) {
    throw new CliError(
      name === "default" && !flags.profile && !io.env.COSS_PROFILE
        ? "Not signed in. Run `coss login`, or set COSS_API_KEY."
        : `No profile named "${name}". Run \`coss login --profile ${name}\`.`,
    );
  }
  return {
    apiKey: profile.api_key,
    source: "profile",
    profileName: name,
    profile,
    config,
    baseUrl: apiBaseUrl(io, profile),
    dashboardUrl: dashboardBaseUrl(io, profile),
  };
}

/** An SDK client for these credentials, on the CLI's `fetch` (never the SDK's env fallbacks). */
export function clientFor(
  io: CliIo,
  credentials: { apiKey: string; baseUrl: string },
  options: { timeout?: number; maxRetries?: number; apiVersion?: string } = {},
): Coss {
  return new Coss({
    apiKey: credentials.apiKey,
    baseUrl: credentials.baseUrl,
    fetch: io.fetch,
    timeout: options.timeout,
    maxRetries: options.maxRetries,
    // A version newer than this SDK knows is the API's to accept or refuse.
    apiVersion: options.apiVersion as ApiVersion | undefined,
  });
}

/** `Acme / Default / Development (sandbox)` */
export function describeEnvironment(environment: {
  name: string;
  mode: "live" | "sandbox";
  project: { name: string };
  organization: { name: string };
}): string {
  return `${environment.organization.name} / ${environment.project.name} / ${environment.name} (${environment.mode})`;
}
