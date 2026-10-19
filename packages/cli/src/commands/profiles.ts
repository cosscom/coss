import type { Flags } from "../args.ts";
import { type Command, type CommandInput, defineCommand } from "../command.ts";
import {
  checkedProfileName,
  DEFAULT_PROFILE,
  type Profile,
  profileName,
  readConfig,
  savedProfileNames,
  writeConfig,
} from "../config.ts";
import { DEFAULT_BASE_URL } from "../context.ts";
import { CliError, UsageError } from "../errors.ts";

/** `Acme / Default / Development (sandbox)`, from what login saved. */
function savedEnvironment(profile: Profile): string {
  const { organization, project, environment } = profile;
  if (!organization || !project || !environment) return "(unknown environment)";
  return `${organization.name} / ${project.name} / ${environment.name} (${environment.mode})`;
}

const LIST_FLAGS = {
  json: { type: "boolean", description: "One JSON object per profile (never its key)" },
} as const satisfies Flags;

export const profilesListCommand: Command = defineCommand({
  name: "profiles list",
  summary: "List the saved profiles",
  description:
    "Lists the profiles `coss login` saved: the environment of each one's API key, how the key " +
    "was saved (browser: created by `coss login`; manual: pasted) and which profile is the " +
    "default. COSS_API_KEY, when set, wins over all of them.",
  flags: LIST_FLAGS,
  run: profilesList,
});

async function profilesList({ context }: CommandInput<typeof LIST_FLAGS>): Promise<number> {
  const { io, out } = context;
  const config = await readConfig(io);
  const current = profileName(io, config, context.flags.profile);
  const names = Object.keys(config.profiles).sort();
  for (const name of names) {
    const profile = config.profiles[name] as Profile;
    const isDefault = name === (config.default_profile ?? DEFAULT_PROFILE);
    if (out.json) {
      out.data({
        name,
        default: isDefault,
        in_use: name === current && !io.env.COSS_API_KEY,
        login: profile.login,
        api_key_id: profile.api_key_id ?? null,
        organization: profile.organization ?? null,
        project: profile.project ?? null,
        environment: profile.environment ?? null,
        base_url: profile.base_url ?? DEFAULT_BASE_URL,
        created_at: profile.created_at,
      });
      continue;
    }
    const marker = name === current && !io.env.COSS_API_KEY ? out.style("green", "*") : " ";
    const notes = [
      isDefault ? "default" : null,
      profile.login === "browser" ? "created by coss login" : "pasted",
      profile.base_url ? profile.base_url : null,
    ].filter(Boolean);
    out.line(
      `${marker} ${out.style("bold", name)}  ${savedEnvironment(profile)}  ${out.style("dim", notes.join(", "))}`,
    );
  }
  if (!out.json) {
    if (names.length === 0) out.info("No saved profiles. Run `coss login`.");
    if (io.env.COSS_API_KEY) out.info("COSS_API_KEY is set: commands use it, not these profiles.");
    else if (io.env.COSS_PROFILE || context.flags.profile) {
      out.info(
        `${context.flags.profile ? "--profile" : "COSS_PROFILE"} picks the profile in use (*).`,
      );
    }
  }
  return 0;
}

export const useCommand: Command = defineCommand({
  name: "use",
  summary: "Make a saved profile the default",
  usage: "<profile>",
  description:
    "Makes a saved profile the default, so commands use it without --profile. COSS_PROFILE and " +
    "COSS_API_KEY still win over it.",
  flags: {},
  positionals: true,
  completePositional: savedProfileNames,
  run: async ({ positionals, context }) => {
    const { io, out } = context;
    const [name, ...extra] = positionals;
    if (name === undefined || extra.length > 0) {
      throw new UsageError(
        "Pass one profile name: `coss use <profile>` (see `coss profiles list`).",
      );
    }
    checkedProfileName(name);
    const config = await readConfig(io);
    if (!config.profiles[name]) {
      const saved = Object.keys(config.profiles);
      throw new CliError(
        `No profile named "${name}"${saved.length > 0 ? ` (saved: ${saved.join(", ")})` : ""}. ` +
          `Run \`coss login --profile ${name}\` to create it.`,
      );
    }
    config.default_profile = name;
    await writeConfig(io, config);
    if (out.json) out.data({ default_profile: name });
    else out.line(`${out.style("green", "✔")} "${name}" is the default profile.`);
    if (io.env.COSS_API_KEY || io.env.COSS_PROFILE) {
      out.warn(
        `${io.env.COSS_API_KEY ? "COSS_API_KEY" : "COSS_PROFILE"} is set in this shell and wins over the default.`,
      );
    }
    return 0;
  },
});
