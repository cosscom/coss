import { parseFlags } from "../args.ts";
import { type Profile, profileName, readConfig, writeConfig } from "../config.ts";
import { clientFor, createContext, savedApiBaseUrl } from "../context.ts";
import { CliError } from "../errors.ts";
import type { CliIo } from "../io.ts";

export const LOGOUT_HELP = `Usage: coss logout [--all] [--revoke] [--profile <name>]

Removes the saved API key. A key \`coss login\` created in the browser is also revoked; one you
pasted with --manual is kept unless you pass --revoke.

Options:
  --all      Every profile
  --revoke   Revoke the key too, even one you pasted
`;

export async function logout(argv: string[], io: CliIo): Promise<number> {
  const { values, global } = parseFlags(argv, {
    all: { type: "boolean" },
    revoke: { type: "boolean" },
  });
  const { out } = createContext(io, global);
  if (global.help) {
    out.line(LOGOUT_HELP);
    return 0;
  }
  const config = await readConfig(io);
  const names = values.all
    ? Object.keys(config.profiles)
    : [profileName(io, config, global.profile)];
  const removed: { name: string; revoked: boolean }[] = [];
  for (const name of names) {
    const profile: Profile | undefined = config.profiles[name];
    if (!profile) {
      if (!values.all)
        throw new CliError(`Not signed in${name === "default" ? "" : ` as "${name}"`}.`);
      continue;
    }
    let revoked = false;
    if (profile.login === "browser" || values.revoke) {
      const { error } = await clientFor(io, {
        apiKey: profile.api_key,
        baseUrl: savedApiBaseUrl(profile),
      }).apiKey.revoke();
      // Already revoked elsewhere is fine; anything else is worth saying, but logout goes on.
      revoked = !error || error.type === "authentication_error";
      if (error && !revoked) {
        out.warn(
          `Couldn't revoke the key of "${name}": ${error.message}. Revoke it in the dashboard.`,
        );
      }
    }
    delete config.profiles[name];
    if (config.default_profile === name) delete config.default_profile;
    removed.push({ name, revoked });
  }
  await writeConfig(io, config);
  if (out.json) out.data({ removed });
  else if (removed.length === 0) out.line("No saved profiles.");
  else {
    for (const { name, revoked } of removed) {
      out.line(
        `${out.style("green", "✔")} Signed out of "${name}"${revoked ? " (key revoked)" : ""}.`,
      );
    }
  }
  return 0;
}
