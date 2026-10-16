import { parseFlags } from "../args.ts";
import { configIsShared } from "../config.ts";
import { clientFor, createContext, describeEnvironment, resolveCredentials } from "../context.ts";
import { apiError } from "../errors.ts";
import type { CliIo } from "../io.ts";

export const WHOAMI_HELP = `Usage: coss whoami [--json] [--profile <name>]

Shows the API key the CLI uses, where it comes from, and its environment.
`;

export async function whoami(argv: string[], io: CliIo): Promise<number> {
  const { global } = parseFlags(argv, {});
  const context = createContext(io, global);
  const { out } = context;
  if (global.help) {
    out.line(WHOAMI_HELP);
    return 0;
  }
  const credentials = await resolveCredentials(context);
  const { data, error } = await clientFor(io, credentials).environment.get();
  if (error) throw apiError("Couldn't check the API key", error);
  const source =
    credentials.source === "env" ? "COSS_API_KEY" : `profile "${credentials.profileName}"`;
  if (out.json) {
    out.data({ source, base_url: credentials.baseUrl, environment: data });
    return 0;
  }
  out.line(describeEnvironment(data));
  out.line(`  Key       ${data.api_key.name ?? "(unnamed)"} ${out.style("dim", data.api_key.id)}`);
  out.line(`  From      ${source}`);
  out.line(`  API       ${credentials.baseUrl}`);
  out.line(`  Version   ${data.organization.api_version}`);
  if (credentials.source === "profile" && (await configIsShared(io))) {
    out.warn("Your config file is readable by other users: run `chmod 600` on it.");
  }
  return 0;
}
